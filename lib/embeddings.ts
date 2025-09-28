import { openai } from "@ai-sdk/openai"
import { embed } from "ai"

const EMBEDDING_MODEL = "text-embedding-3-large"

export async function embedText(texts: string[]) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return []
  }

  const { embeddings } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    values: texts,
  })

  return embeddings.map((item) => item.embedding)
}

export function getEmbeddingDimension() {
  return 3072
}
