import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { embedTexts } from "@/lib/embeddings"
import { cosineSimilarity } from "@/lib/match-utils"
import { handleApiError, AppError, withRetry } from "@/lib/error-handler"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

interface MatchRequest {
  user_skills: string[]
  job_skills?: string[]
  required_skills: string[]
  preferred_skills: string[]
}

/**
 * POST /api/jobs/semantic-match
 * Calculate semantic similarity between user skills and job requirements
 * Combines keyword matching with vector embeddings for comprehensive scoring
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`semantic:${userId}`, 20, 60000) // 20 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before calculating another match score.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    const body = await request.json() as MatchRequest
    const { user_skills, required_skills, preferred_skills } = body

    // Validation
    if (!Array.isArray(user_skills)) {
      throw new AppError("user_skills must be an array", 400)
    }

    if (!Array.isArray(required_skills)) {
      throw new AppError("required_skills must be an array", 400)
    }

    if (!Array.isArray(preferred_skills)) {
      throw new AppError("preferred_skills must be an array", 400)
    }

    // Handle empty user profile
    if (user_skills.length === 0) {
      return NextResponse.json(
        {
          needsProfile: true,
          keyword_match: 0,
          semantic_match: 0,
          final_score: null,
          message: "No skills found in profile. Upload your resume for personalized match scores."
        },
        { headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Normalize all skills to lowercase for comparison
    const userSkillsNormalized = user_skills.map(s => s.toLowerCase().trim())
    const requiredNormalized = required_skills.map(s => s.toLowerCase().trim())
    const preferredNormalized = preferred_skills.map(s => s.toLowerCase().trim())

    // 1. KEYWORD-BASED MATCHING (exact string matches)
    const requiredOverlap = requiredNormalized.filter(skill => 
      userSkillsNormalized.some(userSkill => 
        userSkill.includes(skill) || skill.includes(userSkill)
      )
    ).length

    const preferredOverlap = preferredNormalized.filter(skill =>
      userSkillsNormalized.some(userSkill =>
        userSkill.includes(skill) || skill.includes(userSkill)
      )
    ).length

    // Calculate keyword score with weights
    const requiredScore = required_skills.length > 0 
      ? (requiredOverlap / required_skills.length) * 100 
      : 0
    
    const preferredScore = preferred_skills.length > 0
      ? (preferredOverlap / preferred_skills.length) * 100
      : 0

    // Weighted keyword score: 70% required, 30% preferred
    const keywordScore = Math.round(
      requiredScore * 0.7 + preferredScore * 0.3
    )

    console.log('Keyword matching:', {
      required: `${requiredOverlap}/${required_skills.length}`,
      preferred: `${preferredOverlap}/${preferred_skills.length}`,
      score: keywordScore
    })

    // 2. SEMANTIC SIMILARITY (embeddings-based)
    let semanticScore = 0
    let semanticError = null

    try {
      // Combine skills into text for embedding
      const userSkillsText = userSkillsNormalized.join(", ")
      const jobSkillsText = [
        ...requiredNormalized.map(s => `${s} (required)`),
        ...preferredNormalized.map(s => `${s} (preferred)`)
      ].join(", ")

      console.log('Generating embeddings for semantic match...')

      // Generate embeddings with retry
      const embeddings = await withRetry(
        async () => embedTexts([userSkillsText, jobSkillsText]),
        2,
        1000
      )

      if (embeddings.length === 2) {
        const [userEmbedding, jobEmbedding] = embeddings
        
        // Calculate cosine similarity
        const similarity = cosineSimilarity(userEmbedding, jobEmbedding)
        semanticScore = Math.round(similarity * 100)
        
        console.log('Semantic similarity:', semanticScore)
      }
    } catch (error: any) {
      console.error('Semantic matching failed, falling back to keyword-only:', error.message)
      semanticError = "Semantic analysis unavailable"
      // Continue with keyword score only
    }

    // 3. WEIGHTED COMBINATION
    // 60% keyword matching (exact matches are important)
    // 40% semantic similarity (catches synonyms and related concepts)
    const finalScore = semanticScore > 0
      ? Math.round(keywordScore * 0.6 + semanticScore * 0.4)
      : keywordScore // Fallback to keyword-only if semantic fails

    console.log('Final match score:', {
      keyword: keywordScore,
      semantic: semanticScore,
      final: finalScore
    })

    return NextResponse.json(
      {
        keyword_match: keywordScore,
        semantic_match: semanticScore,
        final_score: finalScore,
        required_overlap: requiredOverlap,
        required_total: required_skills.length,
        preferred_overlap: preferredOverlap,
        preferred_total: preferred_skills.length,
        breakdown: {
          keyword_weight: 0.6,
          semantic_weight: 0.4,
          required_score: Math.round(requiredScore),
          preferred_score: Math.round(preferredScore)
        },
        semantic_error: semanticError
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error in POST /api/jobs/semantic-match:', error)
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
