"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileCheck, Pencil, Trash2, UploadCloud } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { UploadMasterResumeDialog } from "./master-resume-dialog"
import { Resume } from "@/lib/db"

interface MasterResumesSectionProps {
  resumes: Resume[]
}

export function MasterResumesSection({ resumes }: MasterResumesSectionProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const masterResumes = resumes.filter(resume => 
    resume.kind === 'master' || resume.kind === 'uploaded'
  ).slice(0, 3)

  const handleEdit = (resumeId: string) => {
    // Navigate to resume edit page (we'll need to create this)
    router.push(`/dashboard/resumes/${resumeId}/edit`)
  }

  const handleDelete = async (resumeId: string, fileName: string) => {
    console.log('Delete button clicked:', { resumeId, fileName })
    
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      console.log('Delete cancelled by user')
      return
    }

    console.log('Starting delete operation for:', resumeId)
    setIsDeleting(resumeId)

    try {
      console.log('Making DELETE request to:', `/api/resumes/${resumeId}`)
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE'
      })

      console.log('Delete response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Delete successful:', result)
        router.refresh()
      } else {
        const error = await response.json()
        console.error('Delete failed:', error)
        alert(`Failed to delete resume: ${error.error || error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete resume. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-white/90">Master Resumes</h3>
        <span className="text-xs font-medium text-white/50">{masterResumes.length} of 3 files</span>
      </div>
      
      {masterResumes.length > 0 ? (
        <div className="space-y-2">
          {masterResumes.map((resume) => (
            <div key={resume.id} className="group flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <FileCheck className="h-5 w-5 text-white/70 flex-shrink-0" />
              <div className="flex flex-col gap-0.5 text-left flex-1">
                <p className="text-sm font-medium truncate text-white/90">{resume.file_name}</p>
                <p className="text-xs text-white/50">
                  {resume.processing_status === "completed"
                    ? `Last updated ${formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}`
                    : resume.processing_status === "processing"
                    ? "Processing... this usually takes under a minute"
                    : resume.processing_status === "failed"
                    ? "Latest processing attempt failed"
                    : "Ready"}
                </p>
                {resume.processing_error && (
                  <p className="text-xs text-red-400">{resume.processing_error}</p>
                )}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(resume.id)}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Edit resume"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(resume.id, resume.file_name)}
                  disabled={isDeleting === resume.id}
                  className="text-white/60 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Delete resume"
                >
                  <Trash2 className={`h-4 w-4 ${isDeleting === resume.id ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center text-center gap-3 p-4 rounded-lg bg-white/5 border border-dashed border-white/20">
          <p className="text-sm text-white/60">Upload your master resumes to get started.</p>
        </div>
      )}
      
      {masterResumes.length < 3 && (
        <UploadMasterResumeDialog>
          <button className="mt-4 w-full flex items-center justify-center gap-2 text-center text-sm font-medium text-white/80 hover:text-white transition bg-white/10 rounded-full py-2">
            <UploadCloud className="h-4 w-4" />
            <span>Upload New</span>
          </button>
        </UploadMasterResumeDialog>
      )}
    </div>
  )
}