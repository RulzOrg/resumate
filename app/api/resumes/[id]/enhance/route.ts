import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getOrCreateUser } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { section, context } = body

    if (!section) {
      return NextResponse.json({ error: 'Section is required' }, { status: 400 })
    }

    let prompt = ''

    switch (section) {
      case 'summary':
        prompt = buildSummaryPrompt(context)
        break
      case 'experience_bullet':
        prompt = buildBulletPrompt(context)
        break
      case 'skills':
        prompt = buildSkillsPrompt(context)
        break
      case 'interests':
        prompt = buildInterestsPrompt(context)
        break
      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.7
    })

    // Parse response into array of suggestions
    const suggestions = text
      .split('\n')
      .filter(s => s.trim())
      .map(s => s.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(s => s.length > 0)

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, section === 'skills' || section === 'interests' ? 8 : 3)
    })
  } catch (error) {
    console.error('Enhancement error:', error)
    return NextResponse.json(
      { error: 'Enhancement failed' },
      { status: 500 }
    )
  }
}

function buildSummaryPrompt(context: any): string {
  const experienceText = context.experience?.map((exp: any) => 
    `${exp.role} at ${exp.company}:\n${exp.bullets.join('\n')}`
  ).join('\n\n') || 'No experience provided'

  return `Generate 3 professional summary variations for a resume based on:

Current Summary: ${context.currentSummary || 'None provided'}
Target Role: ${context.targetRole || 'Not specified'}

Experience:
${experienceText}

Requirements:
- Each summary should be 2-3 sentences
- Highlight key achievements and skills
- Tailor to the target role if provided
- Use strong action words
- Be concise and impactful
- Focus on value proposition

Return only the 3 summaries, one per line, no numbering or bullets.`
}

function buildBulletPrompt(context: any): string {
  return `Improve this resume bullet point to make it more impactful:

Current: ${context.currentBullet}
Role: ${context.role || 'Not specified'}
Company: ${context.company || 'Not specified'}

Generate 3 improved versions that:
- Start with a strong action verb
- Include quantifiable metrics if possible (use realistic estimates if none provided)
- Highlight impact and results
- Are concise (1-2 lines max)
- Follow STAR method (Situation, Task, Action, Result)
- Use professional, powerful language

Return only the 3 improved bullets, one per line, no numbering or bullets.`
}

function buildSkillsPrompt(context: any): string {
  const bullets = context.experience?.flatMap((exp: any) => exp.bullets || []).join('\n') || ''
  const fields = context.education?.map((edu: any) => edu.field).filter(Boolean).join(', ') || ''
  const current = context.currentSkills?.join(', ') || ''
  
  return `Based on this professional background, suggest 5-8 relevant skills that are NOT already listed:

Experience highlights:
${bullets || 'No experience provided'}

Education: ${fields || 'Not specified'}

Current skills (DO NOT suggest these): ${current || 'None'}

Suggest technical skills, tools, and competencies that:
- Are relevant to the experience described
- Are in-demand in the industry
- Fill gaps in current skill list
- Are specific and concrete
- Are actually mentioned or implied in the experience

Return only skill names, one per line, no numbering or bullets or explanations.`
}

function buildInterestsPrompt(context: any): string {
  const currentInterests = context.currentInterests?.join(', ') || 'None'
  
  return `Suggest 5-7 professional interests that are NOT already listed:

Professional Summary: ${context.professionalSummary || 'Not provided'}
Current Interests (DO NOT suggest these): ${currentInterests}

Suggest interests that:
- Align with professional goals
- Show well-rounded personality
- Are relevant to career development
- Are professional and appropriate
- Are distinct from current interests

Return only interest names, one per line, no numbering or bullets or explanations.`
}
