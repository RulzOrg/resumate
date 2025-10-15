import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserResumes, getOrCreateUser } from "@/lib/db"
import { indexResume } from "@/lib/resume-indexer"
import { AppError, handleApiError } from "@/lib/error-handler"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Get all user's resumes
    const allResumes = await getUserResumes(user.id)

    // Filter to only index MASTER resumes (kind='master' or 'uploaded')
    // Excludes: generated resumes, duplicates
    // Includes: ALL user master resumes (up to 3 per user)
    const resumes = allResumes.filter((r: any) =>
      r.kind === 'master' || r.kind === 'uploaded'
    )

    console.log(`[reindex-all] Found ${allResumes.length} total resumes, ${resumes.length} master resumes to index`)

    if (!resumes || resumes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No master resumes found to index",
        totalResumes: allResumes.length,
        indexed: 0,
        skipped: 0,
        failed: 0
      })
    }

    console.log(`[reindex-all] Starting bulk reindex for ${resumes.length} master resumes...`)

    const results = {
      totalResumes: resumes.length,
      indexed: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[]
    }

    // Index each resume
    for (const resume of resumes) {
      if (!resume.content_text || resume.content_text.length < 50) {
        results.skipped++
        results.details.push({
          resumeId: resume.id,
          title: resume.title,
          status: 'skipped',
          reason: 'Content too short or missing'
        })
        continue
      }

      try {
        const result = await indexResume({
          resumeId: resume.id,
          userId: user.id,
          content: resume.content_text,
          metadata: {
            file_name: resume.file_name,
            file_type: resume.file_type,
            title: resume.title,
            reindexed_at: new Date().toISOString()
          }
        })

        if (result.success) {
          results.indexed++
          results.details.push({
            resumeId: resume.id,
            title: resume.title,
            status: 'success',
            chunksIndexed: result.chunksIndexed
          })
          console.log(`[reindex-all] ✓ Indexed ${resume.id}: ${result.chunksIndexed} chunks`)
        } else {
          results.failed++
          results.details.push({
            resumeId: resume.id,
            title: resume.title,
            status: 'failed',
            error: result.error
          })
          console.warn(`[reindex-all] ✗ Failed to index ${resume.id}: ${result.error}`)
        }
      } catch (error: any) {
        results.failed++
        results.details.push({
          resumeId: resume.id,
          title: resume.title,
          status: 'error',
          error: error.message
        })
        console.error(`[reindex-all] Error indexing ${resume.id}:`, error)
      }
    }

    console.log(`[reindex-all] Complete: ${results.indexed} indexed, ${results.skipped} skipped, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Reindexing complete: ${results.indexed}/${results.totalResumes} resumes indexed`,
      ...results
    })
  } catch (error) {
    const errorInfo = handleApiError(error)
    return NextResponse.json(
      { error: errorInfo.error, code: errorInfo.code },
      { status: errorInfo.statusCode }
    )
  }
}
