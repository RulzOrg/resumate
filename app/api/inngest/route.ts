import { NextRequest, NextResponse } from "next/server"

/**
 * Inngest health check endpoint
 * Returns 200 to prevent 404 logs from Inngest discovery requests
 */
export async function GET(request: NextRequest) {
  // Silently handle Inngest health checks
  return NextResponse.json({ status: "ok" }, { status: 200 })
}

export async function POST(request: NextRequest) {
  // Silently handle Inngest webhook requests (if not configured)
  return NextResponse.json({ status: "ok" }, { status: 200 })
}



