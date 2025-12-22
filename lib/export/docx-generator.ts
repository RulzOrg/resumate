/**
 * DOCX Generator Service
 * Creates ATS-friendly Microsoft Word documents with single-column layout
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  UnderlineType,
  Footer,
  PageNumber,
} from "docx"
import type { ResumeJSON } from "@/lib/schemas-v2"

/**
 * Layout types for resume generation
 */
export type ResumeLayout = 'classic' | 'modern' | 'compact';

/**
 * Configuration for different layouts
 */
const LAYOUT_CONFIG = {
  classic: {
    font: "Times New Roman",
    baseSize: 22, // 11pt
    h1Size: 32,   // 16pt
    h2Size: 24,   // 12pt
    h3Size: 22,   // 11pt
    spacing: 120,
    margin: 0.75,
  },
  modern: {
    font: "Arial",
    baseSize: 20, // 10pt
    h1Size: 28,   // 14pt
    h2Size: 22,   // 11pt
    h3Size: 20,   // 10pt
    spacing: 160,
    margin: 0.75,
  },
  compact: {
    font: "Calibri",
    baseSize: 18, // 9pt
    h1Size: 24,   // 12pt
    h2Size: 20,   // 10pt
    h3Size: 18,   // 9pt
    spacing: 80,
    margin: 0.5,
  }
};

/**
 * Options for DOCX generation
 * @property fileName - Suggested file name (stored in document metadata)
 * @property includePageNumbers - If true, adds "Page X of Y" footer to document
 * @property layout - Visual style preset
 */
export interface DOCXOptions {
  fileName?: string
  includePageNumbers?: boolean
  layout?: ResumeLayout
}

/**
 * Generates a DOCX file from structured resume JSON
 * 
 * @param resumeData - Structured resume data conforming to ResumeJSON schema
 * @param options - Optional configuration (fileName, includePageNumbers, layout)
 * @returns Buffer containing the generated DOCX file
 */
export async function generateDOCX(
  resumeData: ResumeJSON,
  options: DOCXOptions = {}
): Promise<Buffer> {
  const { fileName, includePageNumbers = false, layout = 'modern' } = options
  const config = LAYOUT_CONFIG[layout]
  const sections: Paragraph[] = []

  // HEADER - Name & Contact Info
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: resumeData.name,
          bold: true,
          size: config.h1Size,
          font: config.font,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: config.spacing },
    })
  )

  const contactParts = [
    resumeData.contact.location,
    resumeData.contact.email,
    resumeData.contact.phone,
    resumeData.contact.linkedin,
  ].filter(Boolean)

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contactParts.join(" | "),
          size: config.baseSize,
          font: config.font,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: config.spacing * 2 },
    })
  )
  
  if (resumeData.headline) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.headline.toUpperCase(),
            bold: true,
            size: config.h2Size,
            font: config.font,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: config.spacing * 2 },
      })
    )
  }

  // PROFESSIONAL SUMMARY
  if (resumeData.summary) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL SUMMARY",
            bold: true,
            size: config.h2Size,
            font: config.font,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: config.spacing * 2, after: config.spacing },
      })
    )

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.summary,
            size: config.baseSize,
            font: config.font,
          }),
        ],
        spacing: { after: config.spacing * 2 },
        alignment: AlignmentType.JUSTIFIED,
      })
    )
  }

  // SKILLS
  const hasSkills = Object.values(resumeData.skills).some((arr) => arr.length > 0)
  if (hasSkills) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "SKILLS",
            bold: true,
            size: config.h2Size,
            font: config.font,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: config.spacing * 2, after: config.spacing },
      })
    )

    Object.entries(resumeData.skills).forEach(([key, skills]) => {
      if (skills && skills.length > 0) {
        const label = key.replace(/([A-Z])/g, " $1").trim().replace(/^./, (c) => c.toUpperCase())
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: config.baseSize, font: config.font }),
              new TextRun({ text: skills.join(", "), size: config.baseSize, font: config.font }),
            ],
            spacing: { after: config.spacing },
          })
        )
      }
    })
  }

  // WORK EXPERIENCE
  if (resumeData.experience && resumeData.experience.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "WORK EXPERIENCE",
            bold: true,
            size: config.h2Size,
            font: config.font,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: config.spacing * 2, after: config.spacing },
      })
    )

    resumeData.experience.forEach((exp, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.company} — ${exp.location}`,
              bold: true,
              size: config.baseSize,
              font: config.font,
            }),
          ],
          spacing: { before: index > 0 ? config.spacing * 2 : config.spacing, after: config.spacing / 2 },
        })
      )

      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.title, italics: true, size: config.baseSize, font: config.font }),
            new TextRun({ text: ` | ${exp.start_date} – ${exp.end_date}`, size: config.baseSize, font: config.font }),
          ],
          spacing: { after: config.spacing },
        })
      )

      exp.bullets.forEach((bullet) => {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: bullet, size: config.baseSize, font: config.font })],
            bullet: { level: 0 },
            spacing: { after: config.spacing / 2 },
            indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
          })
        )
      })
    })
  }

  // EDUCATION
  if (resumeData.education && resumeData.education.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "EDUCATION",
            bold: true,
            size: config.h2Size,
            font: config.font,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: config.spacing * 2, after: config.spacing },
      })
    )

    resumeData.education.forEach((edu) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${edu.degree} — ${edu.institution}`,
              bold: true,
              size: config.baseSize,
              font: config.font,
            }),
          ],
          spacing: { after: config.spacing / 2 },
        })
      )

      if (edu.notes) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: edu.notes, size: config.baseSize, font: config.font })],
            spacing: { after: config.spacing },
          })
        )
      }
    })
  }

  // CREATE DOCUMENT
  const footers = includePageNumbers
    ? {
        default: new Footer({
          children: [
      new Paragraph({
              alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
                  children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                  size: 18,
                  font: config.font,
                }),
              ],
            }),
          ],
        }),
      }
    : undefined

  const doc = new Document({
    ...(fileName && {
      creator: "AI Resume Optimizer",
      title: fileName.replace(/\.\w+$/, ""),
      description: "Resume optimized by AI Resume Optimizer",
    }),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(config.margin),
              right: convertInchesToTwip(config.margin),
              bottom: convertInchesToTwip(config.margin),
              left: convertInchesToTwip(config.margin),
            },
          },
        },
        ...(footers && { footers }),
        children: sections,
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

/**
 * Generate a simple DOCX from markdown content
 * For MVP - works without structured ResumeJSON
 */
export async function generateDOCXFromMarkdown(
  markdownContent: string,
  title: string,
  options: DOCXOptions = {}
): Promise<Buffer> {
  const { fileName, includePageNumbers = false, layout = 'modern' } = options
  const config = LAYOUT_CONFIG[layout]
  const sections: Paragraph[] = []

  const lines = markdownContent.split("\n")
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      sections.push(new Paragraph({ text: "", spacing: { after: config.spacing } }))
      continue
    }
    
    if (trimmedLine.startsWith("# ")) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(2),
              bold: true,
              size: config.h1Size,
              font: config.font,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: config.spacing * 2 },
        })
      )
      continue
    }
    
    if (trimmedLine.startsWith("## ")) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
              text: trimmedLine.substring(3).toUpperCase(),
            bold: true,
              size: config.h2Size,
              font: config.font,
              underline: { type: UnderlineType.SINGLE },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
          spacing: { before: config.spacing * 2, after: config.spacing },
      })
    )
      continue
    }

    if (trimmedLine.startsWith("### ")) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(4),
              bold: true,
              size: config.h3Size,
              font: config.font,
            }),
          ],
          spacing: { before: config.spacing * 1.5, after: config.spacing / 2 },
        })
      )
      continue
    }
    
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(2),
              size: config.baseSize,
              font: config.font,
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: config.spacing / 2 },
          indent: {
            left: convertInchesToTwip(0.25),
            hanging: convertInchesToTwip(0.25),
          },
        })
      )
      continue
    }
    
    const boldPattern = /\*\*([^*]+)\*\*/g
    const hasBold = boldPattern.test(trimmedLine)
    
    if (hasBold) {
      const children: TextRun[] = []
      let lastIndex = 0
      let match
      
      boldPattern.lastIndex = 0
      while ((match = boldPattern.exec(trimmedLine)) !== null) {
        if (match.index > lastIndex) {
          children.push(
            new TextRun({
              text: trimmedLine.substring(lastIndex, match.index),
              size: config.baseSize,
              font: config.font,
            })
          )
        }
        children.push(
          new TextRun({
            text: match[1],
            bold: true,
            size: config.baseSize,
            font: config.font,
          })
        )
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < trimmedLine.length) {
        children.push(
          new TextRun({
            text: trimmedLine.substring(lastIndex),
            size: config.baseSize,
            font: config.font,
          })
        )
      }
      
      sections.push(
        new Paragraph({
          children,
          spacing: { after: config.spacing },
        })
      )
      continue
    }
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: config.baseSize,
            font: config.font,
          }),
        ],
        spacing: { after: config.spacing },
      })
    )
  }

  const footers = includePageNumbers
    ? {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                  size: 18,
                  font: config.font,
                }),
              ],
            }),
          ],
        }),
      }
    : undefined

  const doc = new Document({
    ...(fileName && {
      creator: "AI Resume Optimizer",
      title: fileName.replace(/\.\w+$/, ""),
      description: "Resume optimized by AI Resume Optimizer",
    }),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(config.margin),
              right: convertInchesToTwip(config.margin),
              bottom: convertInchesToTwip(config.margin),
              left: convertInchesToTwip(config.margin),
            },
          },
        },
        ...(footers && { footers }),
        children: sections,
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

/**
 * Generate file name following convention: FirstName_LastName_JobTitle_Company.docx
 */
export function generateFileName(
  firstName: string,
  lastName: string,
  jobTitle: string,
  company: string,
  extension: "docx" | "pdf" | "txt"
): string {
  const sanitize = (str: string) =>
    str
      .replace(/[^a-zA-Z0-9\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/_+/g, "_") // Remove duplicate underscores
      .replace(/^_|_$/g, "") // Trim underscores

  const parts = [
    sanitize(firstName),
    sanitize(lastName),
    sanitize(jobTitle),
    sanitize(company),
  ].filter(Boolean)

  return `${parts.join("_")}.${extension}`
}
