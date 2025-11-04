import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { llamaParseExtract, type ExtractResult } from '@/lib/llamaparse'

// Mock global fetch
global.fetch = vi.fn()
global.FormData = vi.fn(() => ({
  append: vi.fn()
})) as any
global.Blob = vi.fn((content, options) => ({ content, options })) as any

describe('llamaParseExtract', () => {
  const originalEnv = process.env
  const mockFetch = global.fetch as any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.LLAMACLOUD_API_KEY = 'test-api-key'
    process.env.LLAMAPARSE_MODE = 'fast'
    process.env.LLAMAPARSE_TIMEOUT_MS = '60000'
    process.env.LLAMAPARSE_MAX_PAGES = '50'
    process.env.LLAMAPARSE_MIN_CHARS = '100'
    process.env.LLAMAPARSE_MIN_CHARS_PER_PAGE = '200'

    // Mock console methods to reduce test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('API key validation', () => {
    it('should return error when API key is not configured', async () => {
      delete process.env.LLAMACLOUD_API_KEY

      const buffer = Buffer.from('test content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result).toEqual({
        text: '',
        total_chars: 0,
        page_count: 0,
        warnings: ['LLAMACLOUD_API_KEY not configured'],
        mode_used: 'none',
        truncated: false,
        coverage: 0,
        error: 'API key not configured'
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('successful extraction', () => {
    it('should extract text successfully in fast mode', async () => {
      const extractedText = 'This is the extracted resume content.\nName: John Doe\nExperience: 5 years'

      // Mock upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-123' })
      })

      // Mock status polling (immediate success)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'success',
          pages: 2,
          markdown: extractedText,
          text: extractedText
        })
      })

      // Mock result fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => extractedText
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123', 'fast')

      expect(result).toEqual({
        text: extractedText,
        total_chars: extractedText.length,
        page_count: 2,
        warnings: [],
        mode_used: 'llamaparse_fast',
        truncated: false,
        coverage: expect.any(Number)
      })

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(3)

      // Upload call
      expect(mockFetch).toHaveBeenNthCalledWith(1,
        'https://api.cloud.llamaindex.ai/api/parsing/upload',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key'
          },
          body: expect.any(Object)
        })
      )

      // Status check
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'https://api.cloud.llamaindex.ai/api/parsing/job/job-123',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-api-key'
          }
        })
      )

      // Result fetch
      expect(mockFetch).toHaveBeenNthCalledWith(3,
        'https://api.cloud.llamaindex.ai/api/parsing/job/job-123/result/markdown',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-api-key'
          }
        })
      )
    })

    it('should extract text in premium mode', async () => {
      const extractedText = 'Premium extraction with better OCR'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-456' })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-456',
          status: 'SUCCESS', // Test uppercase status
          pages: 1
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => extractedText
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123', 'premium')

      expect(result.mode_used).toBe('llamaparse_premium')
      expect(result.text).toBe(extractedText)
    })
  })

  describe('polling behavior', () => {
    it('should poll until job succeeds', async () => {
      const extractedText = 'Final result'

      // Mock upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-789' })
      })

      // Mock polling - processing, then success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-789', status: 'processing' })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-789', status: 'processing' })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-789', status: 'success', pages: 3 })
      })

      // Mock result
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => extractedText
      })

      // Use a shorter timeout for testing
      process.env.LLAMAPARSE_TIMEOUT_MS = '10000'

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.text).toBe(extractedText)
      expect(result.page_count).toBe(3)
      expect(mockFetch).toHaveBeenCalledTimes(5) // upload + 3 polls + result
    })

    it('should handle job timeout', async () => {
      // Mock upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-timeout' })
      })

      // Mock polling - always processing
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: async () => ({ id: 'job-timeout', status: 'processing' })
      }))

      // Use very short timeout for testing
      process.env.LLAMAPARSE_TIMEOUT_MS = '100'

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.error).toContain('timed out')
      expect(result.text).toBe('')
      expect(result.total_chars).toBe(0)
    })

    it('should handle job error status', async () => {
      // Mock upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-error' })
      })

      // Mock polling - returns error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-error',
          status: 'ERROR',
          error: 'Document parsing failed'
        })
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.error).toBe('Document parsing failed')
      expect(result.text).toBe('')
      expect(result.warnings).toContain('Document parsing failed')
    })
  })

  describe('error handling', () => {
    it('should handle upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        text: async () => 'File too large'
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.error).toContain('Upload failed')
      expect(result.text).toBe('')
      expect(result.total_chars).toBe(0)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.error).toBe('Network error')
      expect(result.warnings).toContain('Network error')
      expect(result.text).toBe('')
    })

    it('should handle missing job ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // No ID in response
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.error).toContain('No job ID returned')
      expect(result.text).toBe('')
    })

    it('should retry result fetch on failure', async () => {
      const extractedText = 'Retried result'

      // Mock upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-retry' })
      })

      // Mock status - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-retry', status: 'success', pages: 1 })
      })

      // Mock result fetch - fail twice, then succeed
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => extractedText
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.text).toBe(extractedText)
      expect(mockFetch).toHaveBeenCalledTimes(5) // upload + status + 3 result attempts
    })
  })

  describe('content validation and warnings', () => {
    it('should warn about low character count', async () => {
      const shortText = 'Short'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-short' })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-short', status: 'success', pages: 1 })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => shortText
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Extracted only 5 chars, below minimum 100')
      )
    })

    it('should warn about page limit truncation', async () => {
      const longText = 'a'.repeat(20000)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-long' })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-long', status: 'success', pages: 60 })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => longText
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.truncated).toBe(true)
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Document has 60 pages, limited to 50')
      )
    })

    it('should warn about low coverage', async () => {
      const lowCoverageText = 'x'.repeat(50) // Very short for 5 pages

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-coverage' })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-coverage', status: 'success', pages: 5 })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => lowCoverageText
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Low coverage')
      )
      expect(result.coverage).toBeLessThan(0.6)
    })
  })

  describe('configuration', () => {
    it('should use environment variable defaults', async () => {
      process.env.LLAMAPARSE_MODE = 'accurate'
      process.env.LLAMAPARSE_MAX_PAGES = '100'
      process.env.LLAMAPARSE_MIN_CHARS = '50'

      const text = 'x'.repeat(60)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-config' })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-config', status: 'success', pages: 1 })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => text
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123')

      expect(result.mode_used).toBe('llamaparse_premium') // accurate = premium
      expect(result.warnings).toHaveLength(0) // No warning since min_chars is 50
    })

    it('should override mode parameter', async () => {
      process.env.LLAMAPARSE_MODE = 'fast'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-override' })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'job-override', status: 'success', pages: 1 })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Result text'
      })

      const buffer = Buffer.from('PDF content')
      const result = await llamaParseExtract(buffer, 'application/pdf', 'user123', 'premium')

      expect(result.mode_used).toBe('llamaparse_premium') // Override worked
    })
  })
})