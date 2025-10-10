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
} from "docx"
import type { ResumeJSON } from "@/lib/schemas-v2"

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
 */
export async function generateDOCX(
  resumeData: ResumeJSON,
  options: DOCXOptions = {}
): Promise<Buffer> {
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
        text: "PROFESSIONAL SUMMARY",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        bold: true,
        underline: {
          type: UnderlineType.SINGLE,
        },
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
        text: "SKILLS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        bold: true,
        underline: {
          type: UnderlineType.SINGLE,
        },
      })
    )

    // Skills grouped by category
    const skillCategories = [
      { key: "Domain" as const, label: "Domain Expertise" },
      { key: "ResearchAndValidation" as const, label: "Research & Validation" },
      { key: "ProductAndSystems" as const, label: "Product & Systems" },
      { key: "Tools" as const, label: "Tools & Platforms" },
    ]

    skillCategories.forEach((category) => {
      const skills = resumeData.skills[category.key]
      if (skills && skills.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${category.label}: `,
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
        text: "WORK EXPERIENCE",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        bold: true,
        underline: {
          type: UnderlineType.SINGLE,
        },
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
              italic: true,
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
        text: "EDUCATION",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        bold: true,
        underline: {
          type: UnderlineType.SINGLE,
        },
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
        text: "CERTIFICATIONS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        bold: true,
        underline: {
          type: UnderlineType.SINGLE,
        },
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
        text: "ADDITIONAL",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        bold: true,
        underline: {
          type: UnderlineType.SINGLE,
        },
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
  
  const doc = new Document({
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
        children: sections,
      },
    ],
  })

  // Generate buffer
  const buffer = await Packer.toBuffer(doc)
  return buffer
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
