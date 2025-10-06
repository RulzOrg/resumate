import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { getUserByClerkId } from "@/lib/db"

// E2E test mode: disable auth when explicitly enabled for tests
const E2E_MODE = process.env.E2E_TEST_MODE === "1"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/api/resumes(.*)",
  "/api/jobs(.*)",
  "/api/job-targets(.*)",
])

const isAdminRoute = createRouteMatcher([
  "/dashboard/admin(.*)",
  "/api/admin(.*)",
])

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"])

export default E2E_MODE
  ? (() => NextResponse.next())
  : clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect()
        
        // Check admin access for admin routes
        if (isAdminRoute(req)) {
          const { userId } = await auth()
          if (userId) {
            try {
              const { clerkClient } = await import("@clerk/nextjs/server")
              const clerk = await clerkClient()
              const user = await clerk.users.getUser(userId)
              
              if (user.publicMetadata?.role !== "admin") {
                const dashboardUrl = new URL("/dashboard", req.url)
                return NextResponse.redirect(dashboardUrl)
              }
            } catch (error) {
              console.error("Error checking admin status:", error)
              const dashboardUrl = new URL("/dashboard", req.url)
              return NextResponse.redirect(dashboardUrl)
            }
          }
        }
        
        // Check if user needs onboarding (except for onboarding routes, admin routes, and API routes)
        const { userId } = await auth()
        if (userId && !isOnboardingRoute(req) && !isAdminRoute(req) && !req.nextUrl.pathname.startsWith("/api/")) {
          try {
            const user = await getUserByClerkId(userId)
            
            // Redirect to onboarding if user hasn't completed it
            if (user && !user.onboarding_completed_at) {
              const onboardingUrl = new URL("/onboarding", req.url)
              return NextResponse.redirect(onboardingUrl)
            }
          } catch (error) {
            console.error("Error checking onboarding status:", error)
            // Allow request to continue on error to avoid blocking user
          }
        }
      }
    })

export const config = {
  matcher: [
    // Exclude Next.js internals and any path with a file extension
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
