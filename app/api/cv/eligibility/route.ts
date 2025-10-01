import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser, getJobAnalysisById, getResumeById } from "@/lib/db";
import { scoreFit } from "@/lib/api";
import { z } from "zod";

// Configuration constants
const MIN_SCORE = 60; // Minimum match score required (0-100)
const MIN_MUST_HAVE_COVERAGE = 0.7; // 70% of must-have skills required

const eligibilityRequestSchema = z.object({
  job_analysis_id: z.string(),
  resume_id: z.string(),
});

/**
 * Check if user is eligible to generate CV for a specific job
 * 
 * Eligibility criteria:
 * 1. Match score >= MIN_SCORE (60%) - if scoring succeeds
 * 2. Must-have skill coverage >= 70%
 * 
 * If not eligible, provides actionable guidance to improve
 * 
 * API Response:
 * - score: number | null (null if scoring failed)
 * - scoring_error?: string (present when scoring fails, describes the error)
 * - When score is null, eligibility is based solely on must-have coverage
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { job_analysis_id, resume_id } = eligibilityRequestSchema.parse(body);

    // Get job analysis and resume
    const [jobAnalysis, resume] = await Promise.all([
      getJobAnalysisById(job_analysis_id, user.id),
      getResumeById(resume_id, user.id),
    ]);

    if (!jobAnalysis || !resume) {
      return NextResponse.json(
        { error: "Job analysis or resume not found" },
        { status: 404 }
      );
    }

    // Score the resume-job fit
    let score: number | null = null;
    let scoringError: string | undefined;
    try {
      const scoreResult = await scoreFit({
        job_analysis_id,
        resume_id,
        top_k: 10,
      });
      score = scoreResult.score?.overall || 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Scoring error:", errorMessage, error);
      scoringError = `Failed to calculate match score: ${errorMessage}`;
      // score remains null when scoring fails
    }

    // Extract must-have skills
    const mustHaveSkills = Array.isArray(jobAnalysis.analysis_result?.required_skills)
      ? jobAnalysis.analysis_result.required_skills
      : Array.isArray((jobAnalysis as any).required_skills)
      ? (jobAnalysis as any).required_skills
      : [];

    // Check must-have coverage
    const resumeText = (resume.content_text?.toLowerCase() || "").trim();
    
    if (!resumeText) {
      return NextResponse.json({
        allowed: false,
        score: null,
        must_have_coverage: 0,
        reasons: ["Resume content is empty or not extracted"],
        guidance: [
    const coveredMustHaves = mustHaveSkills.filter(skill =>
      new RegExp(
        `\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\          "Please re-upload your resume",
          "Ensure the file is a valid PDF or DOCX document",
          "Check that the resume contains readable text"
        ],
        missing_must_haves: mustHaveSkills,
        ...(scoringError && { scoring_error: scoringError }),
      });')}\\b`
      ).test(resumeText)
    );
    
    const mustHaveCoverage = mustHaveSkills.length > 0
      ? coveredMustHaves.length / mustHaveSkills.length
      : 1; // If no must-haves, coverage is 100%
    }

    const coveredMustHaves = mustHaveSkills.filter((skill: string) =>
      resumeText.includes(skill.toLowerCase())
    );
    
    const mustHaveCoverage = mustHaveSkills.length > 0
      ? coveredMustHaves.length / mustHaveSkills.length
      : 1; // If no must-haves, coverage is 100%

    const missingMustHaves = mustHaveSkills.filter((skill: string) =>
      !coveredMustHaves.includes(skill)
    );

    // Determine eligibility
    // When score is null (scoring failed), base eligibility solely on must-have coverage
    const scoreCheck = score !== null ? score >= MIN_SCORE : true;
    const allowed = scoreCheck && mustHaveCoverage >= MIN_MUST_HAVE_COVERAGE;

    if (!allowed) {
      const reasons: string[] = [];
      const guidance: string[] = [];

      // Score-related feedback
      if (score !== null && score < MIN_SCORE) {
        reasons.push(`Match score is ${score}% (minimum: ${MIN_SCORE}%)`);
        
        guidance.push(
          "Add more experience demonstrating the required skills for this role",
          "Include specific projects or achievements related to the job description"
        );

        // Add targeted guidance based on how far below threshold
        const scoreDelta = MIN_SCORE - score;
        if (scoreDelta > 30) {
          guidance.push(
            "Consider if this role truly aligns with your experience",
            "Focus on roles where you have 3+ years of relevant experience"
          );
        } else if (scoreDelta > 15) {
          guidance.push(
            "Highlight transferable skills that relate to this position",
            "Add quantifiable results from projects using required technologies"
          );
        }
      } else if (score === null) {
        reasons.push("Match score could not be calculated due to a scoring error");
        guidance.push("Please try again. If the issue persists, contact support.");
      }

      // Must-have skills feedback
      if (mustHaveCoverage < MIN_MUST_HAVE_COVERAGE) {
        const coveragePercent = Math.round(mustHaveCoverage * 100);
        reasons.push(
          `Only ${coveragePercent}% of required skills are covered (minimum: ${Math.round(MIN_MUST_HAVE_COVERAGE * 100)}%)`
        );
        
      return NextResponse.json({
        allowed: false,
        score,
        ...(score < MIN_SCORE && { score_gap: MIN_SCORE - score }),
        must_have_coverage: Math.round(mustHaveCoverage * 100),
        reasons,
        guidance: guidance.slice(0, 6), // Limit to 6 most important items
        missing_must_haves: missingMustHaves.slice(0, 8), // Show top 8 missing
      });
            "Consider taking courses or projects to build experience in these areas"
          );
        }
      }

      return NextResponse.json({
        allowed: false,
        score,
        min_score_needed: score !== null ? Math.max(0, MIN_SCORE - score) : null,
        must_have_coverage: Math.round(mustHaveCoverage * 100),
        reasons,
        guidance: guidance.slice(0, 6), // Limit to 6 most important items
        missing_must_haves: missingMustHaves.slice(0, 8), // Show top 8 missing
        ...(scoringError && { scoring_error: scoringError }),
      });
    }

    // User is eligible!
    return NextResponse.json({
      allowed: true,
      score,
      must_have_coverage: Math.round(mustHaveCoverage * 100),
      message: "You're qualified for this role! Ready to generate optimized CV variants.",
      covered_must_haves: coveredMustHaves.length,
      total_must_haves: mustHaveSkills.length,
      ...(scoringError && { scoring_error: scoringError }),
    });
  } catch (error: any) {
    console.error("Eligibility check error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to check eligibility" },
      { status: 500 }
    );
  }
}
