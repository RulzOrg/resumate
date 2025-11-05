import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getJobAnalysisById, getOrCreateUser } from "@/lib/db"
import { calculateSkillMatch, type CategorizedSkills } from "@/lib/skills/categorizer"
import { handleApiError } from "@/lib/error-handler"

/**
 * GET /api/skills/match?jobId=xxx
 * Calculates skill match ratios between user's skills and job requirements
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

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // Get job analysis
    const jobAnalysis = await getJobAnalysisById(jobId, user.id)
    if (!jobAnalysis) {
      return NextResponse.json({ error: "Job analysis not found" }, { status: 404 })
    }

    // Get user's skills
    const userSkillsResponse = await fetch(
      `${request.nextUrl.origin}/api/user/skills`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!userSkillsResponse.ok) {
      console.error('Failed to fetch user skills')
      return NextResponse.json({
        error: "Failed to fetch user skills",
        needsProfile: true
      }, { status: 500 })
    }

    const userSkillsData = await userSkillsResponse.json()

    // Check if we have categorized skills from user
    let userCategorizedSkills: CategorizedSkills

    if (userSkillsData.categorized_skills) {
      userCategorizedSkills = userSkillsData.categorized_skills
    } else if (userSkillsData.skills && userSkillsData.skills.length > 0) {
      // Fallback: put all skills in "other" category if not categorized
      userCategorizedSkills = {
        hard: [],
        soft: [],
        other: userSkillsData.skills
      }
    } else {
      // No skills found
      return NextResponse.json({
        match: {
          hard: { matched: 0, total: 0 },
          soft: { matched: 0, total: 0 },
          other: { matched: 0, total: 0 }
        },
        needsProfile: true,
        message: "No skills found in your profile. Please upload your resume."
      })
    }

    // Get job's categorized skills
    let jobCategorizedSkills: CategorizedSkills

    if (jobAnalysis.analysis_result?.categorized_skills) {
      jobCategorizedSkills = jobAnalysis.analysis_result.categorized_skills
    } else {
      // Fallback: categorize existing skills on the fly
      // This is a temporary measure for backward compatibility
      const allJobSkills = [
        ...(jobAnalysis.analysis_result?.required_skills || []),
        ...(jobAnalysis.analysis_result?.preferred_skills || []),
        ...(jobAnalysis.analysis_result?.keywords || [])
      ]

      jobCategorizedSkills = {
        hard: [],
        soft: [],
        other: allJobSkills
      }
    }

    // Calculate match
    const matchResult = calculateSkillMatch(userCategorizedSkills, jobCategorizedSkills)

    return NextResponse.json({
      match: {
        hard: matchResult.hard,
        soft: matchResult.soft,
        other: matchResult.other
      },
      userSkills: matchResult.categorizedUserSkills,
      jobSkills: matchResult.categorizedJobSkills,
      jobTitle: jobAnalysis.job_title,
      companyName: jobAnalysis.company_name
    })
  } catch (error) {
    console.error('Error in GET /api/skills/match:', error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode || 500 }
    )
  }
}