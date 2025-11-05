import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserProfile, updateUserProfile, getMasterResume, getOrCreateUser } from "@/lib/db"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"

class ApiError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message)
    this.name = 'ApiError'
  }
}

const SkillsExtractionSchema = z.object({
  technical_skills: z.array(z.string()).describe("Technical skills like programming languages, frameworks, tools"),
  soft_skills: z.array(z.string()).describe("Soft skills like leadership, communication, teamwork"),
  tools: z.array(z.string()).describe("Tools and software proficiency"),
  domain_expertise: z.array(z.string()).describe("Domain knowledge like UX design, product management, data science"),
  all_skills: z.array(z.string()).describe("Complete comprehensive list of all skills combined")
})

/**
 * GET /api/user/skills
 * Fetches user's skills from cache or extracts from master resume
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 1. Check if skills already cached in user_profile
    const profile = await getUserProfile(userId)

    // Check for categorized skills first (new format)
    if (profile?.categorized_skills) {
      const totalCount =
        profile.categorized_skills.hard.length +
        profile.categorized_skills.soft.length +
        profile.categorized_skills.other.length

      console.log('Returning cached categorized skills:', {
        hard: profile.categorized_skills.hard.length,
        soft: profile.categorized_skills.soft.length,
        other: profile.categorized_skills.other.length
      })

      return NextResponse.json({
        skills: profile.skills || [], // backward compatibility
        categorized_skills: profile.categorized_skills,
        source: "cached",
        count: totalCount
      })
    }

    // Backward compatibility: check old skills array
    if (profile?.skills && profile.skills.length > 0) {
      console.log('Returning cached skills (legacy):', { count: profile.skills.length })
      return NextResponse.json({
        skills: profile.skills,
        source: "cached",
        count: profile.skills.length
      })
    }

    // 2. Get master resume
    const masterResume = await getMasterResume(user.id)
    if (!masterResume) {
      console.log('No master resume found for user:', user.id)
      return NextResponse.json({ 
        skills: [], 
        needsProfile: true,
        message: "No master resume found. Please upload your resume to get personalized match scores."
      })
    }

    // 3. Try parsed_sections first (fast path)
    if (masterResume.parsed_sections && typeof masterResume.parsed_sections === 'object') {
      const parsedSections = masterResume.parsed_sections as Record<string, any>
      
      if (parsedSections.skills && Array.isArray(parsedSections.skills)) {
        const skills = [...new Set(
          parsedSections.skills
            .filter(s => typeof s === 'string' || (typeof s === 'object' && s.name))
            .map(s => typeof s === 'string' ? s.toLowerCase().trim() : s.name.toLowerCase().trim())
            .filter(Boolean)
        )]
        
        if (skills.length > 0) {
          console.log('Extracted skills from parsed_sections:', { count: skills.length })
          await updateUserProfile(userId, { skills })
          return NextResponse.json({ 
            skills, 
            source: "parsed_sections",
            count: skills.length
          })
        }
      }
    }

    // 4. Extract via AI from content_text (slow path)
    if (!masterResume.content_text || masterResume.content_text.trim().length < 100) {
      return NextResponse.json({ 
        skills: [], 
        needsProfile: true,
        message: "Resume content is too short. Please upload a complete resume."
      })
    }

    console.log('Extracting skills via AI from content_text')
    
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: SkillsExtractionSchema,
      prompt: `Extract ALL skills from this resume. Be comprehensive and include:

- Technical skills (programming languages, frameworks, libraries, technologies etc)
- Design skills (Figma, Sketch, Adobe XD, Phototyping, Wireframing, etc.)
- Soft skills (leadership, communication, problem-solving, etc.)
- Tools and software (Microsoft Office, Jira, Slack, etc.)
- Domain expertise (UX design, product management, data analysis, marketing, etc.)
- Methodologies (Agile, Scrum, Design Thinking, etc.)

Return a comprehensive list. Include both specific tools (e.g., "Figma") and broader skills (e.g., "UI/UX Design").

Resume:
${masterResume.content_text.slice(0, 8000)}

IMPORTANT: Be exhaustive. Extract every identifiable skill, tool, technology, or expertise area.`,
    })

    // Process and categorize skills
    const categorized_skills = {
      hard: [...new Set(object.technical_skills.concat(object.tools))]
        .map(s => s.trim())
        .filter(Boolean),
      soft: [...new Set(object.soft_skills)]
        .map(s => s.trim())
        .filter(Boolean),
      other: [...new Set(object.domain_expertise)]
        .map(s => s.trim())
        .filter(Boolean)
    }

    // Also create flat list for backward compatibility
    const skills = [...new Set(object.all_skills)]
      .map(s => s.toLowerCase().trim())
      .filter(Boolean)

    const totalCount =
      categorized_skills.hard.length +
      categorized_skills.soft.length +
      categorized_skills.other.length

    console.log('AI extracted categorized skills:', {
      hard: categorized_skills.hard.length,
      soft: categorized_skills.soft.length,
      other: categorized_skills.other.length,
      total: totalCount
    })

    // 5. Cache in user profile with both formats
    if (skills.length > 0) {
      await updateUserProfile(userId, {
        skills, // backward compatibility
        categorized_skills
      })
    }

    return NextResponse.json({
      skills, // backward compatibility
      categorized_skills,
      source: "ai_extracted",
      count: totalCount
    })
  } catch (error) {
    console.error('Error in GET /api/user/skills:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode || 500 }
    )
  }
}

/**
 * POST /api/user/skills
 * Manually update user's skills
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { skills } = body

    if (!Array.isArray(skills)) {
      throw new ApiError("Skills must be an array", 400)
    }

    const normalizedSkills = [...new Set(
      skills
        .map(s => String(s).toLowerCase().trim())
        .filter(Boolean)
    )]

    await updateUserProfile(userId, { skills: normalizedSkills })

    return NextResponse.json({ 
      success: true, 
      skills: normalizedSkills,
      count: normalizedSkills.length
    })
  } catch (error) {
    console.error('Error in POST /api/user/skills:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode || 500 }
    )
  }
}

/**
 * DELETE /api/user/skills
 * Clear cached skills (forces re-extraction)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await updateUserProfile(userId, { skills: [] })

    return NextResponse.json({ success: true, message: "Skills cache cleared" })
  } catch (error) {
    console.error('Error in DELETE /api/user/skills:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode || 500 }
    )
  }
}
