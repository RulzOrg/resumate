/**
 * Check environment configuration for LlamaParse
 */

function checkEnv() {
  console.log("🔍 Checking LlamaParse Configuration\n")
  console.log("=" .repeat(60))

  // Check required variables
  const llamaApiKey = process.env.LLAMACLOUD_API_KEY
  console.log("\n📋 Required Variables:")
  console.log(`   LLAMACLOUD_API_KEY: ${llamaApiKey ? "✅ SET (" + llamaApiKey.substring(0, 10) + "...)" : "❌ NOT SET"}`)

  // Check optional variables with defaults
  console.log("\n⚙️  Optional Variables (with defaults):")
  const configs = {
    LLAMAPARSE_MODE: process.env.LLAMAPARSE_MODE || "fast",
    LLAMAPARSE_ESCALATE_MODE: process.env.LLAMAPARSE_ESCALATE_MODE || "accurate",
    LLAMAPARSE_TIMEOUT_MS: process.env.LLAMAPARSE_TIMEOUT_MS || "45000",
    LLAMAPARSE_MAX_PAGES: process.env.LLAMAPARSE_MAX_PAGES || "20",
    LLAMAPARSE_MIN_CHARS: process.env.LLAMAPARSE_MIN_CHARS || "100",
    LLAMAPARSE_MIN_CHARS_PER_PAGE: process.env.LLAMAPARSE_MIN_CHARS_PER_PAGE || "200",
    EXTRACTOR_URL: process.env.EXTRACTOR_URL || "(not set - fallback disabled)",
  }

  Object.entries(configs).forEach(([key, value]) => {
    const isSet = process.env[key]
    console.log(`   ${key.padEnd(30)}: ${value}${isSet ? "" : " (default)"}`)
  })

  // Check other relevant variables
  console.log("\n🗄️  Storage Configuration:")
  console.log(`   R2_ENDPOINT: ${process.env.R2_ENDPOINT ? "✅ SET" : "❌ NOT SET"}`)
  console.log(`   R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? "✅ SET" : "❌ NOT SET"}`)
  console.log(`   R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? "✅ SET" : "❌ NOT SET"}`)

  console.log("\n" + "=".repeat(60))

  // Warnings
  console.log("\n⚠️  Warnings:")
  if (!llamaApiKey) {
    console.log("   • LlamaParse will NOT work without LLAMACLOUD_API_KEY")
    console.log("   • System will fall back to EXTRACTOR_URL if configured")
  }
  
  if (!process.env.EXTRACTOR_URL && !llamaApiKey) {
    console.log("   • ⚠️  CRITICAL: No extraction method configured!")
    console.log("   • Set either LLAMACLOUD_API_KEY or EXTRACTOR_URL")
  }

  if (!process.env.R2_ENDPOINT) {
    console.log("   • R2/S3 storage not configured - uploads will fail")
  }

  console.log("\n✅ Next Steps:")
  if (!llamaApiKey) {
    console.log("   1. Get API key from https://cloud.llamaindex.ai")
    console.log("   2. Add to .env.local: LLAMACLOUD_API_KEY=llx-...")
    console.log("   3. Restart dev server")
  } else {
    console.log("   • Configuration looks good!")
    console.log("   • LlamaParse is ready to use")
  }
  console.log("")
}

checkEnv()
