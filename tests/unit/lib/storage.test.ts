import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  s3,
  uploadBufferToS3,
  getSignedDownloadUrl,
  buildS3Key,
  scanBufferForViruses,
  type VirusScanResult
} from '@/lib/storage'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Socket } from 'net'

// Mock AWS SDK modules
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

describe('uploadBufferToS3', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should upload buffer with R2 configuration', async () => {
    process.env.R2_ACCOUNT_ID = 'test-account'
    process.env.R2_BUCKET_NAME = 'test-bucket'

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
        _type: 'PutObjectCommand',
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
    // Remove R2 config to use S3
    delete process.env.R2_ACCOUNT_ID
    process.env.S3_BUCKET_NAME = 's3-test-bucket'
    process.env.AWS_REGION = 'us-east-1'

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
        _type: 'PutObjectCommand',
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
    process.env.R2_BUCKET_NAME = 'test-bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com/'

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
    delete process.env.R2_BUCKET_NAME
    delete process.env.S3_BUCKET_NAME

    const buffer = Buffer.from('test')
    await expect(uploadBufferToS3({
      buffer,
      key: 'test.txt',
      contentType: 'text/plain'
    })).rejects.toThrow('Bucket name not set')
  })

  it('should handle S3 upload errors', async () => {
    process.env.R2_BUCKET_NAME = 'test-bucket'

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
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.R2_BUCKET_NAME = 'test-bucket'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should generate signed download URL with default expiration', async () => {
    const mockSignedUrl = 'https://signed-url.example.com/download'
    vi.mocked(getSignedUrl).mockResolvedValueOnce(mockSignedUrl)

    const result = await getSignedDownloadUrl('path/to/file.pdf')

    expect(getSignedUrl).toHaveBeenCalledWith(
      s3,
      expect.objectContaining({
        _type: 'GetObjectCommand',
        Bucket: 'test-bucket',
        Key: 'path/to/file.pdf'
      }),
      { expiresIn: 300 }
    )
    expect(result).toBe(mockSignedUrl)
  })

  it('should generate signed download URL with custom expiration', async () => {
    const mockSignedUrl = 'https://signed-url.example.com/download'
    vi.mocked(getSignedUrl).mockResolvedValueOnce(mockSignedUrl)

    const result = await getSignedDownloadUrl('file.txt', 3600)

    expect(getSignedUrl).toHaveBeenCalledWith(
      s3,
      expect.objectContaining({
        _type: 'GetObjectCommand',
        Bucket: 'test-bucket',
        Key: 'file.txt'
      }),
      { expiresIn: 3600 }
    )
    expect(result).toBe(mockSignedUrl)
  })

  it('should throw error when bucket name is not configured', async () => {
    delete process.env.R2_BUCKET_NAME
    delete process.env.S3_BUCKET_NAME

    await expect(getSignedDownloadUrl('test.txt')).rejects.toThrow('Bucket name not set')
  })

  it('should handle signing errors', async () => {
    const error = new Error('Signing failed')
    vi.mocked(getSignedUrl).mockRejectedValueOnce(error)

    await expect(getSignedDownloadUrl('test.txt')).rejects.toThrow('Signing failed')
  })
})

describe('buildS3Key', () => {
  it('should build S3 key with sanitized filename', () => {
    const key = buildS3Key({
      userId: 'user-123',
      kind: 'resume',
      fileName: 'My Resume.pdf'
    })

    expect(key).toMatch(/^uploads\/user-123\/resume\/\d+-My_Resume.pdf$/)
  })

  it('should sanitize special characters in filename', () => {
    const key = buildS3Key({
      userId: 'user-456',
      kind: 'document',
      fileName: 'File@#$%^&*()Name!.txt'
    })

    expect(key).toMatch(/^uploads\/user-456\/document\/\d+-File_________Name_.txt$/)
  })

  it('should preserve allowed characters', () => {
    const key = buildS3Key({
      userId: 'user-789',
      kind: 'image',
      fileName: 'valid-file_name.123.jpg'
    })

    expect(key).toMatch(/^uploads\/user-789\/image\/\d+-valid-file_name.123.jpg$/)
  })

  it('should include timestamp in key', () => {
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

  it('should handle empty filename parts', () => {
    const key = buildS3Key({
      userId: '',
      kind: '',
      fileName: ''
    })

    expect(key).toMatch(/^uploads\/\/\/\d+-$/)
  })
})

describe('scanBufferForViruses', () => {
  const originalEnv = process.env
  let mockSocket: any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    mockSocket = new Socket()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should skip scanning when ClamAV host is not configured', async () => {
    delete process.env.CLAMAV_HOST

    const buffer = Buffer.from('test content')
    const result = await scanBufferForViruses(buffer)

    expect(result).toEqual({ status: 'skipped' })
    expect(Socket).not.toHaveBeenCalled()
  })

  it('should detect clean file', async () => {
    process.env.CLAMAV_HOST = 'localhost'
    process.env.CLAMAV_PORT = '3310'

    const buffer = Buffer.from('clean content')

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
    process.env.CLAMAV_HOST = 'localhost'

    const buffer = Buffer.from('infected content')

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
    process.env.CLAMAV_HOST = 'localhost'

    const buffer = Buffer.from('test')

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
    process.env.CLAMAV_HOST = 'localhost'
    process.env.CLAMAV_TIMEOUT_MS = '100'

    const buffer = Buffer.from('test')

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
    process.env.CLAMAV_HOST = 'localhost'

    const buffer = Buffer.from('test')

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
    process.env.CLAMAV_HOST = 'localhost'

    const buffer = Buffer.from('test')

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
    process.env.CLAMAV_HOST = 'localhost'

    // Create a buffer larger than 32KB to trigger chunking
    const buffer = Buffer.alloc(100 * 1024, 'x')

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