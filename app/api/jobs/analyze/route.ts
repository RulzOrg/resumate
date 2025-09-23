import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createJobAnalysis, getOrCreateUser } from "@/lib/db"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { handleApiError, withRetry, AppError } from "@/lib/error-handler"

const jobAnalysisSchema = z.object({
  keywords: z.array(z.string()).describe("Important keywords and phrases from the job posting"),
  required_skills: z.array(z.string()).describe("Must-have technical and soft skills"),
  preferred_skills: z.array(z.string()).describe("Nice-to-have skills and qualifications"),
  experience_level: z.string().describe("Required experience level (e.g., Entry Level, Mid Level, Senior)"),
  salary_range: z.string().optional().describe("Salary range if mentioned"),
  location: z.string().optional().describe("Job location"),
  key_requirements: z.array(z.string()).describe("Key job requirements and responsibilities"),
  nice_to_have: z.array(z.string()).describe("Preferred qualifications and bonus skills"),
  company_culture: z.array(z.string()).describe("Company culture and values mentioned"),
  benefits: z.array(z.string()).describe("Benefits and perks mentioned"),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResult = rateLimit(`analyze:${userId}`, 10, 300000) // 10 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before analyzing another job posting.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    // Get or create user in our database
    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    const { job_title, company_name, job_url, job_description } = await request.json()

    if (!job_title || !job_description) {
      throw new AppError("Job title and description are required", 400)
    }

    if (job_description.trim().length < 100) {
      throw new AppError("Job description is too short. Please provide a more detailed job posting.", 400)
    }

    const analysis = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: jobAnalysisSchema,
          prompt: `Analyze this job posting and extract structured information:

Job Title: ${job_title}
Company: ${company_name || "Not specified"}
Job Description:
${job_description}

Please extract:
1. Important keywords that should appear in a resume
2. Required technical and soft skills
3. Preferred/nice-to-have skills
4. Experience level required
5. Salary range (if mentioned)
6. Location (if mentioned)
7. Key job requirements and responsibilities
8. Nice-to-have qualifications
9. Company culture aspects mentioned
10. Benefits and perks mentioned

Focus on actionable insights that can help optimize a resume for this position.`,
        })
        return object
      },
      3,
      1000,
    )

    // Save the analysis to the database
    const jobAnalysis = await createJobAnalysis({
      user_id: user.id,
      job_title,
      company_name,
      job_url,
      job_description,
      analysis_result: analysis,
    })

    return NextResponse.json({ analysis: jobAnalysis }, { headers: getRateLimitHeaders(rateLimitResult) })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error, code: errorInfo.code }, { status: errorInfo.statusCode })
  }
}
