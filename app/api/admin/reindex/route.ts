import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"
import { indexResume } from "@/lib/resume-indexer"

/**
 * Admin endpoint to reindex all resumes
 * DELETE THIS FILE after running once in production
 */
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = {
      indexed: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Fetch all master/uploaded resumes
    const resumes = await sql`
      SELECT id, user_id, title, content_text, file_name, file_type
      FROM resumes
      WHERE deleted_at IS NULL
        AND (kind = 'master' OR kind = 'uploaded')
        AND content_text IS NOT NULL
        AND LENGTH(content_text) > 50
      LIMIT 100
    `

    for (const resume of resumes) {
      try {
        const result = await indexResume({
          resumeId: resume.id.toString(),
          userId: resume.user_id,
          content: resume.content_text,
          metadata: {
            file_name: resume.file_name,
            file_type: resume.file_type,
            title: resume.title
          }
        })

        if (result.success) {
          results.indexed++
        } else {
          results.failed++
          results.errors.push(`${resume.id}: ${result.error}`)
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(`${resume.id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
