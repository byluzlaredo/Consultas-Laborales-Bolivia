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
  const legalTerms = ['despido', 'indemnizacion', 'indemnización', 'finiquito', 'sueldo', 'salario', 'vacaciones', 'aguinaldo', 'jornada', 'horario', 'beneficios', 'normativa', 'laboral', 'quinquenio'];

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

const cleanGeneratedAnswer = (answer: string): string => answer
  .replace(/\*\*(.*?)\*\*/gs, '$1')
  .replace(/__(.*?)__/gs, '$1')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export const askLegalQuestion = async (question: string, conversationContext = ''): Promise<ChatResult> => {
  const startedAt = performance.now();
  const config = await loadConfig();
  const analysisStarted = performance.now();
  const analysis = analyzeQuery(question, conversationContext);
  const analysisElapsed = performance.now() - analysisStarted;
  console.info('[rag][timing]', { stage: 'analysis', milliseconds: Number(analysisElapsed.toFixed(2)), intent: analysis.intent });

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
  const prompt = `${config.systemPrompt.slice(0, 3500)}\n\nREGLAS DEL RAG:\n- Analiza la consulta y responde como asistente laboral de Bolivia.\n- Usa únicamente las FUENTES del contexto para afirmar normas, artículos, fechas, porcentajes o montos.\n- No inventes referencias ni conviertas coincidencias de palabras en una conclusión jurídica.\n- Distingue datos proporcionados de datos faltantes y pregunta solo por lo necesario.\n- Sintetiza la evidencia; no copies fragmentos extensos.\n- Si la evidencia no basta, dilo expresamente.\n- El historial es contexto conversacional, no evidencia legal.\n\nANÁLISIS DE LA CONSULTA:\n${JSON.stringify(analysis)}\n\nHISTORIAL RELEVANTE:\n${conversationContext.slice(-1500) || 'Sin historial previo'}\n\nCONTEXTO LEGAL RECUPERADO:\n${context}\n\nCONSULTA ACTUAL:\n${question}`;
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