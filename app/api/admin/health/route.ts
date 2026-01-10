import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface ServiceStatus {
  name: string
  status: "healthy" | "degraded" | "down"
  latency?: number
  message?: string
  lastChecked: string
}

export async function GET() {
  try {
    await verifyAdminAccess()

    const services: ServiceStatus[] = []
    const startTime = Date.now()

    // Check Database
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbLatency = Date.now() - dbStart

      services.push({
        name: "PostgreSQL Database",
        status: dbLatency > 1000 ? "degraded" : "healthy",
        latency: dbLatency,
        message: dbLatency > 1000 ? "High latency detected" : "Connected",
        lastChecked: new Date().toISOString(),
      })
    } catch (error) {
      services.push({
        name: "PostgreSQL Database",
        status: "down",
        message: error instanceof Error ? error.message : "Connection failed",
        lastChecked: new Date().toISOString(),
      })
    }

    // Check Clerk (by verifying environment vars)
    const clerkConfigured = !!(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
    )
    services.push({
      name: "Clerk Authentication",
      status: clerkConfigured ? "healthy" : "down",
      message: clerkConfigured ? "Configured" : "Missing API keys",
      lastChecked: new Date().toISOString(),
    })

    // Check OpenAI (environment check)
    const openaiConfigured = !!process.env.OPENAI_API_KEY
    services.push({
      name: "OpenAI API",
      status: openaiConfigured ? "healthy" : "down",
      message: openaiConfigured ? "Configured" : "Missing API key",
      lastChecked: new Date().toISOString(),
    })

    // Check Polar (environment check)
    const polarConfigured = !!process.env.POLAR_API_KEY
    services.push({
      name: "Polar Payments",
      status: polarConfigured ? "healthy" : "down",
      message: polarConfigured ? "Configured" : "Missing API key",
      lastChecked: new Date().toISOString(),
    })

    // Check Qdrant (environment check)
    const qdrantConfigured = !!(process.env.QDRANT_URL && process.env.QDRANT_API_KEY)
    services.push({
      name: "Qdrant Vector DB",
      status: qdrantConfigured ? "healthy" : "degraded",
      message: qdrantConfigured ? "Configured" : "Missing configuration",
      lastChecked: new Date().toISOString(),
    })

    // Check Supabase (environment check)
    const supabaseConfigured = !!(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY
    )
    services.push({
      name: "Supabase Storage",
      status: supabaseConfigured ? "healthy" : "down",
      message: supabaseConfigured ? "Configured" : "Missing configuration",
      lastChecked: new Date().toISOString(),
    })

    // Get database statistics
    const [
      totalUsers,
      totalResumes,
      pendingResumes,
      failedResumes,
    ] = await Promise.all([
      prisma.userSync.count({ where: { deletedAt: null } }),
      prisma.resume.count({ where: { deletedAt: null } }),
      prisma.resume.count({ where: { processingStatus: "pending", deletedAt: null } }),
      prisma.resume.count({ where: { processingStatus: "failed", deletedAt: null } }),
    ])

    const totalLatency = Date.now() - startTime
    const healthyCount = services.filter(s => s.status === "healthy").length
    const overallStatus = healthyCount === services.length
      ? "healthy"
      : healthyCount >= services.length / 2
      ? "degraded"
      : "down"

    return NextResponse.json({
      status: overallStatus,
      services,
      database: {
        totalUsers,
        totalResumes,
        pendingResumes,
        failedResumes,
      },
      meta: {
        checkDuration: totalLatency,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    console.error("Admin health check error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Health check failed" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
