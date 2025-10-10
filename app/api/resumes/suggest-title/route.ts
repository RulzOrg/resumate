/**
 * AI Title Suggestion API Endpoint
 * Generates alternative job titles for ATS optimization
 * 
 * POST /api/resumes/suggest-title
 * Body: { currentTitle, jobContext, count? }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { callJsonModel } from "@/lib/llm"
import { z } from "zod"

const RequestSchema = z.object({
  currentTitle: z.string().min(1, "Current title is required"),
  jobContext: z.object({
    jobTitle: z.string().optional(),
    seniority: z.string().optional(),
    industry: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  count: z.number().min(1).max(5).optional().default(3),
})

const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      matchScore: z.number().min(0).max(100),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { currentTitle, jobContext, count } = RequestSchema.parse(body)

    // Build context for AI
    const contextParts: string[] = []
    if (jobContext?.jobTitle) {
      contextParts.push(`Original job posting title: "${jobContext.jobTitle}"`)
    }
    if (jobContext?.seniority) {
      contextParts.push(`Seniority level: ${jobContext.seniority}`)
    }
    if (jobContext?.industry) {
      contextParts.push(`Industry: ${jobContext.industry}`)
    }
    if (jobContext?.keywords && jobContext.keywords.length > 0) {
      contextParts.push(`Key skills/keywords: ${jobContext.keywords.slice(0, 8).join(", ")}`)
    }

    const contextString = contextParts.length > 0 
      ? `\n\nJob Context:\n${contextParts.join("\n")}` 
      : ""

    // Generate AI prompt
    const prompt = `Generate ${count} alternative job titles that are ATS-optimized variations of: "${currentTitle}"${contextString}

Requirements:
1. Maintain the same or similar seniority level (don't change Senior to Junior, etc.)
2. Include relevant keywords for ATS scanning
3. Use industry-standard terminology and common job title formats
4. Keep titles concise and professional (2-6 words ideal)
5. Each title should offer a different angle:
   - One keyword-rich version (includes technical skills)
   - One experience-focused version (emphasizes years/level)
   - One hybrid version (role + domain/specialty)

For each suggestion:
- title: The alternative job title (string)
- reason: Brief explanation (1 sentence, max 20 words) why this title is effective for ATS
- matchScore: Estimated ATS relevance score 0-100 based on keyword density and format

Provide exactly ${count} suggestions with realistic match scores (70-95 range).`

    // Call AI model
    const result = await callJsonModel(prompt, SuggestionSchema, {
      temperature: 0.7, // Higher for creativity
      maxTokens: 1500,
    })

    // Validate we got the right number of suggestions
    if (result.suggestions.length !== count) {
      console.warn(`Expected ${count} suggestions, got ${result.suggestions.length}`)
    }

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      metadata: {
        model: "gpt-4o-mini",
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("Title suggestion error:", error)

    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    // Handle AI model errors
    return NextResponse.json(
      {
        error: "Failed to generate suggestions",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
