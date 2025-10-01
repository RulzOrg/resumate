import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { 
  getOrCreateUser, 
  getJobAnalysisById, 
  getResumeById,
  createCvVersion,
  createCvVariant,
  archivePreviousVersions,
  logCvChange,
} from "@/lib/db";
import { 
  GenerateCvRequestSchema, 
  CvDraftSchema,
  type CvDraft,
  type GenerationContext 
} from "@/lib/schemas.generate";
import { 
  buildCvGenerationPrompt, 
  extractImmutableFields, 
  extractMustHits, 
  detectSpelling,
  extractEmphasis,
} from "@/lib/prompts/cv-generation";
import { searchSimilarEvidencePoints } from "@/lib/match";

/**
 * Generate 3 CV variants (Conservative, Balanced, Bold) for a job
 * 
 * Flow:
 * 1. Check eligibility
 * 2. Get resume and job analysis
 * 3. Retrieve evidence from Qdrant
 * 4. Generate 3 variants in parallel
 * 5. Validate and save variants
 * 6. Log changes to changelog
 * 7. Return variant IDs
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
    const { userId: _, jobId, resumeId, options, locks } = GenerateCvRequestSchema.parse(body);

    // Get resume and job analysis
    const [resume, jobAnalysis] = await Promise.all([
      getResumeById(resumeId, user.id),
      getJobAnalysisById(jobId, user.id),
    ]);

    if (!resume || !jobAnalysis) {
      return NextResponse.json(
        { error: "Resume or job analysis not found" },
        { status: 404 }
      );
    }

    // Check eligibility first
    const eligibilityCheck = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cv/eligibility`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
        body: JSON.stringify({
          job_analysis_id: jobId,
          resume_id: resumeId,
        }),
      }
    );

    const eligibilityResult = await eligibilityCheck.json();
    if (!eligibilityResult.allowed) {
      return NextResponse.json(
        { 
          error: "Not eligible to generate CV",
          eligibility: eligibilityResult,
        },
        { status: 403 }
      );
    }

    // Retrieve evidence from Qdrant (top 10 most relevant points)
    let evidence: any[] = [];
    try {
      const evidenceResult = await searchSimilarEvidencePoints({
        job_analysis_id: jobId,
        resume_id: resumeId,
        top_k: 10,
      });
      evidence = evidenceResult.matches || [];
    } catch (error) {
      console.error("Evidence retrieval error:", error);
      // Continue without evidence - will use full resume text
    }

    // Extract context for prompt building
    const immutableFields = extractImmutableFields(resume);
    const detectedSpelling = detectSpelling(resume);
    const mustHits = extractMustHits(jobAnalysis);
    const emphasis = extractEmphasis(jobAnalysis);

    // Merge user options with defaults
    const finalOptions = {
      tone: options.tone || "Impactful",
      must_hit: options.must_hit.length > 0 ? options.must_hit : mustHits,
      emphasis: options.emphasis.length > 0 ? options.emphasis : emphasis,
      keep_spelling: options.keep_spelling || detectedSpelling,
      max_pages: 2 as const,
    };

    const finalLocks = {
      sections: locks?.sections || [],
      bullet_ids: locks?.bullet_ids || [],
    };

    // Build generation context
    const baseContext: Omit<GenerationContext, 'variant'> = {
      masterResume: {
        basics: immutableFields,
        content: resume.content_text || "",
        structured: resume.parsed_sections || {},
      },
      jobProfile: {
        job_title: jobAnalysis.job_title,
        company_name: jobAnalysis.company_name || undefined,
        required_skills: (jobAnalysis.analysis_result as any)?.required_skills || [],
        preferred_skills: (jobAnalysis.analysis_result as any)?.preferred_skills || [],
        keywords: jobAnalysis.keywords || [],
        key_requirements: (jobAnalysis.analysis_result as any)?.key_requirements || [],
      },
      evidence,
      options: finalOptions,
      locks: finalLocks,
    };

    // Archive previous versions for this job
    await archivePreviousVersions(user.id, jobId);

    // Create new version
    const { version_id } = await createCvVersion({
      user_id: user.id,
      job_id: jobId,
      original_resume_id: resumeId,
      status: "current",
    });

    // Generate 3 variants in parallel
    const variantLabels: Array<"Conservative" | "Balanced" | "Bold"> = [
      "Conservative",
      "Balanced", 
      "Bold"
    ];

    const variantPromises = variantLabels.map(async (label) => {
      const context: GenerationContext = {
        ...baseContext,
        variant: label,
      };

      const prompt = buildCvGenerationPrompt(context);

      try {
        const { object: cvDraft } = await generateObject({
          model: openai("gpt-4o"),
          schema: CvDraftSchema,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: 0, // Consistent results
        });

        return { label, draft: cvDraft, error: null };
      } catch (error: any) {
        console.error(`Failed to generate ${label} variant:`, error);
        return { label, draft: null, error: error.message };
      }
    });

    const variantResults = await Promise.all(variantPromises);

    // Check for failures
    const failures = variantResults.filter(r => r.error !== null);
    if (failures.length === 3) {
      return NextResponse.json(
        { error: "Failed to generate all variants", details: failures },
        { status: 500 }
      );
    }

    // Save successful variants
    const savedVariants = [];
    for (const result of variantResults) {
      if (result.draft) {
        const { variant_id } = await createCvVariant({
          version_id,
          label: result.label,
          draft: result.draft,
          is_selected: result.label === "Balanced", // Default to Balanced
        });

        savedVariants.push({
          variant_id,
          label: result.label,
          preview: result.draft.summary?.slice(0, 150) || "No summary available",
          skills_count: result.draft.skills.length,
          experiences_count: result.draft.experiences.length,
          created_at: new Date().toISOString(),
        });

        // Log skill changes to changelog
        if (result.draft.skills_changelog) {
          for (const added of result.draft.skills_changelog.added || []) {
            await logCvChange({
              version_id,
              change_type: "skill_added",
              details: {
                variant: result.label,
                skill: added.skill,
                justification: added.justification,
              },
            });
          }

          for (const removed of result.draft.skills_changelog.removed || []) {
            await logCvChange({
              version_id,
              change_type: "skill_removed",
              details: {
                variant: result.label,
                skill: removed.skill,
                reason: removed.reason,
              },
            });
          }
        }

        // Log must-hit keywords added
        if (result.draft.must_hit_coverage) {
          const includedTerms = result.draft.must_hit_coverage
            .filter(c => c.included)
            .map(c => c.term);
          
          if (includedTerms.length > 0) {
            await logCvChange({
              version_id,
              change_type: "keyword_added",
              details: {
                variant: result.label,
                keywords: includedTerms,
                coverage: `${includedTerms.length}/${result.draft.must_hit_coverage.length}`,
              },
            });
          }
        }
      }
    }

    // Return success
    return NextResponse.json({
      success: true,
      version_id,
      variants: savedVariants,
      failures: failures.map(f => ({ label: f.label, error: f.error })),
      options_used: finalOptions,
      locks_applied: finalLocks,
    });
  } catch (error: any) {
    console.error("CV generation error:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to generate CV variants" },
      { status: 500 }
    );
  }
}

/**
 * Get a generated CV version with variants
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("version_id");

    if (!versionId) {
      return NextResponse.json(
        { error: "version_id is required" },
        { status: 400 }
      );
    }

    const { getCvVersion, getCvChangelog } = await import("@/lib/db");
    
    const [version, changelog] = await Promise.all([
      getCvVersion(versionId, user.id),
      getCvChangelog(versionId),
    ]);

    if (!version) {
      return NextResponse.json(
        { error: "CV version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      version,
      changelog,
    });
  } catch (error: any) {
    console.error("Get CV version error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get CV version" },
      { status: 500 }
    );
  }
}
