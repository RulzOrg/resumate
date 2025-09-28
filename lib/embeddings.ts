import { embedMany } from "ai"
import { openai } from "@ai-sdk/openai"

export const EMBEDDING_MODEL = "text-embedding-3-large"
export const EMBEDDING_DIMENSIONS = 3072

export async function getEmbeddings(texts: string[]) {
  if (!texts.length) return []

  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: texts,
  })

  return embeddings.map((item) => item.embedding)
}

export async function getEmbedding(text: string) {
  const [embedding] = await getEmbeddings([text])
  return embedding
}

// Legacy function for backward compatibility
export function getEmbeddingDimension() {
  return EMBEDDING_DIMENSIONS
}
