// Load .env.local BEFORE importing anything else
import { config } from 'dotenv'
import { join } from 'path'
config({ path: join(__dirname, '..', '.env.local') })

// Now import after env is loaded
import { sql } from "../lib/db"
import { indexResume } from "../lib/resume-indexer"

async function reindexMasterResumes() {
  try {
    console.log('[reindex-masters] Starting reindex of master resumes...')

    // Get all resumes
    const allResumes = await sql`
      SELECT id, user_id, title, file_name, file_type, content_text, kind, is_primary
      FROM resumes
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `

    console.log(`[reindex-masters] Found ${allResumes.length} total resumes`)

    // Filter to only MASTER resumes (kind='master' or 'uploaded')
    // This excludes: generated resumes, duplicates
    // Includes: ALL user master resumes (up to 3 per user)
    const masterResumes = allResumes.filter((r: any) =>
      r.kind === 'master' || r.kind === 'uploaded'
    )

    console.log(`[reindex-masters] Filtered to ${masterResumes.length} master resumes (excludes generated/duplicates)`)

    if (masterResumes.length === 0) {
      console.log('[reindex-masters] No master resumes to index')
      return
    }

    const results = {
      totalResumes: masterResumes.length,
      indexed: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[]
    }

    // Index each master resume
    for (const resume of masterResumes) {
      if (!resume.content_text || resume.content_text.length < 50) {
        results.skipped++
        results.details.push({
          resumeId: resume.id,
          title: resume.title,
          status: 'skipped',
          reason: 'Content too short or missing'
        })
        console.log(`[reindex-masters] ⊘ Skipped ${resume.id}: ${resume.title} (content too short)`)
        continue
      }

      try {
        const result = await indexResume({
          resumeId: resume.id,
          userId: resume.user_id,
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
          console.log(`[reindex-masters] ✓ Indexed ${resume.id}: ${resume.title} (${result.chunksIndexed} chunks)`)
        } else {
          results.failed++
          results.details.push({
            resumeId: resume.id,
            title: resume.title,
            status: 'failed',
            error: result.error
          })
          console.warn(`[reindex-masters] ✗ Failed to index ${resume.id}: ${result.error}`)
        }
      } catch (error: any) {
        results.failed++
        results.details.push({
          resumeId: resume.id,
          title: resume.title,
          status: 'error',
          error: error.message
        })
        console.error(`[reindex-masters] Error indexing ${resume.id}:`, error.message)
      }
    }

    console.log('\n[reindex-masters] Summary:')
    console.log(`  Total master resumes: ${results.totalResumes}`)
    console.log(`  ✓ Indexed: ${results.indexed}`)
    console.log(`  ⊘ Skipped: ${results.skipped}`)
    console.log(`  ✗ Failed: ${results.failed}`)

    if (results.details.length > 0) {
      console.log('\n[reindex-masters] Details:')
      results.details.forEach(d => {
        console.log(`  - ${d.title}: ${d.status} ${d.chunksIndexed ? `(${d.chunksIndexed} chunks)` : ''}`)
      })
    }

  } catch (error: any) {
    console.error('[reindex-masters] Fatal error:', error.message || error)
    process.exit(1)
  }
}

reindexMasterResumes()
  .then(() => {
    console.log('\n[reindex-masters] Complete ✓')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[reindex-masters] Fatal error:', err)
    process.exit(1)
  })
