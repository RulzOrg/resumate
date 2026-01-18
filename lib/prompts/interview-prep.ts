/**
 * LLM Prompt for Interview Preparation
 *
 * Generates the 3 hardest technical questions a hiring manager would ask,
 * with perfect STAR-format answers tailored to the candidate's experience.
 */

export interface InterviewPrepPromptParams {
  resumeText: string
  jobDescription: string
  jobTitle: string
  companyName?: string
}

export function buildInterviewPrepPrompt(params: InterviewPrepPromptParams): string {
  const { resumeText, jobDescription, jobTitle, companyName } = params

  return `You are an expert hiring manager and interview coach with 20+ years of experience. Your task is to generate the 3 hardest interview questions a hiring manager would ask for this specific role, along with perfect answers tailored to the candidate's experience.

## YOUR TASK

Generate 3 challenging interview questions that:
1. Are specific to the role and industry
2. Test both technical competence and problem-solving ability
3. Would be difficult to answer without preparation
4. Can be answered using the candidate's actual experience

## CANDIDATE'S RESUME

${resumeText}

## TARGET POSITION

Title: ${jobTitle}
${companyName ? `Company: ${companyName}` : ""}

Job Description:
${jobDescription}

## QUESTION CATEGORIES

Include questions from different categories to test various aspects:
- **Technical**: Deep technical questions related to the role's core skills
- **Behavioral**: Questions testing soft skills, leadership, conflict resolution
- **Situational**: "What would you do if..." scenarios
- **System Design**: Architecture or design questions (if technical role)
- **Leadership**: Questions about team management, influence, decision-making

## ANSWER FORMAT: STAR Method

All answers MUST follow the STAR method:
- **S**ituation: Set the context for the story
- **T**ask: Describe the specific task or challenge
- **A**ction: Explain the specific actions taken
- **R**esult: Share the outcomes (with metrics when possible)

## RESPONSE FORMAT

Respond with a valid JSON object:
\`\`\`json
{
  "questions": [
    {
      "question": "<the challenging interview question>",
      "difficulty": "hard" | "very_hard" | "expert",
      "category": "Technical" | "Behavioral" | "Situational" | "System Design" | "Leadership",
      "perfectAnswer": "<2-3 paragraph STAR-format answer using candidate's actual experience>",
      "keyPoints": [
        "<key point 1 the answer should hit>",
        "<key point 2>",
        "<key point 3>"
      ],
      "relatedExperience": "<specific experience from resume this answer draws from>"
    }
  ]
}
\`\`\`

## QUESTION GUIDELINES

### For Technical Questions:
- Ask about specific technologies mentioned in the job description
- Include questions that probe depth of understanding, not just surface knowledge
- Ask about trade-offs, best practices, and real-world challenges
- Example: "Walk me through how you would design a system that handles 1M concurrent users"

### For Behavioral Questions:
- Focus on past experiences that demonstrate relevant competencies
- Use the format "Tell me about a time when..."
- Target situations that reveal character under pressure
- Example: "Tell me about a time when you had to deliver difficult feedback to a senior colleague"

### For Situational Questions:
- Create realistic scenarios the candidate might face in the role
- Test decision-making and problem-solving approach
- Example: "You discover a critical bug in production 1 hour before launch. What do you do?"

## ANSWER GUIDELINES

1. **Use Real Experience**: Base answers on actual content from the resume
2. **Include Metrics**: Add quantifiable results whenever the resume provides them
3. **Be Specific**: Reference actual projects, companies, and technologies from the resume
4. **Professional Tone**: Write as if the candidate is speaking in an interview
5. **Appropriate Length**: 150-250 words per answer

## CRITICAL REQUIREMENTS

1. Generate EXACTLY 3 questions
2. Each question must have a different category
3. At least one question must be difficulty "very_hard" or "expert"
4. Answers must reference actual content from the resume
5. Key points should be actionable and specific
6. Don't fabricate experiences not present in the resume

Respond ONLY with the JSON object, no additional text.`
}

export interface ParsedInterviewQuestion {
  question: string
  difficulty: "hard" | "very_hard" | "expert"
  category: "Technical" | "Behavioral" | "Situational" | "System Design" | "Leadership"
  perfectAnswer: string
  keyPoints: string[]
  relatedExperience: string
}

export interface ParsedInterviewPrepResult {
  questions: ParsedInterviewQuestion[]
}

/**
 * Parse the LLM response and validate the structure
 */
export function parseInterviewPrepResponse(response: string): ParsedInterviewPrepResult {
  // Extract JSON from response
  let jsonText = response.trim()

  // Try to extract from code blocks
  const jsonMatch =
    jsonText.match(/```json\s*([\s\S]*?)\s*```/) ||
    jsonText.match(/```\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  } else {
    // Try to find raw JSON
    const firstBrace = jsonText.indexOf("{")
    const lastBrace = jsonText.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    }
  }

  const parsed = JSON.parse(jsonText.trim())

  // Validate and normalize
  const validDifficulties = ["hard", "very_hard", "expert"]
  const validCategories = ["Technical", "Behavioral", "Situational", "System Design", "Leadership"]

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions.slice(0, 3).map((q: any) => ({
        question: q.question || "",
        difficulty: validDifficulties.includes(q.difficulty) ? q.difficulty : "hard",
        category: validCategories.includes(q.category) ? q.category : "Technical",
        perfectAnswer: q.perfectAnswer || "",
        keyPoints: Array.isArray(q.keyPoints)
          ? q.keyPoints.filter((kp: any) => typeof kp === "string").slice(0, 5)
          : [],
        relatedExperience: q.relatedExperience || "",
      }))
    : []

  // Ensure we have exactly 3 questions
  while (questions.length < 3) {
    questions.push({
      question: "How do you handle challenging situations at work?",
      difficulty: "hard" as const,
      category: "Behavioral" as const,
      perfectAnswer: "I approach challenging situations methodically...",
      keyPoints: ["Stay calm", "Analyze the situation", "Take decisive action"],
      relatedExperience: "Various professional experiences",
    })
  }

  return { questions }
}
