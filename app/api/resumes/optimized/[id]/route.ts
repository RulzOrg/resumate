import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOptimizedResumeById, updateOptimizedResume, getOrCreateUser } from "@/lib/db"
import { handleApiError, AppError } from "@/lib/error-handler"
import type { ParsedResume } from "@/lib/resume-parser"

/**
 * Convert parsed resume data back to markdown format
 */
function resumeDataToMarkdown(data: ParsedResume): string {
  const lines: string[] = []

  // Name/Header
  if (data.contact.name) {
    lines.push(`# ${data.contact.name}`)
    lines.push("")
  }

  // Contact info
  const contactParts: string[] = []
  if (data.contact.location) contactParts.push(data.contact.location)
  if (data.contact.phone) contactParts.push(data.contact.phone)
  if (data.contact.email) contactParts.push(data.contact.email)
  if (data.contact.linkedin) contactParts.push(data.contact.linkedin)
  if (data.contact.website) contactParts.push(data.contact.website)
  
  if (contactParts.length > 0) {
    lines.push(contactParts.join(" | "))
    lines.push("")
  }

  // Target Title
  if (data.targetTitle) {
    lines.push(`**${data.targetTitle}**`)
    lines.push("")
  }

  // Professional Summary
  if (data.summary) {
    lines.push("## Professional Summary")
    lines.push("")
    lines.push(data.summary)
    lines.push("")
  }

  // Work Experience
  if (data.workExperience.length > 0) {
    lines.push("## Work Experience")
    lines.push("")

    for (const exp of data.workExperience) {
      lines.push(`### ${exp.company}`)
      
      const titleParts: string[] = []
      if (exp.title) titleParts.push(`**${exp.title}**`)
      if (exp.employmentType) titleParts.push(exp.employmentType)
      if (titleParts.length > 0) {
        lines.push(titleParts.join(" | "))
      }

      const dateParts: string[] = []
      if (exp.startDate) dateParts.push(exp.startDate)
      if (exp.endDate) dateParts.push(exp.endDate)
      if (dateParts.length > 0 || exp.location) {
        const dateStr = dateParts.join(" - ")
        lines.push(`*${dateStr}${exp.location ? ` | ${exp.location}` : ""}*`)
      }

      lines.push("")

      for (const bullet of exp.bullets) {
        lines.push(`- ${bullet}`)
      }
      lines.push("")
    }
  }

  // Education
  if (data.education.length > 0) {
    lines.push("## Education")
    lines.push("")

    for (const edu of data.education) {
      lines.push(`### ${edu.institution}`)
      if (edu.degree) lines.push(`**${edu.degree}**`)
      if (edu.field) lines.push(edu.field)
      if (edu.graduationDate) lines.push(`*${edu.graduationDate}*`)
      if (edu.notes) lines.push(edu.notes)
      lines.push("")
    }
  }

  // Skills
  if (data.skills.length > 0) {
    lines.push("## Skills")
    lines.push("")
    lines.push(data.skills.join(", "))
    lines.push("")
  }

  // Certifications
  if (data.certifications.length > 0) {
    lines.push("## Certifications")
    lines.push("")
    for (const cert of data.certifications) {
      lines.push(`- ${cert.name}${cert.issuer ? ` - ${cert.issuer}` : ""}`)
    }
    lines.push("")
  }

  // Projects
  if (data.projects.length > 0) {
    lines.push("## Projects")
    lines.push("")
    for (const project of data.projects) {
      lines.push(`### ${project.name}`)
      if (project.description) lines.push(project.description)
      for (const bullet of project.bullets) {
        lines.push(`- ${bullet}`)
      }
      lines.push("")
    }
  }

  // Awards
  if (data.awards.length > 0) {
    lines.push("## Awards & Scholarships")
    lines.push("")
    for (const award of data.awards) {
      lines.push(`- ${award}`)
    }
    lines.push("")
  }

  // Volunteering
  if (data.volunteering.length > 0) {
    lines.push("## Volunteering & Leadership")
    lines.push("")
    for (const vol of data.volunteering) {
      lines.push(`### ${vol.organization}`)
      if (vol.role) lines.push(vol.role)
      if (vol.dates) lines.push(`*${vol.dates}*`)
      if (vol.description) lines.push(vol.description)
      lines.push("")
    }
  }

  // Publications
  if (data.publications.length > 0) {
    lines.push("## Publications")
    lines.push("")
    for (const pub of data.publications) {
      lines.push(`- ${pub.title}${pub.publisher ? ` - ${pub.publisher}` : ""}`)
    }
    lines.push("")
  }

  // Interests
  if (data.interests.length > 0) {
    lines.push("## Interests")
    lines.push("")
    lines.push(data.interests.join(", "))
    lines.push("")
  }

  return lines.join("\n")
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const { id } = await params
    const optimized = await getOptimizedResumeById(id, user.id)

    if (!optimized) {
      throw new AppError("Optimized resume not found", 404)
    }

    return NextResponse.json({ optimized_resume: optimized })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const { id } = await params
    const body = await request.json()

    // Get existing resume to verify ownership
    const existing = await getOptimizedResumeById(id, user.id)
    if (!existing) {
      throw new AppError("Optimized resume not found", 404)
    }

    // Convert parsed resume data to markdown
    let optimizedContent = existing.optimized_content
    if (body.resumeData) {
      optimizedContent = resumeDataToMarkdown(body.resumeData as ParsedResume)
    }

    // Update the resume
    const updated = await updateOptimizedResume(id, user.id, {
      optimized_content: optimizedContent,
      match_score: body.match_score,
    })

    if (!updated) {
      throw new AppError("Failed to update resume", 500)
    }

    return NextResponse.json({
      success: true,
      optimized_resume: updated,
    })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
