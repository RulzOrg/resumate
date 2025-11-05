import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  qdrant,
  ensureCollection,
  upsertPoints,
  deletePoints,
  QDRANT_COLLECTION,
  EMBEDDING_DIMENSION,
  type UpsertPoint
} from '@/lib/qdrant'

// Mock the QdrantClient
vi.mock('@qdrant/js-client-rest', () => {
  const mockQdrantClient = {
    getCollections: vi.fn(),
    createCollection: vi.fn(),
    createPayloadIndex: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn()
  }

  return {
    QdrantClient: vi.fn(() => mockQdrantClient)
  }
})

describe('Qdrant configuration', () => {
  it('should have correct embedding dimension', () => {
    expect(EMBEDDING_DIMENSION).toBe(3072)
  })

  it('should use environment variables or defaults', () => {
    // Collection name should be set from env or default
    expect(QDRANT_COLLECTION).toBeTruthy()
  })
})

describe('ensureCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create collection if it does not exist', async () => {
    vi.mocked(qdrant.getCollections).mockResolvedValueOnce({
      collections: []
    })
    vi.mocked(qdrant.createCollection).mockResolvedValueOnce({ result: true })
    vi.mocked(qdrant.createPayloadIndex).mockResolvedValue({ result: true })

    await ensureCollection()

    expect(qdrant.getCollections).toHaveBeenCalledTimes(1)
    expect(qdrant.createCollection).toHaveBeenCalledWith(
      QDRANT_COLLECTION,
      expect.objectContaining({
        vectors: { size: EMBEDDING_DIMENSION, distance: 'Cosine' }
      })
    )
  })

  it('should not create collection if it already exists', async () => {
    vi.mocked(qdrant.getCollections).mockResolvedValueOnce({
      collections: [{ name: QDRANT_COLLECTION }]
    })
    vi.mocked(qdrant.createPayloadIndex).mockResolvedValue({ result: true })

    await ensureCollection()

    expect(qdrant.getCollections).toHaveBeenCalledTimes(1)
    expect(qdrant.createCollection).not.toHaveBeenCalled()
  })

  it('should handle concurrent collection creation (409 error)', async () => {
    vi.mocked(qdrant.getCollections).mockResolvedValueOnce({
      collections: []
    })

    const error409 = new Error('Collection already exists')
    Object.assign(error409, { status: 409 })
    vi.mocked(qdrant.createCollection).mockRejectedValueOnce(error409)
    vi.mocked(qdrant.createPayloadIndex).mockResolvedValue({ result: true })

    await expect(ensureCollection()).resolves.not.toThrow()

    expect(qdrant.createCollection).toHaveBeenCalledTimes(1)
  })

  it('should throw error for non-409 collection creation errors', async () => {
    vi.mocked(qdrant.getCollections).mockResolvedValueOnce({
      collections: []
    })

    const error500 = new Error('Internal server error')
    Object.assign(error500, { status: 500 })
    vi.mocked(qdrant.createCollection).mockRejectedValueOnce(error500)

    await expect(ensureCollection()).rejects.toThrow('Internal server error')
  })

  it('should create all required indexes', async () => {
    vi.mocked(qdrant.getCollections).mockResolvedValueOnce({
      collections: [{ name: QDRANT_COLLECTION }]
    })
    vi.mocked(qdrant.createPayloadIndex).mockResolvedValue({ result: true })

    await ensureCollection()

    // Should create userId, resume_id, and evidence_id indexes
    expect(qdrant.createPayloadIndex).toHaveBeenCalledWith(
      QDRANT_COLLECTION,
      expect.objectContaining({
        field_name: 'userId',
        field_schema: 'keyword'
      })
    )
    expect(qdrant.createPayloadIndex).toHaveBeenCalledWith(
      QDRANT_COLLECTION,
      expect.objectContaining({
        field_name: 'resume_id',
        field_schema: 'keyword'
      })
    )
    expect(qdrant.createPayloadIndex).toHaveBeenCalledWith(
      QDRANT_COLLECTION,
      expect.objectContaining({
        field_name: 'evidence_id',
        field_schema: 'keyword'
      })
    )
  })

  it('should handle index already exists (409 error) gracefully', async () => {
    vi.mocked(qdrant.getCollections).mockResolvedValueOnce({
      collections: [{ name: QDRANT_COLLECTION }]
    })

    const error409 = new Error('Index already exists')
    Object.assign(error409, { status: 409 })
    vi.mocked(qdrant.createPayloadIndex).mockRejectedValue(error409)

    await expect(ensureCollection()).resolves.not.toThrow()
  })

  it('should warn but not throw for non-409 index creation errors', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.mocked(qdrant.getCollections).mockResolvedValueOnce({
      collections: [{ name: QDRANT_COLLECTION }]
    })

    const error500 = new Error('Index creation failed')
    Object.assign(error500, { status: 500 })
    vi.mocked(qdrant.createPayloadIndex).mockRejectedValue(error500)

    await expect(ensureCollection()).resolves.not.toThrow()
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('should rethrow errors from getCollections', async () => {
    const error = new Error('Qdrant server is down')
    vi.mocked(qdrant.getCollections).mockRejectedValueOnce(error)

    await expect(ensureCollection()).rejects.toThrow('Qdrant server is down')
  })
})

describe('upsertPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(qdrant.getCollections).mockResolvedValue({
      collections: [{ name: QDRANT_COLLECTION }]
    })
    vi.mocked(qdrant.createPayloadIndex).mockResolvedValue({ result: true })
  })

  it('should do nothing for empty points array', async () => {
    await upsertPoints([])

    expect(qdrant.getCollections).not.toHaveBeenCalled()
    expect(qdrant.upsert).not.toHaveBeenCalled()
  })

  it('should upsert single point', async () => {
    const point: UpsertPoint = {
      id: 'test-id-1',
      vector: Array(EMBEDDING_DIMENSION).fill(0.1),
      payload: { text: 'test text', userId: 'user1' }
    }

    vi.mocked(qdrant.upsert).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await upsertPoints([point])

    expect(qdrant.upsert).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      wait: true,
      points: [{
        id: point.id,
        vector: point.vector,
        payload: point.payload
      }]
    })
  })

  it('should upsert multiple points', async () => {
    const points: UpsertPoint[] = [
      {
        id: 'test-id-1',
        vector: Array(EMBEDDING_DIMENSION).fill(0.1),
        payload: { text: 'text 1', userId: 'user1' }
      },
      {
        id: 'test-id-2',
        vector: Array(EMBEDDING_DIMENSION).fill(0.2),
        payload: { text: 'text 2', userId: 'user1' }
      },
      {
        id: 123, // numeric ID
        vector: Array(EMBEDDING_DIMENSION).fill(0.3),
        payload: { text: 'text 3', userId: 'user2' }
      }
    ]

    vi.mocked(qdrant.upsert).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await upsertPoints(points)

    expect(qdrant.upsert).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      wait: true,
      points: points.map(p => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload
      }))
    })
  })

  it('should ensure collection before upserting', async () => {
    const point: UpsertPoint = {
      id: 'test-id',
      vector: Array(EMBEDDING_DIMENSION).fill(0.1),
      payload: { text: 'test' }
    }

    vi.mocked(qdrant.upsert).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await upsertPoints([point])

    expect(qdrant.getCollections).toHaveBeenCalledBefore(qdrant.upsert as any)
  })

  it('should handle upsert errors', async () => {
    const point: UpsertPoint = {
      id: 'test-id',
      vector: Array(EMBEDDING_DIMENSION).fill(0.1),
      payload: { text: 'test' }
    }

    const error = new Error('Upsert failed')
    vi.mocked(qdrant.upsert).mockRejectedValueOnce(error)

    await expect(upsertPoints([point])).rejects.toThrow('Upsert failed')
  })
})

describe('deletePoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(qdrant.getCollections).mockResolvedValue({
      collections: [{ name: QDRANT_COLLECTION }]
    })
    vi.mocked(qdrant.createPayloadIndex).mockResolvedValue({ result: true })
  })

  it('should throw error for empty filter', async () => {
    await expect(deletePoints({})).rejects.toThrow('filter must be a non-empty object')
  })

  it('should throw error for null filter', async () => {
    // @ts-expect-error - testing invalid input
    await expect(deletePoints(null)).rejects.toThrow('filter must be a non-empty object')
  })

  it('should throw error for undefined filter', async () => {
    // @ts-expect-error - testing invalid input
    await expect(deletePoints(undefined)).rejects.toThrow('filter must be a non-empty object')
  })

  it('should throw error for filter with undefined values', async () => {
    await expect(deletePoints({ userId: undefined })).rejects.toThrow('filter key and value must be defined')
  })

  it('should delete points with valid filter', async () => {
    vi.mocked(qdrant.delete).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await deletePoints({ userId: 'user123' })

    expect(qdrant.delete).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      wait: true,
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: 'user123' }
          }
        ]
      }
    })
  })

  it('should handle different filter keys', async () => {
    vi.mocked(qdrant.delete).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await deletePoints({ resume_id: 'resume-456' })

    expect(qdrant.delete).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      wait: true,
      filter: {
        must: [
          {
            key: 'resume_id',
            match: { value: 'resume-456' }
          }
        ]
      }
    })
  })

  it('should use only the first filter key-value pair', async () => {
    vi.mocked(qdrant.delete).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await deletePoints({ userId: 'user1', resume_id: 'resume1' })

    // Should only use the first key-value pair
    expect(qdrant.delete).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      wait: true,
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: 'user1' }
          }
        ]
      }
    })
  })

  it('should ensure collection before deleting', async () => {
    vi.mocked(qdrant.delete).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await deletePoints({ userId: 'user123' })

    expect(qdrant.getCollections).toHaveBeenCalledBefore(qdrant.delete as any)
  })

  it('should handle delete errors', async () => {
    const error = new Error('Delete failed')
    vi.mocked(qdrant.delete).mockRejectedValueOnce(error)

    await expect(deletePoints({ userId: 'user123' })).rejects.toThrow('Delete failed')
  })

  it('should handle numeric filter values', async () => {
    vi.mocked(qdrant.delete).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await deletePoints({ score: 100 })

    expect(qdrant.delete).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      wait: true,
      filter: {
        must: [
          {
            key: 'score',
            match: { value: 100 }
          }
        ]
      }
    })
  })

  it('should handle boolean filter values', async () => {
    vi.mocked(qdrant.delete).mockResolvedValueOnce({ operation_id: 1, status: 'completed' })

    await deletePoints({ isActive: true })

    expect(qdrant.delete).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      wait: true,
      filter: {
        must: [
          {
            key: 'isActive',
            match: { value: true }
          }
        ]
      }
    })
  })
})