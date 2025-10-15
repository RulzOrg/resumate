import { getResumeById } from '../lib/db'
import { qdrant, QDRANT_COLLECTION } from '../lib/qdrant'

const resumeId = '1bff9e22-18c3-44b1-9778-f136c1fbbba5'
const userId = '26335e84-cd04-43d1-826e-7dbba4af7f16'

async function checkResume() {
  console.log('=== Checking Resume in Database ===')
  
  let resume
  try {
    resume = await getResumeById(resumeId, userId)
  } catch (error: any) {
    console.error('❌ Database error fetching resume:')
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
  
  if (!resume) {
    console.log('❌ Resume not found in database')
    return
  }
  
  console.log('✅ Resume found in database:')
  console.log('ID:', resume.id)
  console.log('Title:', resume.title)
  console.log('Kind:', resume.kind)
  console.log('Content length:', resume.content_text?.length || 0)
  console.log('Has content:', resume.content_text ? 'yes' : 'no')
  
  if (resume.content_text) {
    try {
      const parsed = JSON.parse(resume.content_text)
      console.log('Content is JSON with keys:', Object.keys(parsed))
      if (parsed.markdown) {
        console.log('Markdown length:', parsed.markdown.length)
      }
    } catch (e) {
      console.log('Content is plain text')
    }
  }
  
  console.log('\n=== Checking Qdrant Indexing ===')
  
  try {
    const result = await qdrant.scroll(QDRANT_COLLECTION, {
      filter: {
        must: [
          { key: 'userId', match: { value: userId } },
          { key: 'resume_id', match: { value: resumeId } }
        ]
      },
      limit: 100,
      with_payload: true,
      with_vector: false
    })
    
    const points = result.points || []
    console.log(`Found ${points.length} indexed chunks in Qdrant`)
    
    if (points.length > 0) {
      console.log('\nFirst 3 chunks:')
      points.slice(0, 3).forEach((p: any, i: number) => {
        const payload = p.payload || {}
        console.log(`\n${i + 1}. Evidence ID: ${payload.evidence_id}`)
        console.log(`   Section: ${payload.section}`)
        console.log(`   Text: ${(payload.text || '').substring(0, 100)}...`)
      })
    } else {
      console.log('❌ No chunks found in Qdrant - resume needs to be indexed!')
    }
  } catch (error: any) {
    console.error('❌ Error checking Qdrant:')
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
  }
}

checkResume().catch((error: any) => {
  console.error('❌ Unhandled error in checkResume:')
  console.error('Message:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
})
