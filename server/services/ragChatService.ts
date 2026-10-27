import { Pool } from 'pg';
import { performance } from 'node:perf_hooks';
import { LEGAL_SYSTEM_PROMPT } from '../config/legalSystemPrompt.js';
import { createOpenAIEmbeddings } from './openAIEmbeddings.js';

const systemPool = new Pool({
  connectionString: process.env.DATABASE_SISTEMA_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema',
});
const vectorPool = new Pool({
  connectionString: process.env.DATABASE_VECTORIAL_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial',
});

export const NO_CONTEXT_MESSAGE = 'No se encontraron fragmentos normativos aplicables a la consulta';
export const GENERATION_ERROR_MESSAGE = 'Ocurrió un error al generar la respuesta. Por favor intente nuevamente';
const GENERATION_TIMEOUT_MS = 120_000;
const MIN_RELEVANCE = 0.2;

interface AIConfig {
  openaiModel: string;
  temperatura: number;
  maxTokens: number;
  kChunks: number;
  systemPrompt: string;
}

export const getResponseBudget = (maxTokens: number): number => Math.max(64, Math.floor(maxTokens * 0.8));

export const getResponseLengthInstruction = (maxTokens: number): string => {
  const responseBudget = getResponseBudget(maxTokens);
  if (responseBudget <= 300) {
    return `RESPUESTA BREVE: redacta una respuesta directa y completa en aproximadamente ${responseBudget} tokens o menos. Incluye solo la conclusion, la norma principal y el siguiente paso.`;
  }
  if (responseBudget <= 900) {
    return `RESPUESTA MODERADA: redacta una respuesta clara y completa en aproximadamente ${responseBudget} tokens o menos. Prioriza la respuesta, los fundamentos esenciales y las recomendaciones.`;
  }
  return `RESPUESTA DETALLADA: puedes explicar la respuesta en aproximadamente ${responseBudget} tokens o menos. Incluye fundamentos, pasos y recomendaciones sin repetir informacion.`;
};

export interface QueryAnalysis {
  intent: 'calculo' | 'despido' | 'denuncia' | 'consulta_laboral' | 'general';
  facts: Record<string, string | number | boolean>;
  missingData: string[];
  retrievalQuery: string;
}

export interface LegalCitation {
  normativa: string;
  tipo: string;
  numero: string;
  articulo: string;
  relevance: number;
  fuente: string;
  fecha: string | null;
}

export interface ChatResult {
  answer: string;
  citations: LegalCitation[];
  references: Array<{ fragmentId: string; relevance: number }>;
  hasContext: boolean;
  analysis: QueryAnalysis;
}

interface RetrievedFragment {
  id_fragmento: string;
  texto_fragmento: string;
  normativa: string;
  tipo: string;
  numero: string;
  articulo: string;
  fuente: string;
  fecha: string | null;
  id_documento: string;
  pagina: number | null;
  semanticRelevance: number;
  rerankScore?: number;
}

const loadConfig = async (): Promise<AIConfig> => {
  const result = await systemPool.query(
    `SELECT temperatura, max_tokens, k_chunks, system_prompt
     FROM configuracion_sistema WHERE id_configuracion = 1`
  );
  const row = result.rows[0];
  const storedPrompt = typeof row?.system_prompt === 'string' ? row.system_prompt.trim() : '';
  return {
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperatura: Number(row?.temperatura ?? 0.2),
    maxTokens: Number(row?.max_tokens ?? 1024),
    kChunks: Math.max(1, Math.min(Number(row?.k_chunks ?? 5), 10)),
    systemPrompt: storedPrompt || LEGAL_SYSTEM_PROMPT,
  };
};

const openAIGenerateRequest = async (
  config: AIConfig,
  prompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Configura OPENAI_API_KEY en el archivo .env para usar OpenAI');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_completion_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(errorBody.error?.message || `OpenAI respondió HTTP ${response.status}`);
  }
  const result = await response.json() as {
    choices?: Array<{
      message?: { content?: string | Array<{ text?: string }> | null };
      finish_reason?: string;
    }>;
  };
  const choice = result.choices?.[0];
  const content = choice?.message?.content;
  const answer = typeof content === 'string'
    ? content
    : content?.map((part) => part.text ?? '').join('') ?? '';
  if (!answer.trim()) {
    throw new Error(`OpenAI no devolvió texto visible (${choice?.finish_reason || 'sin detalle'}).`);
  }
  return answer;
};

const normalizedTokens = (value: string): string[] => value
  .toLocaleLowerCase('es-BO')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .match(/[a-z0-9]+/g) || [];

const buildIntentKeywords = (analysis: QueryAnalysis): string[] => {
  const keywords = new Set<string>();
  const { intent, facts } = analysis;

  if (intent === 'calculo' || Boolean(facts.despido) || Boolean(facts.renuncia)) {
    keywords.add('despido');
    keywords.add('indemnización');
    keywords.add('finiquito');
    keywords.add('beneficios sociales');
    keywords.add('desahucio');
    keywords.add('antigüedad');
    keywords.add('salario');
    keywords.add('vacaciones');
  }

  if (intent === 'denuncia' || Boolean(facts.posibleConflicto)) {
    keywords.add('amenaza');
    keywords.add('horas pagadas');
    keywords.add('conflicto laboral');
    keywords.add('suspensión');
    keywords.add('sueldo');
  }

  if (intent === 'consulta_laboral' || Boolean(facts.jornada)) {
    keywords.add('jornada laboral');
    keywords.add('horario');
    keywords.add('trabajo');
    keywords.add('normativa laboral');
  }

  if (facts.antiguedadAnios) keywords.add(`antigüedad ${facts.antiguedadAnios} años`);
  if (facts.vacacionesDias) keywords.add(`vacaciones pendientes ${facts.vacacionesDias} días`);
  if (typeof facts.salariosMencionados === 'string') keywords.add('sueldos recientes');

  return [...keywords];
};

export const buildFallbackKeywords = (analysis: QueryAnalysis): string[] => {
  const normalizedQuestion = normalizedTokens(analysis.retrievalQuery || '').filter((token) => token.length > 2);
  const prioritized = new Set<string>();
  const legalTerms = ['despido', 'indemnizacion', 'indemnización', 'desahucio', 'finiquito', 'sueldo', 'salario', 'vacaciones', 'aguinaldo', 'jornada', 'horario', 'beneficios', 'normativa', 'laboral', 'quinquenio'];

  for (const term of buildIntentKeywords(analysis)) {
    const clean = normalizedTokens(term).join(' ');
    if (clean) prioritized.add(clean);
  }

  for (const token of normalizedQuestion) {
    if (legalTerms.includes(token)) {
      prioritized.add(token);
    }
  }

  return [...prioritized].slice(0, 10);
};

const analyzeQuery = (question: string, conversationContext: string): QueryAnalysis => {
  const normalizedQuestion = question.toLocaleLowerCase('es-BO').trim();
  const laborPattern = /despid|desvincul|termin|echaron|renunci|finiquito|indemniz|beneficio|sueldo|salario|pago|pagando|adeuda|deuda|cobrar|cu[aá]nto|vacaci|aguinaldo|quinquenio|desahucio|jornada|horario|horas|contrato|patron|jefe|empresa|emplead|trabaj|laboral|ley|art[ií]culo|norma|ministerio|derecho|obligaci|denunci|amenaz|hostig|acos|abuso|represalia|suspensi/i;
  const isLaborInQuestion = laborPattern.test(normalizedQuestion);
  const questionNumbers = (question.match(/\b\d+(?:[.,]\d{1,2})?\b/g) || [])
    .map((value) => Number(value.replace(',', '.')))
    .filter((value) => value >= 1 && value <= 1_000_000);
  const isFollowUpData = questionNumbers.length > 0 && Boolean(conversationContext);
  const isLaborRelevant = isLaborInQuestion || isFollowUpData;

  if (!isLaborRelevant) {
    return {
      intent: 'general',
      facts: {},
      missingData: [],
      retrievalQuery: question.trim(),
    };
  }

  const combined = `${conversationContext}\nUsuario: ${question}`.trim();
  const normalized = combined.toLocaleLowerCase('es-BO');
  const facts: Record<string, string | number | boolean> = {};
  const salaryValues = (combined.match(/\b\d+(?:[.,]\d{1,2})?\b/g) || [])
    .map((value) => Number(value.replace(',', '.')))
    .filter((value) => value >= 100 && value <= 1_000_000);
  const yearsMatch = normalized.match(/(\d+)\s*a[nñ]os?/);
  const vacationMatch = normalized.match(/(\d+)\s*d[ií]as?\s*(?:de\s*)?vacaciones?/);
  const dateMatches = combined.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || [];

  if (salaryValues.length > 0) facts.salariosMencionados = salaryValues.join(', ');
  if (yearsMatch) facts.antiguedadAnios = Number(yearsMatch[1]);
  if (vacationMatch) facts.vacacionesDias = Number(vacationMatch[1]);
  if (dateMatches.length > 0) facts.fechasMencionadas = dateMatches.join(', ');
  if (/despid|desvincul|terminaron|echaron/.test(normalized)) facts.despido = true;
  if (/renunci|renuncia/.test(normalized)) facts.renuncia = true;
  if (/amenaz|hostig|acos|abuso|insinu|quita.*sueldo|quita.*hora|mejor.*horas|quitar.*horas/.test(normalized)) facts.posibleConflicto = true;
  if (/jornada|horas?\s*(?:al\s*dia|diarias|de\s*trabajo)|trabajo\s+m[aá]s\s+de\s+8\s*horas|8\s*horas/.test(normalized)) facts.jornada = true;
  if (/sueldo|salario|pago|pagando|deuda|adeuda|no me paga|me debe/.test(normalized)) facts.salario = true;

  const complaint = /denunci|amenaz|hostig|acos|abuso|insinu|represalia/.test(normalized);
  const dismissal = Boolean(facts.despido || facts.renuncia);
  const calculation = /cu[aá]nto|cobrar|pagar|finiquito|indemniz|beneficios|aguinaldo|calcular|monto|vacaciones/.test(normalized)
    || (dismissal && Boolean(yearsMatch));
  const intent: QueryAnalysis['intent'] = calculation ? 'calculo' : complaint ? 'denuncia' : dismissal ? 'despido' : /ley|art[ií]culo|norma|derecho|obligaci|jornada|horas|salario/.test(normalized) ? 'consulta_laboral' : 'general';
  const missingData: string[] = [];
  if (intent === 'calculo') {
    if (!facts.fechasMencionadas) missingData.push('fecha de ingreso y fecha de retiro');
    if (!facts.salariosMencionados) missingData.push('los tres últimos sueldos');
    if (!facts.despido && !facts.renuncia) missingData.push('causal de desvinculación');
  }
  if (intent === 'denuncia') {
    if (!dateMatches.length) missingData.push('fechas de los hechos');
    if (!facts.posibleConflicto) missingData.push('hechos concretos');
  }
  const contextForRetrieval = conversationContext ? ` Contexto relevante previo: ${conversationContext.slice(-1800)}` : '';
  const analysis: QueryAnalysis = {
    intent,
    facts,
    missingData,
    retrievalQuery: `${question.trim()} Intención: ${intent}. Datos detectados: ${JSON.stringify(facts)}.${contextForRetrieval}`,
  };

  const queryTerms = buildIntentKeywords(analysis);
  analysis.retrievalQuery = `${question.trim()} ${queryTerms.join(' ')} ${contextForRetrieval}`.trim();
  return analysis;
};

export { analyzeQuery };

const requestQuestionEmbedding = async (question: string): Promise<number[]> =>
  (await createOpenAIEmbeddings([question]))[0];

const rerankFragments = (fragments: RetrievedFragment[], query: string, limit: number): RetrievedFragment[] => {
  const queryTokens = new Set(normalizedTokens(query).filter((token) => token.length > 2));
  const scored = fragments
    .map((fragment) => {
      const fragmentText = `${fragment.normativa} ${fragment.articulo} ${fragment.texto_fragmento}`.toLocaleLowerCase('es-BO');
      const fragmentTokens = new Set(normalizedTokens(fragmentText).filter((token) => token.length > 2));
      const overlap = [...queryTokens].filter((token) => fragmentTokens.has(token)).length / Math.max(queryTokens.size, 1);
      const legalTerms = ['despido', 'indemnizacion', 'indemnización', 'beneficios', 'vacaciones', 'sueldo', 'salario', 'jornada', 'horario', 'aguinaldo', 'antiguedad', 'finiquito', 'trabajo'];
      const legalHits = legalTerms.filter((term) => fragmentText.includes(term)).length;
      const semanticBoost = Number(fragment.semanticRelevance || 0);
      const rerankScore = (semanticBoost * 0.75) + (overlap * 0.20) + (legalHits / Math.max(legalTerms.length, 1) * 0.05);
      return { ...fragment, rerankScore };
    })
    .sort((left, right) => (right.rerankScore || 0) - (left.rerankScore || 0));

  const selected: RetrievedFragment[] = [];
  const articleCounts = new Map<string, number>();
  for (const fragment of scored) {
    const key = `${fragment.id_documento}|${fragment.articulo}`;
    const count = articleCounts.get(key) || 0;
    if (count >= 2 && scored.length > limit) continue;
    if ((fragment.rerankScore ?? 0) < 0.12) continue;
    selected.push(fragment);
    articleCounts.set(key, count + 1);
    if (selected.length >= limit) break;
  }
  return selected;
};

const buildContext = (fragments: RetrievedFragment[]): string => fragments.map((fragment, index) =>
  `FUENTE ${index + 1}\nNorma: ${fragment.normativa}\nTipo y número: ${fragment.tipo} ${fragment.numero}\nArtículo/sección: ${fragment.articulo}\nFuente: ${fragment.fuente || 'No especificada'}\nFecha: ${fragment.fecha || 'No especificada'}\nDocumento: ${fragment.id_documento}\nPágina: ${fragment.pagina ?? 'No especificada'}\nTexto: ${fragment.texto_fragmento.slice(0, 700)}`
).join('\n\n').slice(0, 9000);

const fallbackLegalSearch = async (analysis: QueryAnalysis, limit: number): Promise<RetrievedFragment[]> => {
  const keywords = buildFallbackKeywords(analysis);
  if (keywords.length === 0) return [];

  const conditions: string[] = [];
  const params: string[] = [];

  for (const keyword of keywords) {
    const match = `%${keyword.toLowerCase()}%`;
    conditions.push(`(LOWER(f.texto_fragmento) LIKE $${params.length + 1} OR LOWER(n.titulo) LIKE $${params.length + 1})`);
    params.push(match);
  }

  const query = `
    SELECT f.id_fragmento, f.texto_fragmento, n.titulo AS normativa,
           COALESCE(n.tipo, '') AS tipo, COALESCE(n.numero, '') AS numero,
           a.titulo AS articulo, COALESCE(n.fuente, '') AS fuente,
           n.fecha_publicacion AS fecha, d.id_documento,
           f.pagina, 0.35 AS "semanticRelevance"
    FROM fragmento_legal f
    JOIN articulo a ON a.id_articulo = f.id_articulo
    JOIN documento_legal d ON d.id_documento = a.id_documento
    JOIN normativa n ON n.id_normativa = d.id_normativa
    WHERE (
      LOWER(COALESCE(n.estado, '')) = 'activo'
      OR LOWER(COALESCE(n.estado, '')) = 'vigente'
      OR LOWER(COALESCE(n.estado, '')) LIKE '%activo%'
      OR LOWER(COALESCE(n.estado, '')) LIKE '%vigente%'
    ) AND (${conditions.join(' OR ')})
    ORDER BY f.numero_fragmento
    LIMIT $${params.length + 1}`;

  const result = await vectorPool.query<RetrievedFragment>(query, [...params, String(limit)]);
  return result.rows.map((fragment) => ({
    ...fragment,
    rerankScore: Number(fragment.semanticRelevance || 0.35),
  }));
};

export const cleanGeneratedAnswer = (answer: string): string => {
  if (!answer) return '';
  return answer
    // Normalize escaped brackets \[ ... \] and $$ ... $$ into clean calculation lines
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '\n\n> **Cálculo:** $1\n\n')
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '\n\n> **Cálculo:** $1\n\n')
    // Match bracketed math expressions like [ \text{...} ... ] or [ Indemnización = ... ]
    .replace(/\[\s*(\\text\{[^\n\]]+|[^[\]\n]*?(?:\\times|\\frac|=)[^[\]\n]*?)\s*\]/g, '\n\n> **Cálculo:** $1\n\n')
    // Remove \text{...}
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    .replace(/\\textit\{([^}]+)\}/g, '*$1*')
    // Convert mathematical operators
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\approx/g, '≈')
    .replace(/\\le(q)?\b/g, '≤')
    .replace(/\\ge(q)?\b/g, '≥')
    // Convert fractions \frac{num}{den} -> (num) / den
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / $2')
    // Remove sizing/bracketing commands
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    // Spacing
    .replace(/\\quad/g, ' ')
    .replace(/\\qquad/g, '  ')
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\\\/g, '\n')
    // Strip isolated inline dollar signs containing text/math
    .replace(/\$([^$\n]+)\$/g, (_m, p1) => {
      return p1.replace(/\\text\{([^}]+)\}/g, '$1').replace(/\\times/g, '×').trim();
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
};

export const askLegalQuestion = async (question: string, conversationContext = ''): Promise<ChatResult> => {
  const startedAt = performance.now();
  const config = await loadConfig();
  const analysisStarted = performance.now();
  const analysis = analyzeQuery(question, conversationContext);
  const analysisElapsed = performance.now() - analysisStarted;
  console.info('[rag][timing]', { stage: 'analysis', milliseconds: Number(analysisElapsed.toFixed(2)), intent: analysis.intent });

  if (analysis.intent === 'general') {
    const generalPrompt = `Eres un asistente inteligente especializado en orientación sobre legislación laboral boliviana.
El usuario ha realizado la siguiente consulta: "${question}".

INSTRUCCIONES CLARAS:
1. Responde a la pregunta del usuario con total amabilidad, precisión y brevedad (por ejemplo, si pregunta por la mezcla de colores amarillo y azul, responde claramente que dan color verde).
2. Agrega una breve frase cordial al final recordando que tu especialidad y función principal en esta plataforma es la asesoría en Derecho Laboral Boliviano (cálculo de finiquitos, indemnizaciones, vacaciones y derechos del trabajador).
3. ESTÁ TOTALMENTE PROHIBIDO inventar cálculos de liquidación, finiquitos, sueldos ficticios (como 3.000 Bs.) ni años de trabajo cuando la pregunta actual no trata sobre temas laborales.`;

    const answer = await openAIGenerateRequest(config, generalPrompt, config.temperatura, config.maxTokens);
    const totalElapsed = performance.now() - startedAt;
    console.info('[rag][timing]', { stage: 'general_response', milliseconds: Number(totalElapsed.toFixed(2)) });
    return {
      answer: cleanGeneratedAnswer(answer),
      citations: [],
      references: [],
      hasContext: true,
      analysis,
    };
  }

  const embeddingStarted = performance.now();
  const embedding = await requestQuestionEmbedding(analysis.retrievalQuery);
  const embeddingElapsed = performance.now() - embeddingStarted;
  console.info('[rag][timing]', { stage: 'embedding', milliseconds: Number(embeddingElapsed.toFixed(2)), vectorLength: embedding.length });

  const vector = `[${embedding.join(',')}]`;
  const candidateLimit = Math.min(Math.max(config.kChunks * 8, 30), 80);

  const retrievalStarted = performance.now();
  const retrieval = await vectorPool.query<RetrievedFragment>(
    `SELECT f.id_fragmento, f.texto_fragmento, n.titulo AS normativa,
            COALESCE(n.tipo, '') AS tipo, COALESCE(n.numero, '') AS numero,
            a.titulo AS articulo, COALESCE(n.fuente, '') AS fuente,
            n.fecha_publicacion AS fecha, d.id_documento,
            f.pagina, 1 - (e.embedding <=> $1::vector) AS "semanticRelevance"
     FROM embedding e
     JOIN fragmento_legal f ON f.id_fragmento = e.id_fragmento
     JOIN articulo a ON a.id_articulo = f.id_articulo
     JOIN documento_legal d ON d.id_documento = a.id_documento
     JOIN normativa n ON n.id_normativa = d.id_normativa
     WHERE (
         LOWER(COALESCE(n.estado, '')) = 'activo'
         OR LOWER(COALESCE(n.estado, '')) = 'vigente'
         OR LOWER(COALESCE(n.estado, '')) LIKE '%activo%'
         OR LOWER(COALESCE(n.estado, '')) LIKE '%vigente%'
       )
       AND 1 - (e.embedding <=> $1::vector) >= $2
     ORDER BY e.embedding <=> $1::vector
     LIMIT $3`,
    [vector, MIN_RELEVANCE, candidateLimit]
  );
  const retrievalElapsed = performance.now() - retrievalStarted;
  console.info('[rag][timing]', { stage: 'vector_search', milliseconds: Number(retrievalElapsed.toFixed(2)), rows: retrieval.rowCount });

  const rankingStarted = performance.now();
  let fragments = rerankFragments(retrieval.rows, analysis.retrievalQuery, config.kChunks);
  const rankingElapsed = performance.now() - rankingStarted;
  console.info('[rag][timing]', { stage: 'rerank', milliseconds: Number(rankingElapsed.toFixed(2)), selected: fragments.length });

  if (fragments.length === 0) {
    const fallbackStarted = performance.now();
    fragments = await fallbackLegalSearch(analysis, config.kChunks);
    const fallbackElapsed = performance.now() - fallbackStarted;
    console.info('[rag][timing]', { stage: 'fallback_search', milliseconds: Number(fallbackElapsed.toFixed(2)), selected: fragments.length });
  }

  if (fragments.length === 0) {
    console.warn('[rag][no-context]', { intent: analysis.intent, retrievalQuery: analysis.retrievalQuery.slice(0, 250) });
    return { answer: NO_CONTEXT_MESSAGE, citations: [], references: [], hasContext: false, analysis };
  }

  const citations = Array.from(new Map(fragments.map((fragment) => {
    const citation: LegalCitation = {
      normativa: fragment.normativa,
      tipo: fragment.tipo,
      numero: fragment.numero,
      articulo: fragment.articulo,
      relevance: Number(fragment.rerankScore || fragment.semanticRelevance),
      fuente: fragment.fuente,
      fecha: fragment.fecha,
    };
    return [`${citation.normativa}|${citation.tipo}|${citation.numero}|${citation.articulo}`, citation] as const;
  })).values());
  const references = fragments.map((fragment) => ({ fragmentId: fragment.id_fragmento, relevance: Number(fragment.rerankScore || fragment.semanticRelevance) }));
  const context = buildContext(fragments);
  const prompt = `${config.systemPrompt}

REGLAS DEL RAG Y FUNDAMENTOS LABORALES BOLIVIANOS OBLIGATORIOS:
- Analiza la consulta y responde como asistente legal laboral experto de Bolivia.
- Usa rigurosamente las FUENTES del contexto normativo para respaldar normas, artículos, porcentajes y cálculos.
- NUNCA inventes artículos, porcentajes, plazos ni topes inexistentes en la legislación boliviana.
- VACACIONES (Art. 44 de la Ley General del Trabajo - LGT, D.S. N.º 3161, D.S. N.º 12058 y Art. 33 del D.R. 224):
  * Escala legal progresiva por años cumplidos: de 1 a 5 años = 15 días hábiles; de 5 a 10 años = 20 días hábiles; de 10 años en adelante = 30 días hábiles.
  * PRIORIDAD ABSOLUTA DEL DATO DECLARADO POR EL USUARIO (DATO DE ENTRADA RÍGIDO):
    Si el usuario indica una cantidad específica de días de vacaciones pendientes o acumulados (ejemplo: "tengo 30 días de vacaciones"), DEBES USAR OBLIGATORIAMENTE ESE NÚMERO EXACTO (30 días) PARA EL CÁLCULO MONETARIO Y EN LA TABLA FINAL.
    ESTÁ ESTRICTAMENTE PROHIBIDO sobrescribir o reducir los días declarados por el usuario por la escala legal anual de la LGT (ESTÁ PROHIBIDO cambiar 30 por 20 días solo porque tenga 5 años de servicio).
    SEPARACIÓN OBLIGATORIA DE CONCEPTOS:
    a) CÁLCULO MONETARIO: Días declarados (30) × Sueldo diario (40 Bs.) = 1.200 Bs. (NUNCA reduzcas a 20 × 40 = 800 Bs.).
    b) EXPLICACIÓN NORMATIVA: Explica pedagógicamente que la escala legal anual por un solo año de trabajo con 5 años es de 20 días hábiles, y que por tanto sus 30 días declarados corresponden a la acumulación legal de gestiones no gozadas o truncas pendientes de pago.
  * COHERENCIA INTERNA: El monto de vacaciones en la tabla de liquidación y en el total general DEBE COINCIDIR con los días declarados por el usuario. No contradigas la tabla con las notas.
  * Sueldo diario para compensar vacaciones = Sueldo Promedio / 30 días; Monto Vacaciones = Sueldo Diario × Días declarados.
  * NO fundamentes el descanso anual ni su cómputo en el Art. 46 de la CPE; la norma formal aplicable es el Art. 44 de la LGT y D.S. 3161.
- INDEMNIZACIÓN POR TIEMPO DE SERVICIOS (Art. 13 de la LGT y Decreto Supremo N.º 110):
  * Equivale exactamente a UN (1) MES DE SUELDO PROMEDIABLE por cada año de trabajo continuo cumplido, más duodécimas proporcionales de meses y días.
  * En Bolivia NO EXISTE TOPE O LÍMITE MÁXIMO DE 12 MESES NI DE 12 AÑOS para la indemnización. Corresponde por todos los años efectivamente trabajados.
  * Sueldo Promedio Indemnizable (SPI) = promedio de los últimos 3 meses: (Mes1 + Mes2 + Mes3) / 3.
  * Corresponde indemnización cumplidos noventa (90) días de servicio, INCLUSO EN CASO DE RETIRO O RENUNCIA VOLUNTARIA (D.S. 110).
  * NO cites el Art. 49 de la CPE para restringir montos o imponer límites inexistentes.
- DESAHUCIO (Art. 12 de la LGT y Decreto Supremo N.º 28699):
  * Corresponde a TRES (3) MESES de sueldo promediable adicionales únicamente en caso de DESPIDO INJUSTIFICADO, FORZOSO O INTEMPESTIVO (retiro intempestivo sin preaviso legal).
  * En RETIRO O RENUNCIA VOLUNTARIA el desahucio NO aplica, pero la indemnización por años trabajados y las vacaciones no gozadas se mantienen plenamente exigibles.
- PROHIBICIÓN ESTRICTA DE SINTAXIS LATEX Y CÓDIGO:
  * NUNCA uses sintaxis ni comandos LaTeX como \\text{...}, \\times, \\frac{...}{...}, \\[ ... \\], \\( ... \\), $$ ni corchetes con comandos matemáticos [ \\text{...} ].
  * Escribe todos los cálculos matemáticos en texto limpio, natural y legible:
    - Ejemplo correcto: Sueldo Promedio = (1.200 + 1.200 + 1.200) / 3 = 1.200 Bs.
    - Ejemplo correcto: Indemnización = 1.200 Bs. × 5 años = 6.000 Bs.
    - Ejemplo correcto: Vacaciones = (1.200 Bs. / 30) × 30 días = 1.200 Bs.
    - Ejemplo correcto: Desahucio = 1.200 Bs. × 3 meses = 3.600 Bs.
- ESTRUCTURA DE RESPUESTA EN CÁLCULOS:
  * Si la consulta solicita estimar o calcular finiquito o liquidación, estructura con Markdown:
    ## 1. Sueldo Promedio Promediable
    ## 2. Pago por Vacaciones Cumplidas y Truncas
    ## 3. Desglose Estimado de Liquidación (Finiquito) con una tabla Markdown comparativa (| Concepto | Detalle de Cálculo | Monto Estimado (Bs.) |) que detalle:
      - Indemnización por los años de servicio
      - Vacaciones pendientes
      - Desahucio (si hubo despido intempestivo)
      - Total Estimado (Sin Desahucio / Renuncia)
      - Total Estimado (Con Desahucio / Despido)
    Incluye una nota aclaratoria sobre la diferencia entre retiro voluntario y despido intempestivo.

ANÁLISIS DE LA CONSULTA:
${JSON.stringify(analysis)}
${analysis.facts.vacacionesDias ? `\nRECORDATORIO CRÍTICO DE CÁLCULO: El usuario declaró explícitamente ${analysis.facts.vacacionesDias} días de vacaciones pendientes. Tu cálculo monetario DEBE multiplicar exactamente ${analysis.facts.vacacionesDias} días × Sueldo Diario. NO cambies ni reduzcas este valor a 20 días.\n` : ''}

HISTORIAL RELEVANTE:
${conversationContext.slice(-1500) || 'Sin historial previo'}

CONTEXTO LEGAL RECUPERADO:
${context}

CONSULTA ACTUAL:
${question}`;
  const responseInstruction = getResponseLengthInstruction(config.maxTokens);
  const promptWithBudget = `${prompt}\n\nLIMITE DE RESPUESTA:\n${responseInstruction}\nNo cortes una idea a la mitad: si falta espacio, resume y conserva primero la conclusion y la base legal.`;

  const generationStarted = performance.now();
  const answer = await openAIGenerateRequest(config, promptWithBudget, config.temperatura, config.maxTokens);
  const generationElapsed = performance.now() - generationStarted;
  console.info('[rag][timing]', { stage: 'generation', milliseconds: Number(generationElapsed.toFixed(2)), model: config.openaiModel });

  if (!answer.trim()) throw new Error(GENERATION_ERROR_MESSAGE);

  const totalElapsed = performance.now() - startedAt;
  console.info('[rag][timing]', { stage: 'total', milliseconds: Number(totalElapsed.toFixed(2)), hasContext: true });
  return { answer: cleanGeneratedAnswer(answer), citations, references, hasContext: true, analysis };
};