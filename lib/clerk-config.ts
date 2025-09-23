// Clerk configuration and utilities
export const clerkConfig = {
  // Sign in/up pages
  signInUrl: "/auth/login",
  signUpUrl: "/auth/signup",
  afterSignInUrl: "/dashboard",
  afterSignUpUrl: "/dashboard",

  // Protected routes
  publicRoutes: ["/", "/auth/login", "/auth/signup", "/pricing", "/api/webhooks/clerk"],

  // Routes that should redirect to sign-in if not authenticated
  protectedRoutes: ["/dashboard", "/api/resumes", "/api/jobs"],
}

// Helper function to check if a route is protected
export function isProtectedRoute(pathname: string): boolean {
  return clerkConfig.protectedRoutes.some((route) => pathname.startsWith(route))
}

// Helper function to check if a route is public
export function isPublicRoute(pathname: string): boolean {
  return clerkConfig.publicRoutes.some(
    (route) => route === pathname || (route.endsWith("*") && pathname.startsWith(route.slice(0, -1))),
  )
}
