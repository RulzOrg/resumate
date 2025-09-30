/**
 * JSON Schema utilities for LLM structured outputs
 * Converts Zod schemas to JSON Schema format for OpenAI function calling
 */

import { zodToJsonSchema } from "zod-to-json-schema"
import { z } from "zod"

/**
 * Convert a Zod schema to JSON Schema format
 * Used for OpenAI function calling and structured outputs
 *
 * @param schema - Zod schema to convert
 * @param name - Optional name for the schema
 * @returns JSON Schema object
 */
export function toJsonSchema<T extends z.ZodType>(
  schema: T,
  name?: string
): Record<string, any> {
  return zodToJsonSchema(schema, {
    name,
    // Remove $schema property as OpenAI doesn't need it
    $refStrategy: "none",
  })
}

/**
 * Create a function definition for OpenAI function calling
 *
 * @param name - Function name
 * @param description - Function description
 * @param schema - Zod schema for parameters
 * @returns OpenAI function definition
 */
export function createFunctionDefinition<T extends z.ZodType>(
  name: string,
  description: string,
  schema: T
) {
  return {
    name,
    description,
    parameters: toJsonSchema(schema),
  }
}

/**
 * Validate and parse data against a Zod schema
 * Returns typed data or throws with detailed error
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and typed data
 */
export function validateSchema<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => {
        const path = issue.path.join(".")
        return {
          path: path || "(root)",
          message: issue.message,
          code: issue.code,
        }
      })
      throw new Error(`Schema validation failed: ${JSON.stringify(issues)}`)
    }
    throw error
  }
}

/**
 * Safe validate - returns result object instead of throwing
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Success result with data or error result with issues
 */
export function safeValidateSchema<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map(issue => {
    const path = issue.path.join(".")
    return path ? `${path}: ${issue.message}` : issue.message
  })

  return { success: false, errors }
}