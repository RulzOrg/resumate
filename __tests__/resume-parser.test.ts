import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

import { parseMarkdownToStructured } from '@/components/optimization/structured-resume-editor'

describe('Resume Parser', () => {
  describe('Complete Resume', () => {
    it('parses all sections and contact info from complete resume', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/complete-resume.md'),
        'utf-8'
      )

      const parsed = parseMarkdownToStructured(markdown)

      expect(parsed.contactInfo.firstName).toBe('John')
      expect(parsed.contactInfo.lastName).toBe('Doe')
      expect(parsed.contactInfo.email).toBe('john.doe@email.com')
      expect(parsed.contactInfo.phone).toContain('555')
      expect(parsed.contactInfo.linkedin).toContain('linkedin.com/in/johndoe')
      expect(parsed.contactInfo.location).toContain('San Francisco')

      expect(parsed.summaries.length).toBeGreaterThan(0)
      expect(parsed.summaries[0]?.text || '').toMatch(/Experienced software engineer/i)

      expect(parsed.workExperience.length).toBeGreaterThanOrEqual(3)
      const companyNames = parsed.workExperience.map(w => w.company)
      expect(companyNames).toEqual(
        expect.arrayContaining(['TechCorp Inc.', 'StartupXYZ', 'DevAgency'])
      )

      const firstExp = parsed.workExperience[0]
      expect(firstExp.role || '').toMatch(/Senior Software Engineer/i)
      expect(firstExp.company).toBe('TechCorp Inc.')
      expect(firstExp.dates || '').toMatch(/January 2021|2021|Present/)
      expect(firstExp.location || '').toMatch(/San Francisco/i)
      expect(firstExp.bullets.length).toBeGreaterThanOrEqual(3)

      expect(parsed.education.length).toBeGreaterThanOrEqual(2)
      const eduText = parsed.education.map(e => `${e.degree} ${e.field} ${e.institution}`).join(' ')
      expect(eduText).toMatch(/Stanford University/i)
      expect(eduText).toMatch(/MIT/i)
      const gpas = parsed.education.map(e => e.gpa).filter(Boolean)
      expect(gpas.join(' ')).toMatch(/3\.8|3\.9/)

      expect(parsed.certifications.length).toBeGreaterThanOrEqual(3)
      const certNames = parsed.certifications.map(c => c.name)
      expect(certNames).toEqual(
        expect.arrayContaining([
          'AWS Certified Solutions Architect',
          'Google Cloud Professional Developer'
        ])
      )

      const skillNames = parsed.skills.map(s => s.name)
      expect(skillNames).toEqual(
        expect.arrayContaining(['Python', 'JavaScript', 'TypeScript', 'React'])
      )

      const interestNames = parsed.interests.map(i => i.name)
      expect(interestNames.length).toBeGreaterThanOrEqual(3)
      expect(interestNames).toEqual(
        expect.arrayContaining(['Open source contribution', 'Hiking', 'Photography'])
      )
    })
  })

  describe('Minimal Resume', () => {
    it('handles minimal resume with only name, email, and summary', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/minimal-resume.md'),
        'utf-8'
      )

      const parsed = parseMarkdownToStructured(markdown)
      expect(parsed.contactInfo.firstName).toBe('Jane')
      expect(parsed.contactInfo.lastName).toBe('Smith')
      expect(parsed.contactInfo.email).toBe('jane.smith@example.com')
      expect(parsed.summaries.length).toBeGreaterThan(0)
      expect(parsed.workExperience.length).toBe(0)
      expect(parsed.education.length).toBe(0)
      expect(parsed.certifications.length).toBe(0)
      expect(parsed.skills.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Certifications Parsing', () => {
    it('parses multiple certification formats', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/certifications-test.md'),
        'utf-8'
      )

      const parsed = parseMarkdownToStructured(markdown)
      const certByName = (name: string) => parsed.certifications.find(c => c.name?.includes(name))

      expect(certByName('AWS Solutions Architect')?.issuer).toMatch(/Amazon/i)
      expect(certByName('AWS Solutions Architect')?.date || '').toMatch(/2023/)
      expect(certByName('PMP')?.issuer).toMatch(/Project Management Institute/i)
      expect(certByName('PMP')?.date || '').toMatch(/2022/)
      expect(certByName('CompTIA Security\+')?.issuer).toMatch(/CompTIA/i)
      expect(certByName('CompTIA Security\+')?.date || '').toMatch(/2021/)
      expect(certByName('Kubernetes Administrator')?.issuer || '').toMatch(/CNCF/i)
      expect(certByName('Docker Certified Associate')?.issuer || '').toMatch(/Docker/i)

      // Handle entries without issuer or date
      expect(certByName('Certified Ethical Hacker')).toBeTruthy()
      expect(certByName('Certification with no issuer or date')).toBeTruthy()
    })
  })

  describe('Date Format Variations', () => {
    it('captures various date formats into experience entries', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/date-formats-test.md'),
        'utf-8'
      )

      const parsed = parseMarkdownToStructured(markdown)
      expect(parsed.workExperience.length).toBeGreaterThanOrEqual(6)
      const dates = parsed.workExperience.map(w => w.dates || '')
      expect(dates.join(' \n')).toContain('January 2021 – December 2023')
      expect(dates.join(' \n')).toContain('Jan 2020 – Present')
      expect(dates.join(' \n')).toContain('2019/01 – 2020/12')
      expect(dates.join(' \n')).toContain('2018 – 2019')
      expect(dates.join(' \n')).toContain('Q1 2017 – Q4 2017')
      expect(dates.join(' \n')).toContain('2016/06 – Present')
    })
  })

  describe('Skills and Interests with Multiple Separators', () => {
    it('parses skills across separators and categories and interests', () => {
      const markdown = fs.readFileSync(
        path.join(__dirname, 'fixtures/resumes/skills-separators-test.md'),
        'utf-8'
      )

      const parsed = parseMarkdownToStructured(markdown)
      const skills = parsed.skills.map(s => s.name)
      expect(skills).toEqual(
        expect.arrayContaining([
          'Python',
          'JavaScript',
          'TypeScript',
          'Java',
          'React',
          'Vue.js',
          'Angular',
          'Node.js',
          'Express',
          'FastAPI',
          'Go',
          'Rust',
          'C++',
          'PostgreSQL',
          'MySQL',
          'MongoDB'
        ])
      )

      const interests = parsed.interests.map(i => i.name)
      expect(interests).toEqual(
        expect.arrayContaining([
          'Hiking',
          'Photography',
          'Reading',
          'Cooking',
          'Traveling',
          'Gaming',
          'Music',
          'Art',
          'Theater'
        ])
      )
    })
  })

  describe('Error Handling', () => {
    it('returns empty structure for empty markdown', () => {
      const parsed = parseMarkdownToStructured('')
      expect(parsed.contactInfo.email).toBe('')
      expect(parsed.summaries.length).toBe(0)
      expect(parsed.workExperience.length).toBe(0)
      expect(parsed.education.length).toBe(0)
      expect(parsed.certifications.length).toBe(0)
      expect(parsed.skills.length).toBe(0)
      expect(parsed.interests.length).toBe(0)
    })

    it('ignores whitespace-only input', () => {
      const parsed = parseMarkdownToStructured('   \n\n  \n   ')
      expect(parsed.summaries.length).toBe(0)
      expect(parsed.workExperience.length).toBe(0)
    })

    it('handles malformed sections gracefully', () => {
      const markdown = `# Name

## Work Experience
### Company without bullets or dates

## Skills
This is not a valid skill format but should not crash
`
      const parsed = parseMarkdownToStructured(markdown)
      expect(parsed.contactInfo.firstName).toBe('Name')
      expect(parsed.workExperience.length).toBeGreaterThanOrEqual(0)
      expect(parsed.skills.length).toBeGreaterThanOrEqual(0)
    })

    it('does not drop special characters', () => {
      const markdown = `# Name & <Special> "Characters"

test@example.com

## Summary
Text with special chars: & < > " ' \``
      const parsed = parseMarkdownToStructured(markdown)
      const text = parsed.summaries[0]?.text || ''
      expect(text).toContain('&')
      expect(text).toContain('<')
      expect(text).toContain('>')
    })
  })
})
