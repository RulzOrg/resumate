import { describe, it, expect, vi } from 'vitest'

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))
vi.mock('docx', () => ({
  Document: class {},
  Packer: { toBlob: vi.fn() },
  Paragraph: class {},
  TextRun: class {},
  HeadingLevel: {},
  AlignmentType: {}
}))

import { parseMarkdownToStructured } from '@/components/optimization/structured-resume-editor'

const fencedSample = `"```markdown
# Alex Example

alex@example.com | +1 (555) 000-0000 | linkedin.com/in/alexexample | Remote

## Professional Summary

Seasoned engineering leader focused on building resilient data platforms for AI products.

## Work Experience

- Lead Software Engineer — Example Corp
- Jan 2021 – Present | Remote

• Built global-scale data pipelines supporting 20+ product teams
• Led cross-functional initiatives that reduced incident response time by 35%

- Example Corp — Head of Design
- 2018 – 2020 | London, UK

• Directed a distributed team of 12 product designers across 3 regions
• Partnered with engineering to launch a refreshed design system

## Education

- Master of Science in Computer Science — Example University
- 2014 - 2016 | Boston, MA
- GPA: 3.9
- Dean's List (2015, 2016)

## Certifications

- AWS Certified Solutions Architect — AWS (2023)

## Skills

• Python, TypeScript, React, AWS

## Interests

• Mentoring, Hiking
```"`

describe('parseMarkdownToStructured', () => {
  it('parses resumes wrapped in quotes and code fences with bullet metadata lines', () => {
    const result = parseMarkdownToStructured(fencedSample)

    expect(result.contactInfo.firstName).toBe('Alex')
    expect(result.contactInfo.lastName).toBe('Example')

    expect(result.summaries).toHaveLength(1)
    expect(result.summaries[0]?.text).toContain('Seasoned engineering leader')

    expect(result.workExperience).toHaveLength(2)

    const firstExperience = result.workExperience[0]
    expect(firstExperience.role).toBe('Lead Software Engineer')
    expect(firstExperience.company).toBe('Example Corp')
    expect(firstExperience.dates).toBe('Jan 2021 – Present')
    expect(firstExperience.location).toBe('Remote')
    expect(firstExperience.bullets).toHaveLength(2)
    expect(firstExperience.bullets[0]?.text).toContain('data pipelines')

    const secondExperience = result.workExperience[1]
    expect(secondExperience.role).toBe('Head of Design')
    expect(secondExperience.company).toBe('Example Corp')
    expect(secondExperience.dates).toBe('2018 – 2020')
    expect(secondExperience.location).toBe('London, UK')
    expect(secondExperience.bullets[0]?.text).toContain('design system')

    expect(result.education).toHaveLength(1)
    const education = result.education[0]
    expect(education.institution).toBe('Example University')
    expect(education.degree).toBe('Master of Science')
    expect(education.field).toBe('Computer Science')
    expect(education.start).toBe('2014')
    expect(education.end).toBe('2016')
    expect(education.location).toBe('Boston, MA')
    expect(education.gpa).toBe('3.9')
    expect(education.notes).toContain("Dean's List")

    expect(result.certifications).toHaveLength(1)
    expect(result.certifications[0]?.name).toBe('AWS Certified Solutions Architect')
    expect(result.certifications[0]?.issuer).toBe('AWS')
    expect(result.certifications[0]?.date).toBe('2023')

    const skillNames = result.skills.map(skill => skill.name)
    expect(skillNames).toEqual(expect.arrayContaining(['Python', 'TypeScript', 'React', 'AWS']))

    const interestNames = result.interests.map(interest => interest.name)
    expect(interestNames).toEqual(expect.arrayContaining(['Mentoring', 'Hiking']))
  })
})
