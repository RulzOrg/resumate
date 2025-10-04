import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-utils'
import { getResumeById } from '@/lib/db'
import { initializeEditorState } from '@/lib/resume-editor-utils'
import { ResumeEditor } from '@/components/resume-editor/resume-editor'

interface PageProps {
  params: { id: string }
}

export default async function ResumeEditPage({ params }: PageProps) {
  const user = await getAuthenticatedUser()
  
  if (!user?.id) {
    redirect('/auth/login')
  }
  
  if (!user.onboarding_completed_at) {
    redirect('/onboarding')
  }

  // Fetch the resume
  const resume = await getResumeById(params.id, user.id)
  
  if (!resume) {
    redirect('/dashboard/master-resume')
  }

  // Initialize editor state from resume data
  const initialState = initializeEditorState(resume)

  return (
    <ResumeEditor 
      initialState={initialState}
      resumeId={resume.id}
      resumeTitle={resume.title}
    />
  )
}
