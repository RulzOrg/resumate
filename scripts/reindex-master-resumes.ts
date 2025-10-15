// Load .env.local BEFORE importing anything else
import { config } from 'dotenv'
import { join } from 'path'
config({ path: join(__dirname, '..', '.env.local') })

// Now import after env is loaded
import { sql } from "../lib/db"
import { indexResume } from "../lib/resume-indexer"

type ResumeRow = {
  id: number
  user_id: string
  title: string
  file_name: string
  file_type: string
  content_text: string
  kind: string
  is_primary: boolean
  created_at: Date
}

async function reindexMasterResumes() {
  try {
    console.log('[reindex-masters] Starting reindex of master resumes...')

    const BATCH_SIZE = 100
    const results = {
      totalResumes: 0,
      indexed: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[]
    }

    let lastCreatedAt: Date | null = null
    let lastId: number | null = null
    let batchNum = 0

    while (true) {
      batchNum++
      
      // Fetch batch using cursor-based pagination
      let batch: ResumeRow[]
      
      if (lastCreatedAt === null && lastId === null) {
        batch = await sql`
          SELECT id, user_id, title, file_name, file_type, content_text, kind, is_primary, created_at
          FROM resumes
          WHERE deleted_at IS NULL
            AND (kind = 'master' OR kind = 'uploaded')
          ORDER BY created_at DESC, id DESC
          LIMIT ${BATCH_SIZE}
        ` as ResumeRow[]
      } else {
        batch = await sql`
          SELECT id, user_id, title, file_name, file_type, content_text, kind, is_primary, created_at
          FROM resumes
          WHERE deleted_at IS NULL
            AND (kind = 'master' OR kind = 'uploaded')
            AND (created_at < ${lastCreatedAt} OR (created_at = ${lastCreatedAt} AND id < ${lastId}))
          ORDER BY created_at DESC, id DESC
          LIMIT ${BATCH_SIZE}
        ` as ResumeRow[]
      }

      if (batch.length === 0) {
        console.log(`[reindex-masters] No more resumes to process (completed ${batchNum - 1} batches)`)
        break
      }

      console.log(`[reindex-masters] Processing batch ${batchNum}: ${batch.length} resumes`)

      // Process each resume in the batch
      for (const resume of batch) {
        results.totalResumes++
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
          resumeId: resume.id.toString(),
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

      // Update cursor for next batch
      if (batch.length > 0) {
        const lastResume = batch[batch.length - 1]
        lastCreatedAt = lastResume.created_at
        lastId = lastResume.id
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
