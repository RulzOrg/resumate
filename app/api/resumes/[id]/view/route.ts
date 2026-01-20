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

    console.log(`[Resume View] Resume ${id}:`, {
      has_source_metadata: !!resume.source_metadata,
      source_metadata_key: key,
      file_url: resume.file_url,
      file_name: resume.file_name,
    })

    // Fallback: Parse key from file_url if source_metadata is missing
    if (!key && resume.file_url) {
      try {
        const url = new URL(resume.file_url)
        // For Supabase Storage URLs, the path structure is:
        // /storage/v1/object/sign/{bucket}/{key}?token=...
        // or /storage/v1/object/public/{bucket}/{key}
        // For signed URLs, we need to extract the key from the path
        const pathParts = url.pathname.split('/').filter(Boolean)

        // Check if it's a Supabase storage URL
        if (pathParts[0] === 'storage' && pathParts[1] === 'v1' && pathParts[2] === 'object') {
          // Format: storage/v1/object/{sign|public}/{bucket}/{key...}
          // The key is everything after the bucket name (index 4+)
          if (pathParts.length > 4) {
            key = pathParts.slice(4).join('/')
            console.log(`[Resume View] Extracted key from Supabase URL: ${key}`)
          }
        } else {
          // Generic fallback: assume the path is the key (remove leading slash)
          key = url.pathname.replace(/^\//, '')
          console.log(`[Resume View] Extracted key from generic URL: ${key}`)
        }
      } catch (e) {
        console.warn(`[Resume View] Failed to parse file_url for resume ${id}:`, e)
      }
    }

    if (!key) {
      console.error(`[Resume View] No storage key found for resume ${id}`, {
        source_metadata: resume.source_metadata,
        file_url: resume.file_url,
      })
      return new NextResponse("File storage key not found", { status: 404 })
    }

    console.log(`[Resume View] Using key: ${key}`)

    // Generate signed URL (valid for 5 minutes)
    try {
      const url = await getSignedDownloadUrl(key, 300)
      console.log(`[Resume View] Generated signed URL successfully for resume ${id}`)
      return NextResponse.json({ url })
    } catch (storageError) {
      console.error(`[Resume View] Failed to generate signed URL for resume ${id}:`, storageError)
      return new NextResponse("Failed to generate preview URL", { status: 500 })
    }
  } catch (error) {
    console.error("[Resume View] Unexpected error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
