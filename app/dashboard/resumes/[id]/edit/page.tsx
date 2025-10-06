import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-utils'
import { getResumeById } from '@/lib/db'
import { initializeEditorState } from '@/lib/resume-editor-utils'
import { ResumeEditor } from '@/components/resume-editor/resume-editor'

const isDev = process.env.NODE_ENV === 'development'

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

  // Check if resume is still processing
  if (resume.processing_status === 'pending' || resume.processing_status === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="max-w-md w-full mx-4 p-6 rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"
              role="status"
              aria-label="Processing resume"
            ></div>
            <h2 className="text-xl font-semibold text-white font-space-grotesk">Processing Resume</h2>
          </div>
          <p className="text-sm text-white/70 mb-4 font-geist">
            We're extracting and analyzing your resume content. This usually takes 10-30 seconds.
          </p>
          {isDev && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <p className="text-xs text-amber-200 font-geist">
                💡 <strong>Tip:</strong> Make sure the Inngest dev server is running: <code className="text-xs bg-black/50 px-1.5 py-0.5 rounded">npx inngest-cli@latest dev</code>
              </p>
            </div>
          )}
          <a
            href={`/dashboard/resumes/${params.id}/edit`}
            className="mt-4 w-full block text-center rounded-lg bg-emerald-500 text-black text-sm font-medium px-4 py-2 hover:bg-emerald-400 transition font-geist"
          >
            Refresh Page
          </a>
        </div>
      </div>
    )
  }

  // Check if processing failed
  if (resume.processing_status === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="max-w-md w-full mx-4 p-6 rounded-xl border border-red-500/30 bg-red-500/10">
          <h2 className="text-xl font-semibold text-red-200 mb-4 font-space-grotesk">Processing Failed</h2>
          <p className="text-sm text-red-200/80 mb-4 font-geist">
            {resume.processing_error || 'Failed to extract resume content. Please try uploading again.'}
          </p>
          <a
            href="/dashboard/master-resume"
            className="inline-block w-full text-center rounded-lg bg-red-500 text-white text-sm font-medium px-4 py-2 hover:bg-red-400 transition font-geist"
          >
            Back to Resumes
          </a>
        </div>
      </div>
    )
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
