"use client"

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface AddResumeDialogProps {
  onUpload: () => void
}

export function AddResumeDialog({ onUpload }: AddResumeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  // Focus management and keyboard support
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement
      
      // Move focus into modal
      setTimeout(() => {
        firstFocusableRef.current?.focus()
      }, 0)

      // Escape key handler
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false)
        }
      }

      // Focus trap
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !dialogRef.current) return

        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }

      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', handleTabKey)

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.removeEventListener('keydown', handleTabKey)
      }
    } else {
      // Return focus to previously focused element
      // Return focus to previously focused element
      if (previousFocusRef.current) {
        if (document.contains(previousFocusRef.current)) {
          previousFocusRef.current.focus()
        }
        previousFocusRef.current = null
      }
    }
  }, [isOpen])

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
          <div 
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-resume-dialog-title"
            aria-describedby="add-resume-dialog-description"
            className="bg-black border border-white/10 rounded-xl p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="add-resume-dialog-title" className="text-lg font-semibold font-geist">Add Resume</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close dialog"
                className="text-white/60 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p id="add-resume-dialog-description" className="text-sm text-white/60 font-geist mb-6">
              Upload a resume file to add to your master resumes collection.
            </p>

            <div className="space-y-3">
              <button
                ref={firstFocusableRef}
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
                  toast.info('Create from scratch feature coming soon!')
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
