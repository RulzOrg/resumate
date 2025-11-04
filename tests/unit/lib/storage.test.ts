import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Socket } from 'net'

// Mock AWS SDK modules before importing storage module
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn()
  })),
  PutObjectCommand: vi.fn((params) => ({ ...params, _type: 'PutObjectCommand' })),
  GetObjectCommand: vi.fn((params) => ({ ...params, _type: 'GetObjectCommand' }))
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn()
}))

// Mock net module for virus scanning
vi.mock('net', () => {
  const mockSocket = {
    on: vi.fn(),
    connect: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
    destroyed: false
  }
  return {
    Socket: vi.fn(() => mockSocket)
  }
})

describe('Storage Module Tests', () => {
  // Store original env vars
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    // Reset modules to force re-evaluation
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  describe('uploadBufferToS3', () => {
    it('should upload buffer with R2 configuration', async () => {
      // Set env vars BEFORE importing the module
      process.env = {}
      process.env.R2_ACCOUNT_ID = 'test-account'
      process.env.R2_BUCKET_NAME = 'test-bucket'

      // Now import the module - it will read the env vars we just set
      const { uploadBufferToS3, s3 } = await import('@/lib/storage')
      const { S3Client } = await import('@aws-sdk/client-s3')

      const mockSend = vi.fn().mockResolvedValueOnce({})
      vi.mocked(s3.send).mockImplementation(mockSend)

      const buffer = Buffer.from('test content')
      const result = await uploadBufferToS3({
        buffer,
        key: 'test/file.pdf',
        contentType: 'application/pdf'
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'test/file.pdf',
          Body: buffer,
          ContentType: 'application/pdf',
          CacheControl: 'public, max-age=31536000, immutable',
          ACL: 'public-read'
        })
      )

      expect(result.key).toBe('test/file.pdf')
      expect(result.url).toContain('test-account.r2.cloudflarestorage.com')
      expect(result.url).toContain('test-bucket')
      expect(result.url).toContain('test%2Ffile.pdf')
    })

    it('should upload buffer with S3 configuration', async () => {
      // Clear env and set S3 config
      process.env = {}
      process.env.S3_BUCKET_NAME = 's3-test-bucket'
      process.env.AWS_REGION = 'us-east-1'

      const { uploadBufferToS3, s3 } = await import('@/lib/storage')

      const mockSend = vi.fn().mockResolvedValueOnce({})
      vi.mocked(s3.send).mockImplementation(mockSend)

      const buffer = Buffer.from('test content')
      const result = await uploadBufferToS3({
        buffer,
        key: 'uploads/file.txt',
        contentType: 'text/plain',
        cacheControl: 'public, max-age=3600',
        acl: 'private'
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 's3-test-bucket',
          Key: 'uploads/file.txt',
          Body: buffer,
          ContentType: 'text/plain',
          CacheControl: 'public, max-age=3600',
          ACL: 'private'
        })
      )

      expect(result.key).toBe('uploads/file.txt')
      expect(result.url).toContain('s3-test-bucket.s3.us-east-1.amazonaws.com')
      expect(result.url).toContain('uploads%2Ffile.txt')
    })

    it('should use public base URL when configured', async () => {
      process.env = {}
      process.env.R2_BUCKET_NAME = 'test-bucket'
      process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com/'

      const { uploadBufferToS3, s3 } = await import('@/lib/storage')

      const mockSend = vi.fn().mockResolvedValueOnce({})
      vi.mocked(s3.send).mockImplementation(mockSend)

      const buffer = Buffer.from('test')
      const result = await uploadBufferToS3({
        buffer,
        key: 'assets/image.jpg',
        contentType: 'image/jpeg'
      })

      expect(result.url).toBe('https://cdn.example.com/assets%2Fimage.jpg')
    })

    it('should throw error when bucket name is not configured', async () => {
      process.env = {}

      const { uploadBufferToS3 } = await import('@/lib/storage')

      const buffer = Buffer.from('test')
      await expect(uploadBufferToS3({
        buffer,
        key: 'test.txt',
        contentType: 'text/plain'
      })).rejects.toThrow('Bucket name not set')
    })

    it('should handle S3 upload errors', async () => {
      process.env = {}
      process.env.R2_BUCKET_NAME = 'test-bucket'

      const { uploadBufferToS3, s3 } = await import('@/lib/storage')

      const error = new Error('Upload failed')
      vi.mocked(s3.send).mockRejectedValueOnce(error)

      const buffer = Buffer.from('test')
      await expect(uploadBufferToS3({
        buffer,
        key: 'test.txt',
        contentType: 'text/plain'
      })).rejects.toThrow('Upload failed')
    })
  })

  describe('getSignedDownloadUrl', () => {
    it('should generate signed download URL with default expiration', async () => {
      process.env = {}
      process.env.R2_BUCKET_NAME = 'test-bucket'

      const { getSignedDownloadUrl, s3 } = await import('@/lib/storage')
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

      const mockSignedUrl = 'https://signed-url.example.com/download'
      vi.mocked(getSignedUrl).mockResolvedValueOnce(mockSignedUrl)

      const result = await getSignedDownloadUrl('path/to/file.pdf')

      expect(getSignedUrl).toHaveBeenCalledWith(
        s3,
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'path/to/file.pdf'
        }),
        { expiresIn: 300 }
      )
      expect(result).toBe(mockSignedUrl)
    })

    it('should generate signed download URL with custom expiration', async () => {
      process.env = {}
      process.env.R2_BUCKET_NAME = 'test-bucket'

      const { getSignedDownloadUrl, s3 } = await import('@/lib/storage')
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

      const mockSignedUrl = 'https://signed-url.example.com/download'
      vi.mocked(getSignedUrl).mockResolvedValueOnce(mockSignedUrl)

      const result = await getSignedDownloadUrl('file.txt', 3600)

      expect(getSignedUrl).toHaveBeenCalledWith(
        s3,
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'file.txt'
        }),
        { expiresIn: 3600 }
      )
      expect(result).toBe(mockSignedUrl)
    })

    it('should throw error when bucket name is not configured', async () => {
      process.env = {}

      const { getSignedDownloadUrl } = await import('@/lib/storage')

      await expect(getSignedDownloadUrl('test.txt')).rejects.toThrow('Bucket name not set')
    })

    it('should handle signing errors', async () => {
      process.env = {}
      process.env.R2_BUCKET_NAME = 'test-bucket'

      const { getSignedDownloadUrl } = await import('@/lib/storage')
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

      const error = new Error('Signing failed')
      vi.mocked(getSignedUrl).mockRejectedValueOnce(error)

      await expect(getSignedDownloadUrl('test.txt')).rejects.toThrow('Signing failed')
    })
  })

  describe('buildS3Key', () => {
    it('should build S3 key with sanitized filename', async () => {
      const { buildS3Key } = await import('@/lib/storage')

      const key = buildS3Key({
        userId: 'user-123',
        kind: 'resume',
        fileName: 'My Resume.pdf'
      })

      expect(key).toMatch(/^uploads\/user-123\/resume\/\d+-My_Resume.pdf$/)
    })

    it('should sanitize special characters in filename', async () => {
      const { buildS3Key } = await import('@/lib/storage')

      const key = buildS3Key({
        userId: 'user-456',
        kind: 'document',
        fileName: 'File@#$%^&*()Name!.txt'
      })

      expect(key).toMatch(/^uploads\/user-456\/document\/\d+-File_________Name_.txt$/)
    })

    it('should preserve allowed characters', async () => {
      const { buildS3Key } = await import('@/lib/storage')

      const key = buildS3Key({
        userId: 'user-789',
        kind: 'image',
        fileName: 'valid-file_name.123.jpg'
      })

      expect(key).toMatch(/^uploads\/user-789\/image\/\d+-valid-file_name.123.jpg$/)
    })

    it('should include timestamp in key', async () => {
      const { buildS3Key } = await import('@/lib/storage')

      const before = Date.now()
      const key = buildS3Key({
        userId: 'user-000',
        kind: 'test',
        fileName: 'file.txt'
      })
      const after = Date.now()

      const match = key.match(/uploads\/user-000\/test\/(\d+)-file.txt/)
      expect(match).toBeTruthy()

      const timestamp = parseInt(match![1])
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('should handle empty filename parts', async () => {
      const { buildS3Key } = await import('@/lib/storage')

      const key = buildS3Key({
        userId: '',
        kind: '',
        fileName: ''
      })

      expect(key).toMatch(/^uploads\/\/\/\d+-$/)
    })
  })

  describe('scanBufferForViruses', () => {
    it('should skip scanning when ClamAV host is not configured', async () => {
      process.env = {}

      const { scanBufferForViruses } = await import('@/lib/storage')

      const buffer = Buffer.from('test content')
      const result = await scanBufferForViruses(buffer)

      expect(result).toEqual({ status: 'skipped' })
      expect(Socket).not.toHaveBeenCalled()
    })

    it('should detect clean file', async () => {
      process.env = {}
      process.env.CLAMAV_HOST = 'localhost'
      process.env.CLAMAV_PORT = '3310'

      const { scanBufferForViruses } = await import('@/lib/storage')

      const buffer = Buffer.from('clean content')
      const mockSocket = new Socket() as any

      // Set up mock socket behavior
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          // Simulate ClamAV responding with OK
          setTimeout(() => callback(Buffer.from('stream: OK\0')), 10)
        }
        return mockSocket
      })

      mockSocket.connect.mockImplementation((_port: number, _host: string, callback: Function) => {
        callback()
        return mockSocket
      })

      const result = await scanBufferForViruses(buffer)

      expect(result).toEqual({ status: 'clean' })
      expect(mockSocket.connect).toHaveBeenCalledWith(3310, 'localhost', expect.any(Function))
      expect(mockSocket.write).toHaveBeenCalledWith('nINSTREAM\n')
    })

    it('should detect infected file', async () => {
      process.env = {}
      process.env.CLAMAV_HOST = 'localhost'

      const { scanBufferForViruses } = await import('@/lib/storage')

      const buffer = Buffer.from('infected content')
      const mockSocket = new Socket() as any

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('stream: Win.Test.EICAR_HDB-1 FOUND\0')), 10)
        }
        return mockSocket
      })

      mockSocket.connect.mockImplementation((_port: number, _host: string, callback: Function) => {
        callback()
        return mockSocket
      })

      const result = await scanBufferForViruses(buffer)

      expect(result).toEqual({
        status: 'infected',
        signature: 'Win.Test.EICAR_HDB-1'
      })
    })

    it('should handle socket errors', async () => {
      process.env = {}
      process.env.CLAMAV_HOST = 'localhost'

      const { scanBufferForViruses } = await import('@/lib/storage')

      const buffer = Buffer.from('test')
      const mockSocket = new Socket() as any

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection refused')), 10)
        }
        return mockSocket
      })

      mockSocket.connect.mockImplementation(() => mockSocket)

      const result = await scanBufferForViruses(buffer)

      expect(result).toEqual({
        status: 'error',
        error: 'Connection refused'
      })
    })

    it('should handle timeout', async () => {
      process.env = {}
      process.env.CLAMAV_HOST = 'localhost'
      process.env.CLAMAV_TIMEOUT_MS = '100'

      const { scanBufferForViruses } = await import('@/lib/storage')

      const buffer = Buffer.from('test')
      const mockSocket = new Socket() as any

      mockSocket.on.mockImplementation(() => mockSocket)
      mockSocket.connect.mockImplementation(() => mockSocket)

      const result = await scanBufferForViruses(buffer)

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(result).toEqual({
        status: 'error',
        error: 'Virus scan timed out'
      })
    })

    it('should handle ClamAV error responses', async () => {
      process.env = {}
      process.env.CLAMAV_HOST = 'localhost'

      const { scanBufferForViruses } = await import('@/lib/storage')

      const buffer = Buffer.from('test')
      const mockSocket = new Socket() as any

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('ERROR: Can\'t allocate memory\0')), 10)
        }
        return mockSocket
      })

      mockSocket.connect.mockImplementation((_port: number, _host: string, callback: Function) => {
        callback()
        return mockSocket
      })

      const result = await scanBufferForViruses(buffer)

      expect(result).toEqual({
        status: 'error',
        error: 'ERROR: Can\'t allocate memory'
      })
    })

    it('should handle empty ClamAV response', async () => {
      process.env = {}
      process.env.CLAMAV_HOST = 'localhost'

      const { scanBufferForViruses } = await import('@/lib/storage')

      const buffer = Buffer.from('test')
      const mockSocket = new Socket() as any

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 10)
        }
        return mockSocket
      })

      mockSocket.connect.mockImplementation((_port: number, _host: string, callback: Function) => {
        callback()
        return mockSocket
      })

      const result = await scanBufferForViruses(buffer)

      expect(result).toEqual({
        status: 'error',
        error: 'Empty response from virus scanner'
      })
    })

    it('should write buffer in chunks', async () => {
      process.env = {}
      process.env.CLAMAV_HOST = 'localhost'

      const { scanBufferForViruses } = await import('@/lib/storage')

      // Create a buffer larger than 32KB to trigger chunking
      const buffer = Buffer.alloc(100 * 1024, 'x')
      const mockSocket = new Socket() as any

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('stream: OK\0')), 10)
        }
        return mockSocket
      })

      mockSocket.connect.mockImplementation((_port: number, _host: string, callback: Function) => {
        callback()
        return mockSocket
      })

      await scanBufferForViruses(buffer)

      // Should have written INSTREAM command
      expect(mockSocket.write).toHaveBeenCalledWith('nINSTREAM\n')

      // Should have written multiple chunks (100KB / 32KB = ~4 chunks)
      const writeCalls = mockSocket.write.mock.calls
      const chunkCalls = writeCalls.filter((call: any[]) =>
        Buffer.isBuffer(call[0]) && call[0].length === 4
      )
      expect(chunkCalls.length).toBeGreaterThan(2)

      // Should have written zero terminator
      const lastCall = writeCalls[writeCalls.length - 1]
      expect(lastCall[0]).toEqual(Buffer.alloc(4))
    })
  })
})