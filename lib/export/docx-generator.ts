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
  NumberFormat,
} from "docx"
import type { ResumeJSON } from "@/lib/schemas-v2"

/**
 * Options for DOCX generation
 * @property fileName - Suggested file name (stored in document metadata)
 * @property includePageNumbers - If true, adds "Page X of Y" footer to document
 */
interface DOCXOptions {
  fileName?: string
  includePageNumbers?: boolean
}

/**
 * Generates a DOCX file from structured resume JSON
 * Follows ATS best practices:
 * - Single column layout
 * - Standard fonts (Arial)
 * - No tables, text boxes, or images
 * - Clear section headers
 * - Consistent formatting
 * 
 * @param resumeData - Structured resume data conforming to ResumeJSON schema
 * @param options - Optional configuration (fileName, includePageNumbers)
 * @returns Buffer containing the generated DOCX file
 */
export async function generateDOCX(
  resumeData: ResumeJSON,
  options: DOCXOptions = {}
): Promise<Buffer> {
  const { fileName, includePageNumbers = false } = options
  const sections: Paragraph[] = []

  // ============================================================================
  // HEADER - Name & Contact Info
  // ============================================================================
  
  // Name (large, bold)
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: resumeData.name,
          bold: true,
          size: 32, // 16pt
          font: "Arial",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  )

  // Contact line
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
          size: 20, // 10pt
          font: "Arial",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    })
  )

  // ============================================================================
  // TARGET HEADLINE (if present)
  // ============================================================================
  
  if (resumeData.headline) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.headline.toUpperCase(),
            bold: true,
            size: 24, // 12pt
            font: "Arial",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      })
    )
  }

  // ============================================================================
  // PROFESSIONAL SUMMARY
  // ============================================================================
  
  if (resumeData.summary) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL SUMMARY",
            bold: true,
            size: 24,
            font: "Arial",
            underline: {
              type: UnderlineType.SINGLE,
            },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    )

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.summary,
            size: 22, // 11pt
            font: "Arial",
          }),
        ],
        spacing: { after: 240 },
        alignment: AlignmentType.JUSTIFIED,
      })
    )
  }

  // ============================================================================
  // SKILLS (Grouped by Category)
  // ============================================================================
  
  const hasSkills = Object.values(resumeData.skills).some((arr) => arr.length > 0)
  
  if (hasSkills) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "SKILLS",
            bold: true,
            size: 24,
            font: "Arial",
            underline: {
              type: UnderlineType.SINGLE,
            },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    )

    // Skills grouped by category
    Object.entries(resumeData.skills).forEach(([key, skills]) => {
      if (skills && skills.length > 0) {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .trim()
          .replace(/^./, (c) => c.toUpperCase())
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${label}: `,
                bold: true,
                size: 22,
                font: "Arial",
              }),
              new TextRun({
                text: skills.join(", "),
                size: 22,
                font: "Arial",
              }),
            ],
            spacing: { after: 120 },
          })
        )
      }
    })

    // Add spacing after skills section
    sections.push(
      new Paragraph({
        text: "",
        spacing: { after: 120 },
      })
    )
  }

  // ============================================================================
  // WORK EXPERIENCE
  // ============================================================================
  
  if (resumeData.experience && resumeData.experience.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "WORK EXPERIENCE",
            bold: true,
            size: 24,
            font: "Arial",
            underline: {
              type: UnderlineType.SINGLE,
            },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    )

    resumeData.experience.forEach((exp, index) => {
      // Company & Location
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.company} — ${exp.location}`,
              bold: true,
              size: 22,
              font: "Arial",
            }),
          ],
          spacing: { before: index > 0 ? 240 : 120, after: 60 },
        })
      )

      // Job Title & Dates
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.title,
              italics: true,
              size: 22,
              font: "Arial",
            }),
            new TextRun({
              text: ` | ${exp.start_date} – ${exp.end_date}`,
              size: 22,
              font: "Arial",
            }),
          ],
          spacing: { after: 120 },
        })
      )

      // Bullets
      exp.bullets.forEach((bullet) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: bullet,
                size: 22,
                font: "Arial",
              }),
            ],
            bullet: {
              level: 0,
            },
            spacing: { after: 60 },
            indent: {
              left: convertInchesToTwip(0.25),
              hanging: convertInchesToTwip(0.25),
            },
          })
        )
      })
    })
  }

  // ============================================================================
  // EDUCATION
  // ============================================================================
  
  if (resumeData.education && resumeData.education.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "EDUCATION",
            bold: true,
            size: 24,
            font: "Arial",
            underline: {
              type: UnderlineType.SINGLE,
            },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    )

    resumeData.education.forEach((edu) => {
      // Degree & Institution
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${edu.degree} — ${edu.institution}`,
              bold: true,
              size: 22,
              font: "Arial",
            }),
          ],
          spacing: { after: 60 },
        })
      )

      // Notes (GPA, honors, etc.)
      if (edu.notes) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.notes,
                size: 22,
                font: "Arial",
              }),
            ],
            spacing: { after: 120 },
          })
        )
      } else {
        sections.push(
          new Paragraph({
            text: "",
            spacing: { after: 120 },
          })
        )
      }
    })
  }

  // ============================================================================
  // CERTIFICATIONS
  // ============================================================================
  
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "CERTIFICATIONS",
            bold: true,
            size: 24,
            font: "Arial",
            underline: {
              type: UnderlineType.SINGLE,
            },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    )

    resumeData.certifications.forEach((cert) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${cert.name} — ${cert.issuer}`,
              size: 22,
              font: "Arial",
            }),
          ],
          spacing: { after: 60 },
        })
      )
    })

    sections.push(
      new Paragraph({
        text: "",
        spacing: { after: 120 },
      })
    )
  }

  // ============================================================================
  // EXTRAS (Languages, Interests, etc.)
  // ============================================================================
  
  if (resumeData.extras && resumeData.extras.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "ADDITIONAL",
            bold: true,
            size: 24,
            font: "Arial",
            underline: {
              type: UnderlineType.SINGLE,
            },
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    )

    resumeData.extras.forEach((extra) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${extra.label}: `,
              bold: true,
              size: 22,
              font: "Arial",
            }),
            new TextRun({
              text: extra.value,
              size: 22,
              font: "Arial",
            }),
          ],
          spacing: { after: 60 },
        })
      )
    })
  }

  // ============================================================================
  // CREATE DOCUMENT
  // ============================================================================
  
  // Optional footer with page numbers
  const footers = includePageNumbers
    ? {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                  size: 18, // 9pt
                  font: "Arial",
                }),
              ],
            }),
          ],
        }),
      }
    : undefined

  const doc = new Document({
    // Document metadata
    ...(fileName && {
      creator: "AI Resume Optimizer",
      title: fileName.replace(/\.\w+$/, ""), // Remove extension
      description: "Resume optimized by AI Resume Optimizer",
    }),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        ...(footers && { footers }),
        children: sections,
      },
    ],
  })

  // Generate buffer
  const buffer = await Packer.toBuffer(doc)
  return buffer
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
  const { fileName, includePageNumbers = false } = options
  const sections: Paragraph[] = []

  // Parse markdown into paragraphs
  const lines = markdownContent.split("\n")
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      // Empty line - add spacing
      sections.push(new Paragraph({ text: "", spacing: { after: 120 } }))
      continue
    }
    
    // H1 headers (# Header)
    if (trimmedLine.startsWith("# ")) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(2),
              bold: true,
              size: 32, // 16pt
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        })
      )
      continue
    }
    
    // H2 headers (## Header)
    if (trimmedLine.startsWith("## ")) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(3).toUpperCase(),
              bold: true,
              size: 24, // 12pt
              font: "Arial",
              underline: { type: UnderlineType.SINGLE },
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      )
      continue
    }
    
    // H3 headers (### Header)
    if (trimmedLine.startsWith("### ")) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(4),
              bold: true,
              size: 22, // 11pt
              font: "Arial",
            }),
          ],
          spacing: { before: 180, after: 60 },
        })
      )
      continue
    }
    
    // Bullet points (- item or * item)
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(2),
              size: 22,
              font: "Arial",
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: 60 },
          indent: {
            left: convertInchesToTwip(0.25),
            hanging: convertInchesToTwip(0.25),
          },
        })
      )
      continue
    }
    
    // Bold text (**text**)
    const boldPattern = /\*\*([^*]+)\*\*/g
    const hasBold = boldPattern.test(trimmedLine)
    
    if (hasBold) {
      const children: TextRun[] = []
      let lastIndex = 0
      let match
      
      boldPattern.lastIndex = 0 // Reset regex
      while ((match = boldPattern.exec(trimmedLine)) !== null) {
        // Add text before bold
        if (match.index > lastIndex) {
          children.push(
            new TextRun({
              text: trimmedLine.substring(lastIndex, match.index),
              size: 22,
              font: "Arial",
            })
          )
        }
        // Add bold text
        children.push(
          new TextRun({
            text: match[1],
            bold: true,
            size: 22,
            font: "Arial",
          })
        )
        lastIndex = match.index + match[0].length
      }
      // Add remaining text
      if (lastIndex < trimmedLine.length) {
        children.push(
          new TextRun({
            text: trimmedLine.substring(lastIndex),
            size: 22,
            font: "Arial",
          })
        )
      }
      
      sections.push(
        new Paragraph({
          children,
          spacing: { after: 120 },
        })
      )
      continue
    }
    
    // Regular paragraph
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 22, // 11pt
            font: "Arial",
          }),
        ],
        spacing: { after: 120 },
      })
    )
  }

  // Optional footer with page numbers
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
                  font: "Arial",
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
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.75),
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
