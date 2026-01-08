#!/usr/bin/env tsx
/**
 * Test script for Beehiiv integration
 * Usage: npm run test-beehiiv [test-email]
 * Or: dotenv -e .env.local tsx scripts/test-beehiiv.ts [test-email]
 */

import {
  initBeehiiv,
  validateBeehiivConfig,
  isBeehiivEnabled,
  subscribeUser,
  getSubscriberByEmail,
  unsubscribeUser,
  safeBeehiivOperation,
} from "../lib/beehiiv"

async function main() {
  console.log("🧪 Testing Beehiiv Integration\n")
  console.log("=" .repeat(60))

  // Step 1: Initialize
  console.log("\n1️⃣  Initializing Beehiiv...")
  initBeehiiv()

  // Step 2: Check if enabled
  console.log("\n2️⃣  Checking configuration...")
  const enabled = isBeehiivEnabled()
  console.log(`   Beehiiv Enabled: ${enabled ? "✅ YES" : "❌ NO"}`)

  if (!enabled) {
    console.log("\n⚠️  Beehiiv is not enabled. Set BEEHIIV_ENABLED=true in your .env.local")
    console.log("   Also ensure BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID are set.")
    process.exit(1)
  }

  // Step 3: Validate config
  console.log("\n3️⃣  Validating configuration...")
  const validation = validateBeehiivConfig()
  
  if (validation.errors.length > 0) {
    console.log("   ❌ Configuration Errors:")
    validation.errors.forEach((err) => console.log(`      - ${err}`))
    process.exit(1)
  }
  
  if (validation.warnings.length > 0) {
    console.log("   ⚠️  Warnings:")
    validation.warnings.forEach((warn) => console.log(`      - ${warn}`))
  }
  
  if (validation.valid) {
    console.log("   ✅ Configuration is valid")
  }

  // Step 4: Test with a provided email or use a test email
  const testEmail = process.argv[2] || `test-${Date.now()}@example.com`
  
  console.log("\n4️⃣  Testing subscriber operations...")
  console.log(`   Using test email: ${testEmail}`)
  
  // Test subscription using safeBeehiivOperation
  console.log("\n   📧 Testing subscription...")
  const subscribeResult = await safeBeehiivOperation(
    () => subscribeUser({
      email: testEmail,
      firstName: "Test",
      lastName: "User",
      utmSource: "test_script",
      sendWelcomeEmail: false, // Don't spam during tests
    }),
    "test_subscribe"
  )

  if (subscribeResult.success) {
    console.log(`   ✅ Successfully subscribed: ${testEmail}`)
    console.log(`      Subscriber ID: ${subscribeResult.data.id}`)
    console.log(`      Status: ${subscribeResult.data.status}`)
    
    // Test getting subscriber
    console.log("\n   🔍 Testing get subscriber...")
    const getResult = await getSubscriberByEmail(testEmail)
    
    if (getResult.success) {
      console.log(`   ✅ Successfully retrieved subscriber`)
      console.log(`      ID: ${getResult.data.id}`)
      console.log(`      Email: ${getResult.data.email}`)
      console.log(`      Status: ${getResult.data.status}`)
      console.log(`      Created: ${new Date(getResult.data.created * 1000).toISOString()}`)
    } else {
      console.log(`   ❌ Failed to retrieve subscriber: ${getResult.error.message}`)
    }

    // Clean up: Unsubscribe the test user (if using a test email)
    if (testEmail.includes("@example.com") || testEmail.includes("test-")) {
      console.log("\n   🧹 Cleaning up test subscriber...")
      const unsubResult = await unsubscribeUser(subscribeResult.data.id)
      
      if (unsubResult.success) {
        console.log(`   ✅ Successfully unsubscribed test user`)
      } else {
        console.log(`   ⚠️  Failed to unsubscribe: ${unsubResult.error.message}`)
        console.log(`      You may need to manually remove: ${testEmail}`)
      }
    } else {
      console.log("\n   ℹ️  Skipping cleanup for non-test email")
      console.log(`      Email ${testEmail} remains subscribed`)
    }
  } else {
    console.log(`   ❌ Subscription failed: ${subscribeResult.error.message}`)
    console.log(`      Error Code: ${subscribeResult.error.error}`)
    console.log(`      Status Code: ${subscribeResult.error.statusCode}`)
    
    if (subscribeResult.error.statusCode === 401) {
      console.log("\n   💡 Tip: Check that your BEEHIIV_API_KEY is correct and has write permissions")
    } else if (subscribeResult.error.statusCode === 404) {
      console.log("\n   💡 Tip: Check that your BEEHIIV_PUBLICATION_ID is correct")
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("🎉 Beehiiv test complete!\n")
}

main().catch((error) => {
  console.error("\n❌ Test failed with unexpected error:")
  console.error(error)
  process.exit(1)
})

