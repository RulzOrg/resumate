import { describe, it, expect } from 'vitest'
import { normalizeSalaryRange, normalizeJobField } from '@/lib/normalizers'

describe('normalizeSalaryRange', () => {
  describe('null/undefined handling', () => {
    it('should return null for null input', () => {
      expect(normalizeSalaryRange(null)).toBe(null)
    })

    it('should return null for undefined input', () => {
      expect(normalizeSalaryRange(undefined)).toBe(null)
    })
  })

  describe('string input', () => {
    it('should return trimmed string for non-empty string', () => {
      expect(normalizeSalaryRange('$100,000 - $150,000')).toBe('$100,000 - $150,000')
      expect(normalizeSalaryRange('  $80k/year  ')).toBe('$80k/year')
    })

    it('should return null for empty string', () => {
      expect(normalizeSalaryRange('')).toBe(null)
      expect(normalizeSalaryRange('  ')).toBe(null)
    })
  })

  describe('object input with verbatim', () => {
    it('should prefer verbatim value when present', () => {
      const input = {
        min: 100000,
        max: 150000,
        currency: 'USD',
        verbatim: 'Competitive salary'
      }
      expect(normalizeSalaryRange(input)).toBe('Competitive salary')
    })

    it('should trim verbatim value', () => {
      const input = {
        min: 100000,
        verbatim: '  Market rate  '
      }
      expect(normalizeSalaryRange(input)).toBe('Market rate')
    })

    it('should ignore empty verbatim', () => {
      const input = {
        min: 100000,
        max: 150000,
        verbatim: '  '
      }
      expect(normalizeSalaryRange(input)).toBe('100,000 - 150,000')
    })
  })

  describe('object input with min and max', () => {
    it('should format range with both min and max', () => {
      const input = {
        min: 80000,
        max: 120000
      }
      expect(normalizeSalaryRange(input)).toBe('80,000 - 120,000')
    })

    it('should format range with currency', () => {
      const input = {
        min: 80000,
        max: 120000,
        currency: 'USD'
      }
      expect(normalizeSalaryRange(input)).toBe('USD 80,000 - 120,000')
    })

    it('should format range with period', () => {
      const input = {
        min: 80000,
        max: 120000,
        period: 'per year'
      }
      expect(normalizeSalaryRange(input)).toBe('80,000 - 120,000 per year')
    })

    it('should format range with currency and period', () => {
      const input = {
        min: 80000,
        max: 120000,
        currency: 'EUR',
        period: 'annually'
      }
      expect(normalizeSalaryRange(input)).toBe('EUR 80,000 - 120,000 annually')
    })
  })

  describe('object input with only min', () => {
    it('should format as minimum with plus sign', () => {
      const input = { min: 100000 }
      expect(normalizeSalaryRange(input)).toBe('100,000+')
    })

    it('should include currency and period', () => {
      const input = {
        min: 100000,
        currency: 'GBP',
        period: 'per annum'
      }
      expect(normalizeSalaryRange(input)).toBe('GBP 100,000+ per annum')
    })
  })

  describe('object input with only max', () => {
    it('should format as up to maximum', () => {
      const input = { max: 150000 }
      expect(normalizeSalaryRange(input)).toBe('up to 150,000')
    })

    it('should include currency and period', () => {
      const input = {
        max: 150000,
        currency: 'CAD',
        period: 'yearly'
      }
      expect(normalizeSalaryRange(input)).toBe('CAD up to 150,000 yearly')
    })
  })

  describe('number formatting', () => {
    it('should round decimal values', () => {
      const input = {
        min: 80500.75,
        max: 120999.99
      }
      expect(normalizeSalaryRange(input)).toBe('80,501 - 120,1000')
    })

    it('should handle large numbers correctly', () => {
      const input = {
        min: 1000000,
        max: 2500000
      }
      expect(normalizeSalaryRange(input)).toBe('1,000,000 - 2,500,000')
    })

    it('should handle zero values', () => {
      const input = { min: 0, max: 50000 }
      expect(normalizeSalaryRange(input)).toBe('0 - 50,000')
    })
  })

  describe('invalid numeric values', () => {
    it('should handle null numeric values', () => {
      const input = { min: null, max: 100000 }
      expect(normalizeSalaryRange(input)).toBe('up to 100,000')
    })

    it('should handle undefined numeric values', () => {
      const input = { min: undefined, max: 100000 }
      expect(normalizeSalaryRange(input)).toBe('up to 100,000')
    })

    it('should handle NaN values', () => {
      const input = { min: NaN, max: 100000 }
      expect(normalizeSalaryRange(input)).toBe('up to 100,000')
    })

    it('should handle Infinity values', () => {
      const input = { min: Infinity, max: 100000 }
      expect(normalizeSalaryRange(input)).toBe('up to 100,000')
    })

    it('should return null when no valid values', () => {
      const input = { min: NaN, max: null }
      expect(normalizeSalaryRange(input)).toBe(null)
    })
  })

  describe('edge cases', () => {
    it('should handle empty object', () => {
      expect(normalizeSalaryRange({})).toBe(null)
    })

    it('should trim currency and period values', () => {
      const input = {
        min: 80000,
        currency: '  USD  ',
        period: '  per year  '
      }
      expect(normalizeSalaryRange(input)).toBe('USD 80,000+ per year')
    })

    it('should handle negative values', () => {
      const input = { min: -50000, max: 100000 }
      expect(normalizeSalaryRange(input)).toBe('-50,000 - 100,000')
    })
  })
})

describe('normalizeJobField', () => {
  describe('null/undefined handling', () => {
    it('should return null for null input', () => {
      expect(normalizeJobField(null)).toBe(null)
    })

    it('should return null for undefined input', () => {
      expect(normalizeJobField(undefined)).toBe(null)
    })
  })

  describe('empty string handling', () => {
    it('should return null for empty string', () => {
      expect(normalizeJobField('')).toBe(null)
    })

    it('should return null for whitespace-only string', () => {
      expect(normalizeJobField('   ')).toBe(null)
      expect(normalizeJobField('\t\n')).toBe(null)
    })
  })

  describe('normalization', () => {
    it('should trim whitespace', () => {
      expect(normalizeJobField('  Software Engineer  ')).toBe('software engineer')
    })

    it('should convert to lowercase', () => {
      expect(normalizeJobField('Senior Developer')).toBe('senior developer')
      expect(normalizeJobField('PRODUCT MANAGER')).toBe('product manager')
    })

    it('should collapse consecutive whitespace', () => {
      expect(normalizeJobField('Software    Engineer')).toBe('software engineer')
      expect(normalizeJobField('Data\t\tScientist')).toBe('data scientist')
      expect(normalizeJobField('Product\n\nManager')).toBe('product manager')
    })

    it('should handle mixed whitespace types', () => {
      expect(normalizeJobField('Software\t \nEngineer')).toBe('software engineer')
    })
  })

  describe('company names', () => {
    it('should normalize company names consistently', () => {
      expect(normalizeJobField('Google LLC')).toBe('google llc')
      expect(normalizeJobField('GOOGLE LLC')).toBe('google llc')
      expect(normalizeJobField('  Google   LLC  ')).toBe('google llc')
    })

    it('should handle company names with special characters', () => {
      expect(normalizeJobField('AT&T Inc.')).toBe('at&t inc.')
      expect(normalizeJobField('McKinsey & Company')).toBe('mckinsey & company')
    })
  })

  describe('job titles', () => {
    it('should normalize job titles consistently', () => {
      expect(normalizeJobField('Sr. Software Engineer')).toBe('sr. software engineer')
      expect(normalizeJobField('SR. SOFTWARE ENGINEER')).toBe('sr. software engineer')
    })

    it('should handle job titles with multiple parts', () => {
      expect(normalizeJobField('Vice President of Engineering')).toBe('vice president of engineering')
      expect(normalizeJobField('Chief   Technology   Officer')).toBe('chief technology officer')
    })
  })

  describe('edge cases', () => {
    it('should handle strings with only spaces', () => {
      expect(normalizeJobField('     ')).toBe(null)
    })

    it('should preserve single spaces', () => {
      expect(normalizeJobField('A B C')).toBe('a b c')
    })

    it('should handle very long strings', () => {
      const longTitle = 'Senior ' + 'Software '.repeat(50) + 'Engineer'
      const expected = 'senior ' + 'software '.repeat(49) + 'software engineer'
      expect(normalizeJobField(longTitle)).toBe(expected)
    })

    it('should handle unicode characters', () => {
      expect(normalizeJobField('Développeur Sénior')).toBe('développeur sénior')
      expect(normalizeJobField('工程师')).toBe('工程师')
    })

    it('should handle strings with line breaks', () => {
      expect(normalizeJobField('Software\nEngineer')).toBe('software engineer')
      expect(normalizeJobField('Product\r\nManager')).toBe('product manager')
    })
  })
})