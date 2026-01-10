import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// E2E test mode: disable auth when explicitly enabled for tests
const E2E_MODE = process.env.E2E_TEST_MODE === "1"

// Protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/resumes(.*)",
])

// Webhook routes that should bypass Clerk middleware entirely
const isWebhookRoute = createRouteMatcher([
  "/api/webhooks(.*)",
])

export default E2E_MODE
  ? (() => NextResponse.next())
  : clerkMiddleware(async (auth, req) => {
      // Skip Clerk processing for webhook routes - they use their own auth (Svix signatures)
      if (isWebhookRoute(req)) {
        return NextResponse.next()
      }
      if (isProtectedRoute(req)) {
        await auth.protect()
      }
    })

export const config = {
  matcher: [
    // Exclude Next.js internals, static files, webhook routes, and Sentry monitoring
    "/((?!.+\\.[\\w]+$|_next|api/webhooks|monitoring).*)",
    "/",
    // API routes EXCEPT webhooks (webhooks use Svix auth, not Clerk)
    "/(api(?!/webhooks)|trpc)(.*)",
  ],
}
