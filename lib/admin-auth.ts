import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { sql } from "./db"

// Admin emails - should be set in environment variables
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : []

export interface AdminUser {
  id: string
  clerkId: string
  email: string
  name: string
  isAdmin: boolean
}

interface DbUser {
  id: string
  email: string
  name: string
  clerk_user_id: string
}

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Helper to get user by Clerk ID
 */
async function getUserByClerkId(clerkUserId: string): Promise<DbUser | null> {
  try {
    const users = await sql<DbUser>`
      SELECT id, email, name, clerk_user_id
      FROM users_sync
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `
    return users[0] || null
  } catch (error) {
    console.error("Error fetching user by Clerk ID:", error)
    return null
  }
}

/**
 * Get the current admin user or redirect to login
 * Use this in admin pages to protect them
 */
export async function requireAdminAuth(): Promise<AdminUser> {
  const { userId } = await auth()

  if (!userId) {
    redirect("/auth/login")
  }

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress

  if (!email || !isAdminEmail(email)) {
    redirect("/dashboard")
  }

  // Get user from database
  const dbUser = await getUserByClerkId(userId)

  if (!dbUser) {
    redirect("/dashboard")
  }

  return {
    id: dbUser.id,
    clerkId: userId,
    email: dbUser.email,
    name: dbUser.name,
    isAdmin: true,
  }
}

/**
 * Check if current user is admin (for API routes)
 * Returns null if not admin
 */
export async function getAdminSession(): Promise<AdminUser | null> {
  const { userId } = await auth()

  console.log("[AdminAuth] userId:", userId)

  if (!userId) {
    console.log("[AdminAuth] No userId found - user not authenticated")
    return null
  }

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress

  console.log("[AdminAuth] User email:", email)
  console.log("[AdminAuth] Admin emails configured:", ADMIN_EMAILS)
  console.log("[AdminAuth] Is admin email:", isAdminEmail(email))

  if (!email || !isAdminEmail(email)) {
    console.log("[AdminAuth] Email not in admin list")
    return null
  }

  const dbUser = await getUserByClerkId(userId)

  if (!dbUser) {
    return null
  }

  return {
    id: dbUser.id,
    clerkId: userId,
    email: dbUser.email,
    name: dbUser.name,
    isAdmin: true,
  }
}

/**
 * Verify admin access for API routes
 * Throws an error if not admin
 */
export async function verifyAdminAccess(): Promise<AdminUser> {
  const admin = await getAdminSession()

  if (!admin) {
    throw new Error("Unauthorized: Admin access required")
  }

  return admin
}
