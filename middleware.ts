import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { getUserByClerkId } from "@/lib/db"

// E2E test mode: disable auth when explicitly enabled for tests
const E2E_MODE = process.env.E2E_TEST_MODE === "1"

// Protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/api/resumes(.*)",
  "/api/jobs(.*)",
  "/api/job-targets(.*)",
])

// Public routes (no authentication required):
// - / (landing page)
// - /resume-builder (lead magnet)
// - /api/public/* (public API endpoints)
// - /pricing, /auth/*, etc.

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"])

export default E2E_MODE
  ? (() => NextResponse.next())
  : clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect()
        
        // Check if user needs onboarding (except for onboarding routes and API routes)
        const { userId } = await auth()
        if (userId && !isOnboardingRoute(req) && !req.nextUrl.pathname.startsWith("/api/")) {
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
