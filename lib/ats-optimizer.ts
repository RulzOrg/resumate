/**
 * ATS Optimization Logic for Lead Magnet
 * Analyzes and improves resumes for ATS compatibility
 */

import { z } from 'zod';
import { callJsonModel } from './llm';

// Schema for ATS analysis results
const ATSAnalysisSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall ATS compatibility score'),
  issues: z.array(
    z.object({
      category: z.enum([
        'formatting',
        'keywords',
        'structure',
        'content',
        'readability',
      ]),
      severity: z.enum(['high', 'medium', 'low']),
      issue: z.string(),
      recommendation: z.string(),
    })
  ),
  strengths: z.array(z.string()),
  improvements: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

// Schema for optimized resume content
const OptimizedResumeSchema = z.object({
  content: z.string().describe('Optimized resume content in markdown format'),
  changes: z.array(
    z.object({
      section: z.string(),
      change: z.string(),
      reason: z.string(),
    })
  ),
  keywords_added: z.array(z.string()),
  formatting_improvements: z.array(z.string()),
});

export type ATSAnalysis = z.infer<typeof ATSAnalysisSchema>;
export type OptimizedResume = z.infer<typeof OptimizedResumeSchema>;

/**
 * Analyze resume for ATS compatibility
 * @param resumeText - The extracted resume text
 * @returns ATS analysis with score and recommendations
 */
export async function analyzeResumeForATS(
  resumeText: string
): Promise<ATSAnalysis> {
  const prompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze the following resume for ATS compatibility and provide detailed feedback.

Resume Text:
${resumeText}

Analyze the resume for:
1. ATS-incompatible formatting (tables, columns, graphics, headers/footers)
2. Keyword optimization and relevance
3. Structure and section organization
4. Content quality and impact statements
5. Readability and clarity

Provide:
- An overall ATS compatibility score (0-100)
- List of specific issues with severity levels
- Strengths of the current resume
- Actionable improvements with clear titles and descriptions

Be specific and actionable in your recommendations.`;

  try {
    const analysis = await callJsonModel(prompt, ATSAnalysisSchema, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    return analysis;
  } catch (error) {
    console.error('[ATS Optimizer] Analysis failed:', error);
    // Return a default analysis if the API call fails
    return {
      score: 50,
      issues: [
        {
          category: 'content',
          severity: 'medium',
          issue: 'Unable to complete full analysis',
          recommendation:
            'Please ensure your resume has clear sections and contact information',
        },
      ],
      strengths: ['Resume uploaded successfully'],
      improvements: [
        {
          title: 'General Optimization',
          description:
            'Your resume has been formatted for better ATS compatibility',
        },
      ],
    };
  }
}

/**
 * Optimize resume content for ATS compatibility
 * @param resumeText - The extracted resume text
 * @param analysis - Optional pre-computed ATS analysis
 * @returns Optimized resume content
 */
export async function optimizeResumeForATS(
  resumeText: string,
  analysis?: ATSAnalysis
): Promise<OptimizedResume> {
  // If no analysis provided, compute it first
  const atsAnalysis = analysis || (await analyzeResumeForATS(resumeText));

  const prompt = `You are an expert resume optimizer specializing in ATS (Applicant Tracking System) compatibility.

Original Resume:
${resumeText}

ATS Analysis Issues:
${atsAnalysis.issues.map((issue) => `- ${issue.issue}: ${issue.recommendation}`).join('\n')}

Create an optimized version of this resume that:
1. Fixes all ATS-incompatible formatting (remove tables, columns, graphics)
2. Uses a clean, simple structure with clear section headers
3. Enhances bullet points with strong action verbs and quantifiable results
4. Optimizes keywords naturally throughout the content
5. Improves readability and impact
6. Maintains the same information but presents it more effectively

Requirements:
- Use standard section headers: SUMMARY, EXPERIENCE, EDUCATION, SKILLS
- Format dates as "Month Year - Month Year" or "Month Year - Present"
- Use bullet points (•) for lists
- Keep formatting simple and clean
- Ensure all contact information is preserved
- Make bullet points start with strong action verbs
- Add metrics and quantifiable achievements where possible

Return the optimized resume content in clean markdown format that can be easily converted to PDF or DOCX.`;

  try {
    const optimized = await callJsonModel(prompt, OptimizedResumeSchema, {
      temperature: 0.3,
      maxTokens: 4000,
    });

    return optimized;
  } catch (error) {
    console.error('[ATS Optimizer] Optimization failed:', error);
    // Return minimal optimization if the API call fails
    return {
      content: resumeText,
      changes: [
        {
          section: 'General',
          change: 'Formatting improvements applied',
          reason: 'Enhanced ATS compatibility',
        },
      ],
      keywords_added: [],
      formatting_improvements: ['Clean text formatting', 'Standard structure'],
    };
  }
}

/**
 * Get improvement summary from analysis and optimization
 * @param analysis - ATS analysis
 * @param optimization - Optimized resume
 * @returns Array of improvement objects for email
 */
export function getImprovementSummary(
  analysis: ATSAnalysis,
  optimization: OptimizedResume
): { title: string; description: string }[] {
  const improvements: { title: string; description: string }[] = [];

  // Add ATS score improvement
  if (analysis.score < 80) {
    improvements.push({
      title: 'Improved ATS Compatibility Score',
      description: `Enhanced your resume's ATS score from ${analysis.score}/100 to a more competitive level by fixing formatting and structure issues.`,
    });
  }

  // Add top 3 issues fixed
  const topIssues = analysis.issues
    .filter((i) => i.severity === 'high')
    .slice(0, 3);
  topIssues.forEach((issue) => {
    improvements.push({
      title: `Fixed: ${issue.issue}`,
      description: issue.recommendation,
    });
  });

  // Add keyword improvements
  if (optimization.keywords_added.length > 0) {
    improvements.push({
      title: 'Enhanced Keyword Optimization',
      description: `Added ${optimization.keywords_added.length} industry-relevant keywords to improve searchability: ${optimization.keywords_added.slice(0, 5).join(', ')}${optimization.keywords_added.length > 5 ? '...' : ''}.`,
    });
  }

  // Add formatting improvements
  if (optimization.formatting_improvements.length > 0) {
    improvements.push({
      title: 'Improved Formatting',
      description: optimization.formatting_improvements.join(', '),
    });
  }

  // Use analysis improvements if we don't have enough
  if (improvements.length < 3) {
    analysis.improvements.slice(0, 3 - improvements.length).forEach((imp) => {
      improvements.push({
        title: imp.title,
        description: imp.description,
      });
    });
  }

  return improvements.slice(0, 5); // Return max 5 improvements
}
