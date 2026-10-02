export const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
export const OPENAI_EMBEDDING_DIMENSIONS = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 768;

interface OpenAIEmbeddingResponse {
  data?: Array<{ index: number; embedding: number[] }>;
  error?: { message?: string };
}

export const createOpenAIEmbeddings = async (texts: string[]): Promise<number[][]> => {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Configura OPENAI_API_KEY en el archivo .env para generar embeddings');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: texts,
      dimensions: OPENAI_EMBEDDING_DIMENSIONS,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const result = await response.json().catch(() => ({})) as OpenAIEmbeddingResponse;
  if (!response.ok) {
    throw new Error(result.error?.message || `OpenAI Embeddings respondió HTTP ${response.status}`);
  }

  const vectors = result.data?.slice().sort((left, right) => left.index - right.index);
  if (!vectors || vectors.length !== texts.length || vectors.some((item) =>
    !Array.isArray(item.embedding)
    || item.embedding.length !== OPENAI_EMBEDDING_DIMENSIONS
    || item.embedding.some((value) => !Number.isFinite(value))
  )) {
    throw new Error('OpenAI Embeddings devolvió vectores incompletos o de dimensión incorrecta');
  }

  return vectors.map((item) => item.embedding);
};
