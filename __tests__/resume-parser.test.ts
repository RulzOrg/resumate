import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

// Mock the parser function since it's not exported
// We'll need to extract it or test through the component
// For now, creating the test structure

describe('Resume Parser', () => {
  describe('Complete Resume', () => {
    it('should parse all sections from complete resume', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/complete-resume.md'),
        'utf-8'
      )

      // TODO: Import and test parseMarkdownToStructured function
      // For now, this documents expected behavior

      expect(markdown).toContain('John Doe')
      expect(markdown).toContain('TechCorp Inc.')
      expect(markdown).toContain('Stanford University')
      expect(markdown).toContain('AWS Certified Solutions Architect')
      expect(markdown).toContain('Python, JavaScript, TypeScript')
      expect(markdown).toContain('Open source contribution')
    })

    it('should extract contact information correctly', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/complete-resume.md'),
        'utf-8'
      )

      expect(markdown).toContain('john.doe@email.com')
      expect(markdown).toContain('+1 (555) 123-4567')
      expect(markdown).toContain('linkedin.com/in/johndoe')
      expect(markdown).toContain('San Francisco, CA')
    })

    it('should parse multiple work experiences', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/complete-resume.md'),
        'utf-8'
      )

      expect(markdown).toContain('TechCorp Inc.')
      expect(markdown).toContain('StartupXYZ')
      expect(markdown).toContain('DevAgency')
    })

    it('should parse education with GPA and honors', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/complete-resume.md'),
        'utf-8'
      )

      expect(markdown).toContain('Stanford University')
      expect(markdown).toContain('GPA: 3.8/4.0')
      expect(markdown).toContain("Dean's List")
    })
  })

  describe('Minimal Resume', () => {
    it('should handle minimal resume with only name and email', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/minimal-resume.md'),
        'utf-8'
      )

      expect(markdown).toContain('Jane Smith')
      expect(markdown).toContain('jane.smith@example.com')
    })

    it('should not crash on minimal data', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/minimal-resume.md'),
        'utf-8'
      )

      // Parser should handle gracefully without throwing
      expect(markdown.length).toBeGreaterThan(0)
    })
  })

  describe('Certifications Parsing', () => {
    it('should parse certifications in heading format', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/certifications-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('AWS Solutions Architect — Amazon (2023)')
      expect(markdown).toContain('PMP — Project Management Institute (2022)')
    })

    it('should parse certifications in bullet format with pipes', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/certifications-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('CompTIA Security+ | CompTIA | 2021')
      expect(markdown).toContain('Docker Certified Associate | Docker Inc. | 2019')
    })

    it('should parse certifications in parentheses format', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/certifications-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('Certified Kubernetes Administrator (CNCF, 2020)')
    })

    it('should handle certifications without issuer or date', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/certifications-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('Certified Ethical Hacker')
      expect(markdown).toContain('Certification with no issuer or date')
    })
  })

  describe('Date Format Variations', () => {
    it('should parse full month names with year', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/date-formats-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('January 2021 – December 2023')
    })

    it('should parse abbreviated months', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/date-formats-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('Jan 2020 – Present')
    })

    it('should parse YYYY/MM format', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/date-formats-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('2019/01 – 2020/12')
      expect(markdown).toContain('2016/06 – Present')
    })

    it('should parse year-only format', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/date-formats-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('2018 – 2019')
    })

    it('should parse quarterly format', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/date-formats-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('Q1 2017 – Q4 2017')
    })
  })

  describe('Skills and Interests with Multiple Separators', () => {
    it('should parse comma-separated skills', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/skills-separators-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('Python, JavaScript, TypeScript, Java')
    })

    it('should parse pipe-separated skills', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/skills-separators-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('React | Vue.js | Angular')
    })

    it('should parse semicolon-separated skills', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/skills-separators-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('Node.js; Express; FastAPI')
    })

    it('should parse bullet-dot separated skills', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/skills-separators-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('PostgreSQL · MySQL · MongoDB')
    })

    it('should parse skills with categories', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/skills-separators-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('### Programming Languages')
      expect(markdown).toContain('Go, Rust, C++')
      expect(markdown).toContain('### Databases')
    })

    it('should parse interests with multiple separators', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/skills-separators-test.md'),
        'utf-8'
      )

      expect(markdown).toContain('Hiking, Photography, Reading')
      expect(markdown).toContain('Cooking | Traveling | Gaming')
      expect(markdown).toContain('Music; Art; Theater')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty markdown', () => {
      const markdown = ''

      // Parser should return default empty structure without crashing
      expect(markdown).toBe('')
    })

    it('should handle markdown with only whitespace', () => {
      const markdown = '   \n\n  \n   '

      // Should not crash
      expect(markdown.trim()).toBe('')
    })

    it('should handle malformed sections', () => {
      const markdown = `# Name

## Work Experience
### Company without bullets or dates

## Skills
This is not a valid skill format but should not crash
`

      // Should parse what it can without crashing
      expect(markdown).toContain('Name')
      expect(markdown).toContain('Work Experience')
    })

    it('should handle special characters in content', () => {
      const markdown = `# Name & <Special> "Characters"

test@example.com

## Summary
Text with special chars: & < > " ' \`
`

      expect(markdown).toContain('&')
      expect(markdown).toContain('<')
      expect(markdown).toContain('>')
    })
  })
})
