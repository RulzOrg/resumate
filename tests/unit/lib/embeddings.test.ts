import { describe, it, expect, vi, beforeEach } from 'vitest'
import { embedTexts, EMBEDDING_DIMENSION } from '@/lib/embeddings'
import { embedMany } from 'ai'

// Mock the ai module
vi.mock('ai', () => ({
  embedMany: vi.fn()
}))

// Mock the openai module
vi.mock('@ai-sdk/openai', () => ({
  openai: {
    embedding: vi.fn(() => 'mocked-model')
  }
}))

describe('embedTexts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array for empty input', async () => {
    const result = await embedTexts([])
    expect(result).toEqual([])
    expect(embedMany).not.toHaveBeenCalled()
  })

  it('should return empty array for null/undefined input', async () => {
    // @ts-expect-error - testing invalid input
    const result1 = await embedTexts(null)
    expect(result1).toEqual([])

    // @ts-expect-error - testing invalid input
    const result2 = await embedTexts(undefined)
    expect(result2).toEqual([])

    expect(embedMany).not.toHaveBeenCalled()
  })

  it('should generate embeddings for single text', async () => {
    const mockEmbedding = Array(EMBEDDING_DIMENSION).fill(0.1)
    vi.mocked(embedMany).mockResolvedValueOnce({
      embeddings: [mockEmbedding],
      values: ['test text'],
      usage: { promptTokens: 10, totalTokens: 10 }
    })

    const result = await embedTexts(['test text'])

    expect(embedMany).toHaveBeenCalledWith({
      model: 'mocked-model',
      values: ['test text']
    })
    expect(result).toEqual([mockEmbedding])
    expect(result[0]).toHaveLength(EMBEDDING_DIMENSION)
  })

  it('should generate embeddings for multiple texts', async () => {
    const mockEmbedding1 = Array(EMBEDDING_DIMENSION).fill(0.1)
    const mockEmbedding2 = Array(EMBEDDING_DIMENSION).fill(0.2)
    const mockEmbedding3 = Array(EMBEDDING_DIMENSION).fill(0.3)

    vi.mocked(embedMany).mockResolvedValueOnce({
      embeddings: [mockEmbedding1, mockEmbedding2, mockEmbedding3],
      values: ['text 1', 'text 2', 'text 3'],
      usage: { promptTokens: 30, totalTokens: 30 }
    })

    const texts = ['text 1', 'text 2', 'text 3']
    const result = await embedTexts(texts)

    expect(embedMany).toHaveBeenCalledWith({
      model: 'mocked-model',
      values: texts
    })
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(mockEmbedding1)
    expect(result[1]).toEqual(mockEmbedding2)
    expect(result[2]).toEqual(mockEmbedding3)
  })

  it('should handle API errors gracefully', async () => {
    const error = new Error('API rate limit exceeded')
    vi.mocked(embedMany).mockRejectedValueOnce(error)

    await expect(embedTexts(['test text'])).rejects.toThrow('API rate limit exceeded')

    expect(embedMany).toHaveBeenCalledTimes(1)
  })

  it('should use text-embedding-3-large model', async () => {
    const { openai } = await import('@ai-sdk/openai')
    const mockEmbedding = Array(EMBEDDING_DIMENSION).fill(0.1)

    vi.mocked(embedMany).mockResolvedValueOnce({
      embeddings: [mockEmbedding],
      values: ['test'],
      usage: { promptTokens: 5, totalTokens: 5 }
    })

    await embedTexts(['test'])

    expect(openai.embedding).toHaveBeenCalledWith('text-embedding-3-large')
  })

  it('should preserve order of embeddings', async () => {
    const texts = ['first', 'second', 'third', 'fourth']
    const mockEmbeddings = texts.map((_, i) =>
      Array(EMBEDDING_DIMENSION).fill(i * 0.1)
    )

    vi.mocked(embedMany).mockResolvedValueOnce({
      embeddings: mockEmbeddings,
      values: texts,
      usage: { promptTokens: 20, totalTokens: 20 }
    })

    const result = await embedTexts(texts)

    expect(result).toHaveLength(texts.length)
    texts.forEach((text, index) => {
      expect(result[index][0]).toBe(index * 0.1)
    })
  })

  it('should handle empty strings in input array', async () => {
    const mockEmbedding1 = Array(EMBEDDING_DIMENSION).fill(0.1)
    const mockEmbedding2 = Array(EMBEDDING_DIMENSION).fill(0.2)

    vi.mocked(embedMany).mockResolvedValueOnce({
      embeddings: [mockEmbedding1, mockEmbedding2],
      values: ['', 'valid text'],
      usage: { promptTokens: 10, totalTokens: 10 }
    })

    const result = await embedTexts(['', 'valid text'])

    expect(embedMany).toHaveBeenCalledWith({
      model: 'mocked-model',
      values: ['', 'valid text']
    })
    expect(result).toHaveLength(2)
  })
})

describe('EMBEDDING_DIMENSION', () => {
  it('should be 3072 for text-embedding-3-large', () => {
    expect(EMBEDDING_DIMENSION).toBe(3072)
  })
})