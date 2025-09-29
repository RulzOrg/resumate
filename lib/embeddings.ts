import { embedMany } from "ai"
import { openai } from "@ai-sdk/openai"

export const EMBEDDING_DIMENSION = 3072

export async function embedTexts(values: string[]): Promise<number[][]> {
  if (!values || values.length === 0) return []
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-large"),
    values,
  })
  return embeddings.map((e) => e.values)
}
