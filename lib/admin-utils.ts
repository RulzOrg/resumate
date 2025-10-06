import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

/**
 * Checks if the current user is an admin
 * Reads from Clerk publicMetadata.role
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth()
    if (!userId) return false

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    
    return user.publicMetadata?.role === "admin"
  } catch (error) {
    console.error("[ADMIN_AUTH] Error checking admin status:", error)
    return false
  }
}

/**
 * Requires admin access - redirects to dashboard if not admin
 * Use in server components and route handlers
 */
export async function requireAdmin() {
  const adminStatus = await isAdmin()
  
  if (!adminStatus) {
    redirect("/dashboard")
  }
}

/**
 * Requires admin access for API routes
 * Returns 403 error instead of redirecting
 */
export async function requireAdminAPI() {
  const adminStatus = await isAdmin()
  
  if (!adminStatus) {
    return {
      authorized: false,
      error: { message: "Forbidden: Admin access required", status: 403 }
    }
  }
  
  return { authorized: true }
}

/**
 * Get current admin user's Clerk ID for audit logging
 */
export async function getCurrentAdminUserId(): Promise<string | null> {
  try {
    const { userId } = await auth()
    const adminStatus = await isAdmin()
    
    if (!userId || !adminStatus) return null
    
    return userId
  } catch (error) {
    console.error("[ADMIN_AUTH] Error getting admin user ID:", error)
    return null
  }
}
