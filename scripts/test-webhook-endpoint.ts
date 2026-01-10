#!/usr/bin/env tsx
/**
 * Test the actual webhook HTTP endpoint
 * This simulates what Clerk sends to our webhook
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testWebhookEndpoint() {
  console.log("🧪 Testing Clerk Webhook HTTP Endpoint\n")
  console.log("=" .repeat(60))
  console.log(`Endpoint: ${BASE_URL}/api/webhooks/clerk\n`)

  const testClerkId = `test_http_${Date.now()}`
  const testEmail = `http-webhook-test-${Date.now()}@example.com`

  // Simulate Clerk user.created webhook payload
  const payload = {
    type: "user.created",
    data: {
      id: testClerkId,
      email_addresses: [
        { email_address: testEmail }
      ],
      first_name: "HTTP",
      last_name: "Test",
      full_name: "HTTP Test User",
    }
  }

  console.log("1️⃣  Sending webhook payload...")
  console.log(`   Clerk ID: ${testClerkId}`)
  console.log(`   Email: ${testEmail}\n`)

  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Skip Svix verification for local testing (no secret configured)
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    console.log("2️⃣  Response received:")
    console.log(`   Status: ${response.status}`)
    console.log(`   Body: ${JSON.stringify(data)}\n`)

    if (response.ok && data.ok) {
      console.log("✅ Webhook processed successfully!")
      console.log("\n3️⃣  Check server logs for Beehiiv status")
      console.log("   Look for: '[ClerkWebhook] Beehiiv config status'")
      console.log("   Look for: '[ClerkWebhook] Attempting Beehiiv subscription'")
      console.log("   Look for: '[ClerkWebhook] Beehiiv subscription FAILED' (if it failed)")
    } else {
      console.log("❌ Webhook failed!")
      console.log(`   Error: ${data.error || 'Unknown error'}`)
    }

    console.log("\n" + "=" .repeat(60))
    console.log("\n4️⃣  To verify, run: npx dotenv -e .env.local -- npx tsx scripts/check-beehiiv-signups.ts")
    console.log(`   Look for: ${testEmail}`)

  } catch (error) {
    console.error("\n❌ Request failed:", error)
    console.log("\n💡 Make sure the dev server is running: npm run dev")
  }
}

testWebhookEndpoint()
