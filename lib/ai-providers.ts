/**
 * AI Provider Abstraction Layer
 * Supports multiple LLM providers: OpenAI, Moonshot AI
 *
 * Usage:
 * - Set AI_PROVIDER=moonshot in .env to use Moonshot
 * - Set AI_PROVIDER=openai (default) to use OpenAI
 */

import { openai } from "@ai-sdk/openai"
import { createOpenAI } from "@ai-sdk/openai"

/**
 * Available AI providers
 */
export type AIProviderType = "openai" | "moonshot"

/**
 * Provider configuration
 */
interface ProviderConfig {
  provider: AIProviderType
  defaultModel: string
  fallbackModel?: string
}

/**
 * Moonshot AI models
 * See: https://platform.moonshot.ai/docs
 */
export const MOONSHOT_MODELS = {
  // Kimi K2 - Best for long context, complex reasoning
  K2: "moonshot-v1-128k",  // 128K context, production-ready
  K2_TURBO: "moonshot-v1-32k", // 32K context, faster responses
  // For compatibility, use the latest model identifiers
  LATEST: "moonshot-v1-128k",
} as const

/**
 * OpenAI models (for reference)
 */
export const OPENAI_MODELS = {
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
} as const

/**
 * Get provider configuration from environment
 */
function getProviderConfig(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProviderType

  const configs: Record<AIProviderType, ProviderConfig> = {
    openai: {
      provider: "openai",
      defaultModel: OPENAI_MODELS.GPT4O_MINI,
      fallbackModel: OPENAI_MODELS.GPT4O,
    },
    moonshot: {
      provider: "moonshot",
      defaultModel: MOONSHOT_MODELS.K2,
      fallbackModel: MOONSHOT_MODELS.K2_TURBO,
    },
  }

  return configs[provider] || configs.openai
}

/**
 * Create Moonshot AI provider instance
 * Uses OpenAI SDK with Moonshot's OpenAI-compatible API
 */
function createMoonshotProvider() {
  const apiKey = process.env.MOONSHOT_API_KEY

  if (!apiKey) {
    console.warn("[AI Provider] MOONSHOT_API_KEY not found, falling back to OpenAI")
    return openai
  }

  // Create OpenAI-compatible provider pointing to Moonshot's API
  return createOpenAI({
    apiKey,
    baseURL: "https://api.moonshot.cn/v1", // Use .cn for China, .ai for global
    // Note: Moonshot supports OpenAI-compatible endpoints
  })
}

/**
 * Get the appropriate AI provider based on configuration
 */
export function getAIProvider() {
  const config = getProviderConfig()

  switch (config.provider) {
    case "moonshot":
      return createMoonshotProvider()
    case "openai":
    default:
      return openai
  }
}

/**
 * Get model name for a specific use case
 *
 * @param useCase - The use case type
 * @returns Model identifier string
 */
export function getModelForUseCase(
  useCase: "analysis" | "optimization" | "generation" | "content"
): string {
  const config = getProviderConfig()

  // Map use cases to optimal models per provider
  const modelMappings = {
    openai: {
      analysis: OPENAI_MODELS.GPT4O_MINI,     // Fast, cost-effective
      optimization: OPENAI_MODELS.GPT4O,       // Higher quality
      generation: OPENAI_MODELS.GPT4O,         // Creative tasks
      content: OPENAI_MODELS.GPT4O_MINI,       // Quick edits
    },
    moonshot: {
      analysis: MOONSHOT_MODELS.K2,            // Long context handling
      optimization: MOONSHOT_MODELS.K2,        // Best quality
      generation: MOONSHOT_MODELS.K2,          // Creative with context
      content: MOONSHOT_MODELS.K2_TURBO,       // Faster for simple tasks
    },
  }

  return modelMappings[config.provider][useCase]
}

/**
 * Get provider-specific configuration
 */
export function getProviderInfo() {
  const config = getProviderConfig()

  return {
    provider: config.provider,
    defaultModel: config.defaultModel,
    isOpenAI: config.provider === "openai",
    isMoonshot: config.provider === "moonshot",
    // Context window limits
    maxContextTokens: config.provider === "moonshot" ? 128000 : 128000,
    // Recommended content limits (conservative estimate for safety)
    recommendedMaxChars: config.provider === "moonshot" ? 300000 : 100000,
  }
}
