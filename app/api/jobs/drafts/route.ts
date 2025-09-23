import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { handleApiError, AppError } from "@/lib/error-handler"

interface JobDraft {
  id: string
  jobUrl: string
  jobDescription: string
  detectedCompany?: string
  lastSaved: string
  autoSaveEnabled: boolean
}

// In-memory storage for drafts (in production, use Redis or database)
const drafts = new Map<string, JobDraft[]>()

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userDrafts = drafts.get(userId) || []
    
    // Return only recent drafts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentDrafts = userDrafts.filter(draft => 
      new Date(draft.lastSaved) > thirtyDaysAgo
    )

    return NextResponse.json({ drafts: recentDrafts })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error }, { status: errorInfo.statusCode })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { jobUrl, jobDescription, detectedCompany, autoSaveEnabled = true } = await request.json()

    if (!jobDescription || jobDescription.trim().length < 50) {
      throw new AppError("Draft content too short to save", 400)
    }

    const userDrafts = drafts.get(userId) || []
    
    // Generate draft ID based on content hash to avoid duplicates
    const contentHash = Buffer.from(jobDescription.trim().substring(0, 100)).toString('base64').substring(0, 8)
    const draftId = `draft_${Date.now()}_${contentHash}`
    
    // Check if similar draft already exists (same URL or similar content)
    const existingDraftIndex = userDrafts.findIndex(draft => {
      if (jobUrl && draft.jobUrl && normalizeUrl(draft.jobUrl) === normalizeUrl(jobUrl)) {
        return true
      }
      // Check content similarity (first 200 chars)
      const draftStart = draft.jobDescription.trim().substring(0, 200)
      const currentStart = jobDescription.trim().substring(0, 200)
      return draftStart === currentStart
    })

    const newDraft: JobDraft = {
      id: draftId,
      jobUrl: jobUrl || '',
      jobDescription: jobDescription.trim(),
      detectedCompany,
      lastSaved: new Date().toISOString(),
      autoSaveEnabled
    }

    if (existingDraftIndex >= 0) {
      // Update existing draft
      userDrafts[existingDraftIndex] = newDraft
    } else {
      // Add new draft
      userDrafts.unshift(newDraft)
      
      // Keep only last 10 drafts per user
      if (userDrafts.length > 10) {
        userDrafts.splice(10)
      }
    }

    drafts.set(userId, userDrafts)

    return NextResponse.json({ 
      success: true, 
      draft: newDraft,
      message: existingDraftIndex >= 0 ? "Draft updated" : "Draft saved"
    })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error }, { status: errorInfo.statusCode })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const draftId = searchParams.get('id')

    if (!draftId) {
      throw new AppError("Draft ID required", 400)
    }

    const userDrafts = drafts.get(userId) || []
    const filteredDrafts = userDrafts.filter(draft => draft.id !== draftId)
    
    if (filteredDrafts.length === userDrafts.length) {
      throw new AppError("Draft not found", 404)
    }

    drafts.set(userId, filteredDrafts)

    return NextResponse.json({ success: true, message: "Draft deleted" })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json({ error: errorInfo.error }, { status: errorInfo.statusCode })
  }
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    urlObj.search = ''
    urlObj.hash = ''
    return urlObj.toString().toLowerCase()
  } catch {
    return url.toLowerCase().trim()
  }
}