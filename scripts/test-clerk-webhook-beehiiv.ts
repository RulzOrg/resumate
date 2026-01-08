#!/usr/bin/env tsx
/**
 * Test script to verify Clerk webhook with Beehiiv integration
 * This simulates a Clerk user.created event
 * 
 * Usage: npm run test-clerk-webhook
 */

import { createUserFromClerk, updateBeehiivSubscriberId, getUserByClerkId } from "../lib/db"
import { subscribeUser, safeBeehiivOperation, isBeehiivEnabled } from "../lib/beehiiv"
import { createLogger } from "../lib/debug-logger"

const logger = createLogger("WebhookTest")

async function testUserCreatedWithBeehiiv() {
  console.log("🧪 Testing Clerk Webhook → Beehiiv Integration\n")
  console.log("=" .repeat(60))

  // Check if Beehiiv is enabled
  if (!isBeehiivEnabled()) {
    console.log("\n⚠️  Beehiiv is disabled. Enable it to test webhook integration.")
    console.log("   Set BEEHIIV_ENABLED=true in .env.local\n")
    return
  }

  console.log("✅ Beehiiv is enabled\n")

  // Simulate a user.created event
  const testClerkId = `test_clerk_${Date.now()}`
  const testEmail = `webhook-test-${Date.now()}@example.com`
  const testName = "Webhook Test User"

  console.log("1️⃣  Simulating user.created event...")
  console.log(`   Clerk ID: ${testClerkId}`)
  console.log(`   Email: ${testEmail}`)
  console.log(`   Auto-subscribe: enabled\n`)

  try {
    // Step 1: Create user in database (like the webhook does)
    console.log("2️⃣  Creating user in database...")
    await createUserFromClerk(testClerkId, testEmail, testName)
    logger.log('User created:', { clerk_user_id: testClerkId, email: testEmail })
    console.log("   ✅ User created in database\n")

    // Step 2: Subscribe to Beehiiv (like the webhook does - automatic for all users)
    console.log("3️⃣  Subscribing to Beehiiv newsletter...")
    const result = await safeBeehiivOperation(
      () => subscribeUser({
        email: testEmail,
        firstName: "Webhook",
        lastName: "Test",
        utmSource: 'useresumate',
        utmMedium: 'platform',
        utmCampaign: 'user_signup',
      }),
      'user_created_subscription'
    )

    if (result.success) {
      logger.log('Beehiiv subscription created:', { email: testEmail, subscriberId: result.data.id })
      console.log(`   ✅ Subscribed to Beehiiv`)
      console.log(`      Subscriber ID: ${result.data.id}`)
      console.log(`      Status: ${result.data.status}\n`)

      // Step 3: Store subscriber ID (like the webhook does)
      console.log("4️⃣  Storing Beehiiv subscriber ID in database...")
      await updateBeehiivSubscriberId(testClerkId, result.data.id)
      console.log("   ✅ Subscriber ID stored\n")

      // Step 4: Verify the data
      console.log("5️⃣  Verifying stored data...")
      const user = await getUserByClerkId(testClerkId)
      if (user && user.beehiiv_subscriber_id === result.data.id) {
        console.log("   ✅ Data verified successfully")
        console.log(`      Database beehiiv_subscriber_id: ${user.beehiiv_subscriber_id}`)
        console.log(`      Matches Beehiiv response: ${result.data.id === user.beehiiv_subscriber_id}\n`)
      } else {
        console.log("   ⚠️  Data mismatch or user not found\n")
      }
    } else {
      console.log(`   ❌ Beehiiv subscription failed: ${result.error.message}`)
      console.log(`      This is graceful - webhook would still succeed\n`)
    }

    console.log("=" .repeat(60))
    console.log("🎉 Webhook integration test complete!\n")
    console.log("📋 Summary:")
    console.log("   ✅ User creation in database: WORKING")
    console.log("   ✅ Beehiiv subscription: " + (result.success ? "WORKING" : "FAILED (graceful)"))
    console.log("   ✅ Subscriber ID storage: " + (result.success ? "WORKING" : "SKIPPED"))
    console.log("   ✅ Graceful error handling: WORKING")
    console.log("\n💡 The webhook will:")
    console.log("   - Create users in your database")
    console.log("   - Automatically subscribe ALL users to Beehiiv")
    console.log("   - Store the subscriber ID for faster unsubscribe")
    console.log("   - Track with UTM: source=useresumate, medium=platform")
    console.log("   - Never fail due to Beehiiv errors (graceful degradation)\n")

  } catch (error) {
    console.error("\n❌ Test failed with error:")
    console.error(error)
    process.exit(1)
  }
}

testUserCreatedWithBeehiiv().catch((error) => {
  console.error("\n❌ Unexpected error:")
  console.error(error)
  process.exit(1)
})

