#!/usr/bin/env tsx
/**
 * Test script to manually trigger resume indexing
 * Run with: npx tsx scripts/test-indexing.ts
 */

import { indexResume } from '../lib/resume-indexer'

const testContent = `
PROFESSIONAL SUMMARY:
Senior UX Designer with 8+ years of experience designing user-centered digital products.

WORK EXPERIENCE:

Product Designer — TechCorp
Jan 2020 - Present
• Led end-to-end design for mobile banking app, improving user satisfaction by 40%
• Conducted user research and usability studies with 200+ participants
• Created design systems and component libraries using Figma
• Collaborated with product managers and engineers on feature prioritization

UX Designer — StartupCo
Jun 2017 - Dec 2019
• Designed customer onboarding flows that increased conversion by 25%
• Built interactive prototypes in Figma and Proto.io
• Performed A/B testing on key user journeys
• Created personas and journey maps for 3 major user segments

SKILLS:
Figma, Sketch, Adobe XD, Photoshop, Illustrator, User Research, Usability Testing,
Wireframing, Prototyping, Design Systems, HTML, CSS, Information Architecture,
Interaction Design, Customer Experience Design

EDUCATION:
Bachelor of Design — Design University
`

async function testIndexing() {
  console.log('🧪 Testing resume indexing...\n')

  try {
    const result = await indexResume({
      resumeId: 'test-resume-123',
      userId: 'test-user-456',
      content: testContent,
      metadata: {
        file_name: 'test_resume.pdf',
        test: true
      }
    })

    console.log('\n✅ Indexing Result:')
    console.log(JSON.stringify(result, null, 2))

    if (result.success) {
      console.log(`\n✓ Successfully indexed ${result.chunksIndexed} chunks`)
    } else {
      console.log(`\n✗ Indexing failed: ${result.error}`)
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

testIndexing()
