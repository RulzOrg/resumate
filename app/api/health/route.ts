import { NextResponse } from "next/server"

/**
 * Health check endpoint for connection status monitoring
 *
 * GET /api/health
 *
 * Returns a simple 200 OK response to verify API connectivity.
 * Used by the connection status indicator to verify internet access.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // Prevent caching
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  )
}

// Also support HEAD requests for lightweight pings
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
