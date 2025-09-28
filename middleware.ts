import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// E2E test mode: only disable auth when running in a true test env
const E2E_MODE = process.env.E2E_TEST_MODE === "1"
const IS_TEST_ENV = process.env.NODE_ENV === "test"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/api/resumes(.*)",
  "/api/jobs(.*)",
  "/api/job-targets(.*)",
])

// Refuse to start if E2E mode is enabled outside of a test environment
if (E2E_MODE && !IS_TEST_ENV) {
  throw new Error(
    "E2E_TEST_MODE is enabled outside of NODE_ENV=\"test\". Refusing to start.",
  )
}

export default E2E_MODE && IS_TEST_ENV
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
