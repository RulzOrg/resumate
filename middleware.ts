import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// E2E test mode: disable auth when explicitly enabled for tests
const E2E_MODE = process.env.E2E_TEST_MODE === "1"

// Protected routes that require authentication (pages only, not API routes)
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
])

// API routes that need Clerk auth check (not admin - those handle their own auth)
const isProtectedApiRoute = createRouteMatcher([
  "/api/resumes(.*)",
])

// Webhook routes that should bypass Clerk middleware entirely
const isWebhookRoute = createRouteMatcher([
  "/api/webhooks(.*)",
])

// Admin API routes - these handle their own auth via verifyAdminAccess()
const isAdminApiRoute = createRouteMatcher([
  "/api/admin(.*)",
])

export default E2E_MODE
  ? (() => NextResponse.next())
  : clerkMiddleware(async (auth, req) => {
      // Skip Clerk processing for webhook routes - they use their own auth (Svix signatures)
      if (isWebhookRoute(req)) {
        return NextResponse.next()
      }
      // Skip Clerk protect for admin API routes - they handle their own auth
      if (isAdminApiRoute(req)) {
        return NextResponse.next()
      }
      if (isProtectedRoute(req) || isProtectedApiRoute(req)) {
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
