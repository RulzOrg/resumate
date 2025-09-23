import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser, getResumeById } from "@/lib/db"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const ResumeAnalysisSchema = z.object({
  personal_info: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    portfolio: z.string().optional(),
  }),
  professional_summary: z.string().optional(),
  experience_level: z.enum(["entry", "mid", "senior", "executive"]),
  skills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    languages: z.array(z.string()),
    certifications: z.array(z.string()),
  }),
  work_experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      duration: z.string(),
      description: z.string(),
      achievements: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string().optional(),
      gpa: z.string().optional(),
    }),
  ),
  strengths: z.array(z.string()),
  improvement_areas: z.array(z.string()),
  keywords: z.array(z.string()),
  overall_score: z.number().min(1).max(100),
  recommendations: z.array(z.string()),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { resumeId } = await request.json()
    if (!resumeId) {
      return NextResponse.json({ error: "Resume ID is required" }, { status: 400 })
    }

    const resume = await getResumeById(resumeId, user.id)
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    if (!resume.content_text) {
      return NextResponse.json({ error: "Resume content not available for analysis" }, { status: 400 })
    }

    const { object: analysis } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: ResumeAnalysisSchema,
      prompt: `Analyze this resume content and provide a comprehensive analysis:

Resume Content:
${resume.content_text}

Please analyze:
1. Extract personal information (name, contact details)
2. Identify experience level (entry/mid/senior/executive)
3. Categorize skills (technical, soft skills, languages, certifications)
4. Parse work experience with achievements
5. Extract education details
6. Identify key strengths and areas for improvement
7. Extract important keywords for ATS optimization
8. Provide an overall score (1-100) based on completeness, clarity, and impact
9. Give specific recommendations for improvement

Be thorough and specific in your analysis.`,
    })

    return NextResponse.json({
      analysis,
      resumeId: resume.id,
      resumeTitle: resume.title,
    })
  } catch (error) {
    console.error("Resume analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
