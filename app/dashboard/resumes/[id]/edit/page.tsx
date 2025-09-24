import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getResumeById } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function EditResumePage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getAuthenticatedUser()
  if (!user?.id) {
    notFound()
  }

  const resume = await getResumeById(params.id, user.id)
  if (!resume) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-2">Edit Resume</h1>
            <p className="text-white/60">{resume.file_name}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resume Content */}
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xl font-medium mb-4">Resume Content</h2>
                <div className="bg-black/20 rounded-lg p-4 h-96 overflow-y-auto">
                  <pre className="text-sm text-white/80 whitespace-pre-wrap">
                    {resume.content_text || "No content available"}
                  </pre>
                </div>
              </div>
            </div>

            {/* Resume Info */}
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xl font-medium mb-4">Resume Information</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-white/60">File Name:</span>
                    <span className="ml-2">{resume.file_name}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Type:</span>
                    <span className="ml-2">{resume.kind}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Status:</span>
                    <span className={`ml-2 ${
                      resume.processing_status === 'completed' ? 'text-green-400' :
                      resume.processing_status === 'failed' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {resume.processing_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">File Size:</span>
                    <span className="ml-2">{(resume.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div>
                    <span className="text-white/60">Created:</span>
                    <span className="ml-2">{new Date(resume.created_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Updated:</span>
                    <span className="ml-2">{new Date(resume.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {resume.processing_error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                  <h2 className="text-xl font-medium mb-4 text-red-400">Processing Error</h2>
                  <p className="text-red-300 text-sm">{resume.processing_error}</p>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <h2 className="text-xl font-medium mb-4 text-blue-400">Coming Soon</h2>
                <p className="text-blue-300 text-sm">
                  Resume editing functionality will be available in a future update. 
                  For now, you can view your resume content and information here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}