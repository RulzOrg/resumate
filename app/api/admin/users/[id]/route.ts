import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Get user details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAccess()
    const { id } = await params

    const user = await prisma.userSync.findUnique({
      where: { id },
      include: {
        resumes: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            kind: true,
            processingStatus: true,
            createdAt: true,
          },
        },
        jobAnalyses: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            createdAt: true,
          },
        },
        pendingPolarSubscriptions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            resumes: true,
            jobAnalyses: true,
            resumeVersions: true,
            jobApplications: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Admin user detail error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

// Update user (subscription status, plan, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAccess()
    const { id } = await params
    const body = await request.json()

    const allowedFields = [
      "subscriptionStatus",
      "subscriptionPlan",
      "subscriptionPeriodEnd",
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Map camelCase to snake_case for Prisma
        const prismaField = field === "subscriptionStatus" ? "subscriptionStatus" :
                           field === "subscriptionPlan" ? "subscriptionPlan" :
                           field === "subscriptionPeriodEnd" ? "subscriptionPeriodEnd" : field
        updates[prismaField] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const updatedUser = await prisma.userSync.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Admin user update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

// Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAccess()
    const { id } = await params

    const searchParams = request.nextUrl.searchParams
    const hardDelete = searchParams.get("hard") === "true"

    const user = await prisma.userSync.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (hardDelete) {
      // Hard delete - cascades to all related records
      await prisma.userSync.delete({
        where: { id },
      })

      return NextResponse.json({
        message: "User permanently deleted",
        deletedUser: { id, email: user.email },
      })
    } else {
      // Soft delete
      const updatedUser = await prisma.userSync.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return NextResponse.json({
        message: "User soft deleted",
        user: updatedUser,
      })
    }
  } catch (error) {
    console.error("Admin user delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
