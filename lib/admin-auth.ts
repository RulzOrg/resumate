import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "./prisma"

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

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
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
  const dbUser = await prisma.userSync.findFirst({
    where: { clerkUserId: userId },
  })

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

  if (!userId) {
    return null
  }

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress

  if (!email || !isAdminEmail(email)) {
    return null
  }

  const dbUser = await prisma.userSync.findFirst({
    where: { clerkUserId: userId },
  })

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
