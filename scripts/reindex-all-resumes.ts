import { sql } from "@/lib/db"
import { indexResume } from "@/lib/resume-indexer"

async function reindexResumes() {
  const userId = "18922c41-07f7-441e-bcec-3402c8d148b0"
  
  const resumes = await sql`
    SELECT id, title, content_text, file_name, file_type
    FROM resumes
    WHERE user_id = ${userId}
      AND kind IN ('master', 'uploaded')
      AND processing_status = 'completed'
      AND content_text IS NOT NULL
      AND LENGTH(TRIM(content_text)) > 100
    ORDER BY created_at DESC
    LIMIT 10
  `
  
  console.log(`Found ${resumes.length} resumes to index\n`)
  
  for (const resume of resumes) {
    console.log(`Indexing: ${resume.title}...`)
    try {
      const result = await indexResume({
        user_id: userId,
        resume_id: resume.id,
        content_text: resume.content_text,
        title: resume.title,
        file_name: resume.file_name,
        file_type: resume.file_type
      })
      console.log(`  ✓ Indexed ${result.chunksIndexed} chunks\n`)
    } catch (error: any) {
      console.error(`  ✗ Failed: ${error.message}\n`)
    }
  }
}

reindexResumes()
