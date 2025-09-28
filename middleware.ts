import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// E2E test mode: disable auth when explicitly enabled for tests
const E2E_MODE = process.env.E2E_TEST_MODE === "1"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/api/resumes(.*)",
  "/api/jobs(.*)",
  "/api/job-targets(.*)",
])

export default E2E_MODE
  ? (() => NextResponse.next())
  : clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect()
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
