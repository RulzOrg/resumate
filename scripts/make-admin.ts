/**
 * Script to make a user an admin by setting their Clerk publicMetadata
 * 
 * Usage:
 * 1. Find your Clerk User ID from Clerk Dashboard (starts with user_)
 * 2. Run: npx tsx scripts/make-admin.ts <user_id>
 * 
 * Example:
 * npx tsx scripts/make-admin.ts user_2abc123xyz
 */

import { clerkClient } from "@clerk/nextjs/server"

async function makeUserAdmin(userId: string) {
  if (!userId) {
    console.error("❌ Error: User ID is required")
    console.log("\nUsage: npx tsx scripts/make-admin.ts <user_id>")
    console.log("\nTo find your user ID:")
    console.log("1. Go to https://dashboard.clerk.com/")
    console.log("2. Navigate to Users")
    console.log("3. Click on your user")
    console.log("4. Copy the User ID (starts with user_)")
    process.exit(1)
  }

  if (!userId.startsWith("user_")) {
    console.error("❌ Error: Invalid user ID format. User ID should start with 'user_'")
    console.log(`\nReceived: ${userId}`)
    process.exit(1)
  }

  try {
    console.log(`🔍 Looking up user: ${userId}`)
    
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.emailAddresses[0]?.emailAddress})`)
    
    const currentRole = user.publicMetadata?.role
    if (currentRole === "admin") {
      console.log("ℹ️  User is already an admin")
      process.exit(0)
    }

    console.log("🔧 Setting admin role...")
    
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        role: "admin"
      }
    })

    console.log("✅ Successfully granted admin access!")
    console.log("\n📋 Next steps:")
    console.log("1. The user can now access /dashboard/admin")
    console.log("2. Admin sidebar menu item will be visible")
    console.log("3. User has full access to:")
    console.log("   - View all users")
    console.log("   - Delete users")
    console.log("   - Update subscriptions")
    console.log("   - View platform statistics")

  } catch (error: any) {
    console.error("❌ Error making user admin:", error.message)
    
    if (error.status === 404) {
      console.log("\n💡 User not found. Please check:")
      console.log("1. The user ID is correct")
      console.log("2. You're using the right Clerk environment (dev/prod)")
    } else if (error.status === 401 || error.status === 403) {
      console.log("\n💡 Authentication error. Please check:")
      console.log("1. CLERK_SECRET_KEY is set in .env.local")
      console.log("2. The secret key is valid and not expired")
    }
    
    process.exit(1)
  }
}

const userId = process.argv[2]
makeUserAdmin(userId)
