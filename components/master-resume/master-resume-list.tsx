"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookUser } from 'lucide-react'
import type { Resume } from '@/lib/db'
import { MasterResumeCard } from './master-resume-card'
import { AddResumeDialog } from './add-resume-dialog'
import { UploadMasterResumeDialog } from '@/components/dashboard/master-resume-dialog'

interface MasterResumeListProps {
  resumes: Resume[]
}

export function MasterResumeList({ resumes }: MasterResumeListProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete resume')
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting resume:', error)
      alert('Failed to delete resume. Please try again.')
    }
  }

  const handleDuplicate = async (id: string, newTitle: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/resumes/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTitle })
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate resume')
      }

      router.refresh()
    } catch (error) {
      console.error('Error duplicating resume:', error)
      alert('Failed to duplicate resume. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = async (id: string) => {
    try {
      const response = await fetch(`/api/resumes/${id}/export`, {
        method: 'POST'
      })

      const data = await response.json()
      alert(data.message || 'Export feature coming soon!')
    } catch (error) {
      console.error('Error exporting resume:', error)
      alert('Failed to export resume. Please try again.')
    }
  }

  const handleUpload = () => {
    // This will be handled by the UploadMasterResumeDialog
    router.refresh()
  }

  return (
    <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/5">
      {/* Header */}
      <div className="px-3 sm:px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookUser className="w-4.5 h-4.5" />
          <h3 className="text-base font-medium tracking-tight font-geist">Your resumes</h3>
        </div>
        <UploadMasterResumeDialog>
          <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition font-geist">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
            Add resume
          </button>
        </UploadMasterResumeDialog>
      </div>

      {/* Resume Cards */}
      <div className="p-4 space-y-6">
        {resumes.length > 0 ? (
          resumes.map((resume) => (
            <MasterResumeCard
              key={resume.id}
              resume={resume}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onExport={handleExport}
            />
          ))
        ) : (
          <div className="flex items-center justify-center text-center gap-3 p-8 rounded-lg bg-white/5 border border-dashed border-white/20">
            <div>
              <p className="text-sm text-white/60 font-geist mb-4">
                Upload your master resumes to get started.
              </p>
              <UploadMasterResumeDialog>
                <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-4 py-2 hover:bg-emerald-400 transition font-geist">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload Resume
                </button>
              </UploadMasterResumeDialog>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-black border border-white/10 rounded-xl p-6 max-w-sm">
              <p className="text-sm text-white/80 font-geist">Processing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
