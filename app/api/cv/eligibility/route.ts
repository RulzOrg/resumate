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
 * 1. Match score >= MIN_SCORE (60%)
 * 2. Must-have skill coverage >= 70%
 * 
 * If not eligible, provides actionable guidance to improve
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
    let score = 0;
    try {
      const scoreResult = await scoreFit({
        job_analysis_id,
        resume_id,
        top_k: 10,
      });
      score = scoreResult.score?.overall || 0;
    } catch (error) {
      console.error("Scoring error:", error);
      // Continue with score=0 if scoring fails
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
        score: 0,
        must_have_coverage: 0,
        reasons: ["Resume content is empty or not extracted"],
        guidance: [
          "Please re-upload your resume",
          "Ensure the file is a valid PDF or DOCX document",
          "Check that the resume contains readable text"
        ],
        missing_must_haves: mustHaveSkills,
      });
    }

    const coveredMustHaves = mustHaveSkills.filter(skill =>
      resumeText.includes(skill.toLowerCase())
    );
    
    const mustHaveCoverage = mustHaveSkills.length > 0
      ? coveredMustHaves.length / mustHaveSkills.length
      : 1; // If no must-haves, coverage is 100%

    const missingMustHaves = mustHaveSkills.filter(skill =>
      !coveredMustHaves.includes(skill)
    );

    // Determine eligibility
    const allowed = score >= MIN_SCORE && mustHaveCoverage >= MIN_MUST_HAVE_COVERAGE;

    if (!allowed) {
      const reasons: string[] = [];
      const guidance: string[] = [];

      // Score-related feedback
      if (score < MIN_SCORE) {
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
      }

      // Must-have skills feedback
      if (mustHaveCoverage < MIN_MUST_HAVE_COVERAGE) {
        const coveragePercent = Math.round(mustHaveCoverage * 100);
        reasons.push(
          `Only ${coveragePercent}% of required skills are covered (minimum: ${Math.round(MIN_MUST_HAVE_COVERAGE * 100)}%)`
        );
        
        // Provide specific guidance for missing skills
        const topMissing = missingMustHaves.slice(0, 5);
        topMissing.forEach(skill => {
          guidance.push(`Add a bullet point demonstrating "${skill}" experience to your resume`);
        });

        if (missingMustHaves.length > 5) {
          guidance.push(
            `Focus on the ${topMissing.length} most critical missing skills first`,
            "Consider taking courses or projects to build experience in these areas"
          );
        }
      }

      return NextResponse.json({
        allowed: false,
        score,
        min_score_needed: Math.max(0, MIN_SCORE - score),
        must_have_coverage: Math.round(mustHaveCoverage * 100),
        reasons,
        guidance: guidance.slice(0, 6), // Limit to 6 most important items
        missing_must_haves: missingMustHaves.slice(0, 8), // Show top 8 missing
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
