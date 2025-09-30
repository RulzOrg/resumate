/**
 * LLM utilities for structured JSON responses
 * Provides callJsonModel() for all LLM JSON calls with schema enforcement
 */

import { openai } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import { toJsonSchema, validateSchema } from "./jsonSchema"

/**
 * Configuration for LLM calls
 */
export interface LLMConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  timeout?: number
}

const DEFAULT_CONFIG: Required<LLMConfig> = {
  model: "gpt-4o-mini",
  temperature: 0.2,
  maxTokens: 4000,
  timeout: 30000,
}

/**
 * Call OpenAI model with JSON schema enforcement
 * Returns validated, typed response
 *
 * @param prompt - The prompt to send to the model
 * @param schema - Zod schema for response validation
 * @param config - Optional LLM configuration
 * @returns Typed response matching the schema
 */
export async function callJsonModel<T extends z.ZodType>(
  prompt: string,
  schema: T,
  config: LLMConfig = {}
): Promise<z.infer<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    // Use generateObject for structured output with schema
    const result = await generateObject({
      model: openai(finalConfig.model),
      schema,
      prompt,
      temperature: finalConfig.temperature,
      maxTokens: finalConfig.maxTokens,
    })

    // Validate the response against the schema
    return validateSchema(schema, result.object)
  } catch (error: any) {
    console.error("[LLM] JSON model call failed:", {
      error: error.message,
      model: finalConfig.model,
      promptLength: prompt.length,
    })
    throw new Error(`LLM call failed: ${error.message}`)
  }
}

/**
 * Extract evidence from resume text
 *
 * @param resumeText - The full resume text
 * @param userId - User ID for prefixing evidence IDs
 * @param schema - Zod schema for evidence extraction
 * @returns Evidence extraction response
 */
export async function extractEvidence<T extends z.ZodType>(
  resumeText: string,
  userId: string,
  schema: T
): Promise<z.infer<T>> {
  const timestamp = Date.now()

  const prompt = `Extract structured evidence items from the following resume.
Each evidence item should be a discrete piece of information that can be used for job matching.

For each evidence item:
- Generate a unique evidence_id using the prefix "${userId}_${timestamp}_" followed by a sequential number
- Extract the section name (e.g., "Experience", "Education", "Skills")
- Extract the full text of the evidence
- Identify relevant keywords
- Categorize it appropriately

Resume text:
${resumeText}

Extract ALL meaningful evidence items. Minimum 1 item required.`

  return callJsonModel(prompt, schema)
}

/**
 * Convert paragraph text to bullet points
 *
 * @param paragraphText - The paragraph to convert
 * @param schema - Zod schema for the response
 * @returns Bullet point conversion response
 */
export async function convertParagraphToBullets<T extends z.ZodType>(
  paragraphText: string,
  schema: T
): Promise<z.infer<T>> {
  const prompt = `Convert the following paragraph into concise, impactful bullet points suitable for a resume.

Guidelines:
- Start each bullet with a strong action verb
- Quantify achievements where possible
- Keep each bullet concise (1-2 lines max)
- Highlight measurable outcomes
- Use professional resume language

Paragraph:
${paragraphText}

Convert to bullet points and indicate if this improves the content.`

  return callJsonModel(prompt, schema, { temperature: 0.3 })
}

/**
 * Simple text generation without schema (for unstructured outputs)
 *
 * @param prompt - The prompt to send
 * @param config - Optional LLM configuration
 * @returns Generated text
 */
export async function callTextModel(
  prompt: string,
  config: LLMConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    const result = await generateText({
      model: openai(finalConfig.model),
      prompt,
      temperature: finalConfig.temperature,
      maxTokens: finalConfig.maxTokens,
    })

    return result.text
  } catch (error: any) {
    console.error("[LLM] Text model call failed:", {
      error: error.message,
      model: finalConfig.model,
    })
    throw new Error(`LLM text call failed: ${error.message}`)
  }
}

/**
 * Validate if text is meaningful resume content
 *
 * @param text - Text to validate
 * @returns True if text appears to be valid resume content
 */
export function isValidResumeContent(text: string): boolean {
  const minLength = 50 // Minimum character count
  const wordCount = text.split(/\s+/).length

  // Check minimum length
  if (text.length < minLength || wordCount < 10) {
    return false
  }

  // Check for common resume indicators
  const resumeIndicators = [
    /experience/i,
    /education/i,
    /skills/i,
    /work/i,
    /university|college|school/i,
    /\b(19|20)\d{2}\b/, // Year pattern
  ]

  const hasIndicators = resumeIndicators.some(pattern => pattern.test(text))

  return hasIndicators
}