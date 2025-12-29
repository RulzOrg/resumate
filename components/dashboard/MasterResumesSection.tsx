"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileCheck, Pencil, Trash2, UploadCloud, Check, X, Eye } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { UploadMasterResumeDialog } from "./master-resume-dialog"
import { MasterResumePreviewDialog } from "./master-resume-preview-dialog"
import { Resume } from "@/lib/db"

interface MasterResumesSectionProps {
  resumes: Resume[]
}

export function MasterResumesSection({ resumes }: MasterResumesSectionProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<{ id: string; message: string } | null>(null)
  
  // Preview state
  const [previewResume, setPreviewResume] = useState<Resume | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const masterResumes = resumes.filter(resume =>
    resume.kind === 'master' || resume.kind === 'uploaded'
  ).slice(0, 3)

  const handleStartEdit = (resumeId: string, currentTitle: string) => {
    setEditingId(resumeId)
    setEditingTitle(currentTitle)
    setUpdateError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle("")
    setUpdateError(null)
  }

  const handleSaveEdit = async (resumeId: string) => {
    if (!editingTitle.trim()) {
      setUpdateError({ id: resumeId, message: "Resume title cannot be empty" })
      return
    }

    setIsUpdating(resumeId)
    setUpdateError(null)

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() })
      })

      if (response.ok) {
        setEditingId(null)
        setEditingTitle("")
        router.refresh()
      } else {
        const error = await response.json()
        setUpdateError({
          id: resumeId,
          message: error.error || error.message || 'Failed to update resume title. Please try again.',
        })
      }
    } catch (error) {
      setUpdateError({
        id: resumeId,
        message: 'Failed to update resume title. Please try again.',
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDelete = async (resumeId: string, fileName: string) => {
    console.log('Starting delete operation for:', resumeId)
    setIsDeleting(resumeId)
    setDeleteError(null)

    try {
      console.log('Making DELETE request to:', `/api/resumes/${resumeId}`)
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE'
      })

      console.log('Delete response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Delete successful:', result)
        setConfirmingDeleteId(null)
        router.refresh()
      } else {
        const error = await response.json()
        console.error('Delete failed:', error)
        setDeleteError({
          id: resumeId,
          message: error.error || error.message || 'Failed to delete resume. Please try again.',
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      setDeleteError({
        id: resumeId,
        message: 'Failed to delete resume. Please try again.',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handlePreview = (resume: Resume) => {
    setPreviewResume(resume)
    setIsPreviewOpen(true)
  }

  return (
    <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-foreground/90 dark:text-white/90">Master Resumes</h3>
        <span className="text-xs font-medium text-foreground/50 dark:text-white/50">{masterResumes.length} of 3 files</span>
      </div>

      {masterResumes.length > 0 ? (
        <div className="space-y-2">
          {masterResumes.map((resume) => (
            <div key={resume.id} className="group rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 p-3 transition-colors hover:bg-surface-muted dark:hover:bg-white/10">
              <div className="flex items-center gap-3">
                <div 
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => handlePreview(resume)}
                >
                  <FileCheck className="h-5 w-5 flex-shrink-0 text-foreground/70 dark:text-white/70" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 text-left">
                  {editingId === resume.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full text-sm font-medium bg-surface-muted dark:bg-white/10 border border-border/80 dark:border-white/20 rounded px-2 py-1 text-foreground dark:text-white focus:outline-none focus:border-emerald-500"
                        disabled={isUpdating === resume.id}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(resume.id)
                          } else if (e.key === 'Escape') {
                            handleCancelEdit()
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(resume.id)}
                          disabled={isUpdating === resume.id}
                          className="text-xs px-2 py-1 bg-emerald-500 text-black rounded hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {isUpdating === resume.id ? (
                            "Saving..."
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isUpdating === resume.id}
                          className="text-xs px-2 py-1 bg-surface-muted dark:bg-white/10 text-foreground/80 dark:text-white/80 rounded hover:bg-surface-strong dark:hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                      </div>
                      {updateError?.id === resume.id && (
                        <p className="text-xs text-red-400">{updateError.message}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p 
                        className="truncate text-sm font-medium text-foreground/90 dark:text-white/90 cursor-pointer hover:text-emerald-500 transition-colors"
                        onClick={() => handlePreview(resume)}
                      >
                        {resume.title}
                      </p>
                      <p className="text-xs text-foreground/50 dark:text-white/50">
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
                    </>
                  )}
                </div>
                {editingId !== resume.id && (
                  <div
                    className={`flex items-center gap-2 transition-opacity ${confirmingDeleteId === resume.id ? "opacity-0" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      } sm:bg-transparent bg-black/20 rounded-md p-1 sm:p-0`}
                  >
                    <button
                      onClick={() => handlePreview(resume)}
                      className="text-foreground/60 dark:text-white/60 transition-colors hover:text-foreground dark:hover:text-white"
                      title="View original file"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(resume.id, resume.title)}
                      className="text-foreground/60 dark:text-white/60 transition-colors hover:text-foreground dark:hover:text-white"
                      title="Edit resume name"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingDeleteId(prev => (prev === resume.id ? null : resume.id))
                        setDeleteError(null)
                      }}
                      disabled={isDeleting === resume.id}
                      className="text-foreground/60 dark:text-white/60 transition-colors hover:text-red-400 disabled:opacity-50"
                      title="Delete resume"
                    >
                      <Trash2 className={`h-4 w-4 ${isDeleting === resume.id ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                )}
              </div>

              {confirmingDeleteId === resume.id && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-100">Delete "{resume.file_name}"? This action cannot be undone.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDelete(resume.id, resume.file_name)}
                      disabled={isDeleting === resume.id}
                      className="flex-1 rounded-full bg-red-500 px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting === resume.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingDeleteId(null)
                        setDeleteError(null)
                      }}
                      className="flex-1 rounded-full border border-border/80 dark:border-white/20 px-3 py-2 text-sm font-medium text-foreground/80 dark:text-white/80 transition-colors hover:text-foreground dark:hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  {deleteError?.id === resume.id && (
                    <p className="mt-2 text-xs text-red-200">{deleteError.message}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center text-center gap-3 p-4 rounded-lg bg-surface-subtle dark:bg-white/5 border border-dashed border-border/80 dark:border-white/20">
          <p className="text-sm text-foreground/60 dark:text-white/60">Upload your master resumes to get started.</p>
        </div>
      )}

      {masterResumes.length < 3 && (
        <UploadMasterResumeDialog currentResumeCount={masterResumes.length}>
          <button className="mt-4 w-full flex items-center justify-center gap-2 text-center text-sm font-medium text-foreground/80 dark:text-white/80 hover:text-foreground dark:hover:text-white transition bg-surface-muted dark:bg-white/10 rounded-full py-2">
            <UploadCloud className="h-4 w-4" />
            <span>Upload New</span>
          </button>
        </UploadMasterResumeDialog>
      )}

      {masterResumes.length >= 3 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-900 dark:text-amber-200 text-center">
            You've reached the maximum of 3 resumes. Delete an existing resume to upload a new one.
          </p>
        </div>
      )}

      <MasterResumePreviewDialog 
        open={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen} 
        resume={previewResume} 
      />
    </div>
  )
}
