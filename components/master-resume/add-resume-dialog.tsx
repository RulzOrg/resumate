"use client"

import { useState } from 'react'
import { Plus, X, Upload } from 'lucide-react'

interface AddResumeDialogProps {
  onUpload: () => void
}

export function AddResumeDialog({ onUpload }: AddResumeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition font-geist"
      >
        <Plus className="w-4 h-4" />
        Add resume
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-geist">Add Resume</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-white/60 font-geist mb-6">
              Upload a resume file to add to your master resumes collection.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  onUpload()
                  setIsOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 transition font-geist"
              >
                <Upload className="w-4 h-4" />
                Upload Resume File
              </button>

              <button
                onClick={() => {
                  alert('Create from scratch feature coming soon!')
                  setIsOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 transition font-geist"
              >
                <Plus className="w-4 h-4" />
                Create from Scratch
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-white/60 hover:text-white font-geist"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
