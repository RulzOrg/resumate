import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getResumeById, getOrCreateUser } from "@/lib/db"
import { getSignedDownloadUrl } from "@/lib/storage"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    
    // Ensure DB user exists
    const user = await getOrCreateUser()
    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Get resume and verify ownership
    const resume = await getResumeById(id, user.id)
    
    if (!resume) {
      return new NextResponse("Resume not found", { status: 404 })
    }

    // Try to get key from source_metadata first
    let key = resume.source_metadata?.key as string | undefined

    // Fallback: Parse from file_url if needed (e.g. if source_metadata is missing)
    if (!key && resume.file_url) {
      try {
        const url = new URL(resume.file_url)
        // Extract key from pathname (remove leading slash)
        // Handles paths like /bucket/key or just /key depending on config
        const pathParts = url.pathname.split('/').filter(Boolean)
        
        // Simple heuristic: if R2/S3 URL usually ends with the key
        // For custom domains, pathname is usually the key
        // For standard S3 URLs: /bucket/key
        // For R2 subdomain: /key
        
        // We'll rely on source_metadata primarily as it's most reliable
        // If that fails, we can't securely generate a signed URL without guessing the key structure
        // So for now, we'll log a warning and return 404 if key is missing
      } catch (e) {
        console.warn(`[Resume View] Failed to parse file_url for resume ${id}`)
      }
    }

    if (!key) {
      console.error(`[Resume View] No storage key found for resume ${id}`)
      return new NextResponse("File storage key not found", { status: 404 })
    }

    // Generate signed URL (valid for 5 minutes)
    const url = await getSignedDownloadUrl(key, 300)
    
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[Resume View] Error generating signed URL:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
