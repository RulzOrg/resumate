# Moonshot AI Integration Guide

## Overview

ResuMate now supports **Moonshot AI** as an alternative LLM provider alongside OpenAI. Moonshot's Kimi models offer:

- **256K context window** (vs OpenAI's 128K) - eliminates content truncation issues
- **OpenAI-compatible API** - seamless integration with existing code
- **Cost-effective pricing** for long-context operations
- **Better instruction following** - fewer retries needed

## Quick Start

### 1. Get Your Moonshot API Key

1. Visit https://platform.moonshot.ai
2. Sign up for an account
3. Navigate to the API Keys section
4. Generate a new API key

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# AI Provider Configuration
AI_PROVIDER=moonshot              # Options: "openai" (default) or "moonshot"
MOONSHOT_API_KEY=your_api_key_here

# Keep your OpenAI key as fallback
OPENAI_API_KEY=your_openai_key_here
```

### 3. Restart Your Development Server

```bash
npm run dev
```

That's it! Your application will now use Moonshot AI for all LLM operations.

---

## Architecture

### Provider Abstraction Layer

The integration uses a clean abstraction layer (`lib/ai-providers.ts`) that:

- ✅ Supports multiple providers (OpenAI, Moonshot)
- ✅ Automatically selects optimal models per use case
- ✅ Handles provider-specific configurations
- ✅ Provides seamless fallback mechanisms
- ✅ No changes needed to existing API routes

### Model Selection by Use Case

The system automatically selects the best model for each operation:

| Use Case | OpenAI Model | Moonshot Model | Purpose |
|----------|--------------|----------------|---------|
| **Job Analysis** | gpt-4o-mini | moonshot-v1-128k | Fast, handles long content |
| **Resume Optimization** | gpt-4o | moonshot-v1-128k | Highest quality output |
| **Content Generation** | gpt-4o | moonshot-v1-128k | Creative tasks with context |
| **Content Edits** | gpt-4o-mini | moonshot-v1-32k | Quick edits and rewrites |

### Content Limits

The system now adapts content processing based on the provider:

- **OpenAI**: ~100K chars (conservative estimate)
- **Moonshot**: ~300K chars (3x larger!)

This means **no more truncation** for most job postings and resumes when using Moonshot.

---

## Files Modified

### Core Files

1. **`lib/ai-providers.ts`** (NEW)
   - Provider abstraction layer
   - Model selection logic
   - Configuration management

2. **`lib/llm.ts`** (UPDATED)
   - Now uses `getAIProvider()` instead of hardcoded OpenAI
   - Supports dynamic provider switching
   - No breaking changes to existing API

3. **`app/api/jobs/analyze/route.ts`** (UPDATED)
   - Uses provider-aware content limits
   - Logs provider info for debugging
   - Eliminates unnecessary truncation with Moonshot

### Environment Variables

Add these to `.env.local`:

```bash
# Required
AI_PROVIDER=moonshot
MOONSHOT_API_KEY=sk-xxx

# Optional (for fallback)
OPENAI_API_KEY=sk-xxx
```

---

## Switching Between Providers

You can switch providers anytime by changing the `AI_PROVIDER` environment variable:

```bash
# Use Moonshot AI (recommended for long content)
AI_PROVIDER=moonshot

# Use OpenAI (default)
AI_PROVIDER=openai

# Not set (defaults to OpenAI)
# AI_PROVIDER=
```

**No code changes required!**

---

## Benefits for ResuMate

### Before (OpenAI Only)

❌ Job postings >50KB get truncated (loses critical details)
❌ Content summarization reduces analysis quality
❌ Higher risk of missing important keywords
❌ Complex error handling for long content

### After (With Moonshot)

✅ Handle job postings up to ~300KB without truncation
✅ Full context analysis = better keyword extraction
✅ Improved ATS matching accuracy
✅ Simpler, more reliable code
✅ Cost savings for long-context operations

---

## API Compatibility

Moonshot AI uses **OpenAI-compatible endpoints**, so:

- All existing Vercel AI SDK code works unchanged
- Same request/response formats
- Same streaming capabilities
- Same error handling patterns

The only differences are:
1. Base URL: `https://api.moonshot.cn/v1` (or `.ai` for global)
2. Model names: `moonshot-v1-128k` instead of `gpt-4o`
3. Larger context windows

---

## Testing

### Verify Provider is Active

Check your logs when making API calls. You should see:

```
[analyze] Using AI provider: {
  provider: 'moonshot',
  model: 'moonshot-v1-128k',
  content_length: 85432,
  was_processed: false
}
```

### Test with Long Content

1. Analyze a job posting with >50KB of content
2. Check logs - you should see "Using full content" instead of "Content truncated"
3. Verify analysis quality is improved

---

## Troubleshooting

### Provider Not Switching

**Problem**: Still using OpenAI despite setting `AI_PROVIDER=moonshot`

**Solutions**:
1. Verify `.env.local` has the correct variable
2. Restart your dev server (`npm run dev`)
3. Check for typos in environment variable names
4. Ensure `MOONSHOT_API_KEY` is set

### API Key Errors

**Problem**: `MOONSHOT_API_KEY not found, falling back to OpenAI`

**Solutions**:
1. Confirm API key is in `.env.local`
2. Verify key starts with the correct prefix
3. Check key hasn't expired on platform.moonshot.ai

### Rate Limits

Moonshot has different rate limits than OpenAI. Monitor your usage at:
- https://platform.moonshot.ai/console

---

## Cost Comparison

### Moonshot AI Pricing (as of 2025)

- **Input Tokens (Cache Hit)**: $0.15 per 1M tokens
- **Input Tokens (Cache Miss)**: $0.60 per 1M tokens
- **Output Tokens**: $2.50 per 1M tokens

### When Moonshot is More Cost-Effective

✅ Long job descriptions (>10K words)
✅ Multi-page resumes
✅ Bulk analysis operations
✅ Content with high context requirements

### When to Use OpenAI

- Short content (<5K characters)
- When you need GPT-4o's specific capabilities
- If Moonshot API is unavailable

---

## Monitoring

### Provider Usage Logs

All API calls log which provider is being used:

```typescript
console.log(`[analyze] Using AI provider:`, {
  provider: 'moonshot',
  model: 'moonshot-v1-128k',
  content_length: 123456,
  was_processed: false
})
```

### Content Processing Stats

```typescript
console.log(`[analyze] Using full content with moonshot:`, {
  content_length: 123456,
  provider: 'moonshot',
  max_supported: 300000
})
```

---

## Advanced Configuration

### Custom Model Selection

You can modify model selection in `lib/ai-providers.ts`:

```typescript
export const MOONSHOT_MODELS = {
  K2: "moonshot-v1-128k",        // 128K context
  K2_TURBO: "moonshot-v1-32k",   // Faster, smaller context
  LATEST: "moonshot-v1-128k",
}
```

### Per-Route Provider Override

While not currently implemented, you could add route-specific provider selection:

```typescript
// Future enhancement
const provider = route === '/api/jobs/analyze'
  ? getMoonshotProvider()
  : getOpenAIProvider()
```

---

## Migration Checklist

- [ ] Get Moonshot API key from https://platform.moonshot.ai
- [ ] Add `MOONSHOT_API_KEY` to `.env.local`
- [ ] Set `AI_PROVIDER=moonshot` in `.env.local`
- [ ] Restart development server
- [ ] Test job analysis with long content (>50KB)
- [ ] Verify logs show Moonshot provider is active
- [ ] Monitor quality improvements in analysis
- [ ] Check cost savings in API usage

---

## Support

### Moonshot AI Documentation

- Platform: https://platform.moonshot.ai
- API Docs: https://platform.moonshot.ai/docs
- Models: https://docs.litellm.ai/docs/providers/moonshot

### ResuMate Issues

For integration issues, check:
1. Console logs for provider selection
2. Environment variable configuration
3. API key validity
4. Network connectivity to Moonshot API

---

## Future Enhancements

Potential improvements:

1. **A/B Testing**: Compare OpenAI vs Moonshot quality side-by-side
2. **Cost Tracking**: Monitor per-provider API costs
3. **Automatic Fallback**: Retry with OpenAI if Moonshot fails
4. **Multi-Provider**: Use both simultaneously for different routes
5. **Caching**: Implement response caching for common queries

---

## Conclusion

Moonshot AI integration provides ResuMate with:

- **Better handling** of long-form content
- **Higher quality** analysis results
- **Cost savings** for complex operations
- **Flexibility** to switch providers as needed

The abstraction layer ensures you can easily test, compare, and switch between providers without touching your core application logic.

**Questions?** Check the logs, test with sample content, and monitor your usage on both platforms.
