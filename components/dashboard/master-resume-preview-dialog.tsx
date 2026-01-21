"use client"

import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, FileText, ExternalLink, X, Loader2, AlertCircle } from "lucide-react"
import type { Resume } from "@/lib/db"
import { useEffect, useState } from "react"

interface MasterResumePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resume: Resume | null
}

export function MasterResumePreviewDialog({ open, onOpenChange, resume }: MasterResumePreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSignedUrl(null)
      setError(null)
      setIsLoading(false)
    }
  }, [open])

  // Get user-friendly error message based on error code or status
  const getErrorMessage = (status: number, code?: string): string => {
    // Handle specific error codes first
    if (code === "RESUME_NOT_FOUND" || code === "STORAGE_KEY_NOT_FOUND") {
      return "Resume not found"
    }
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
      return "You do not have permission to view this resume"
    }
    if (code === "SIGNED_URL_FAILED" || code === "SERVER_ERROR") {
      return "Unable to generate preview link. Please try downloading instead."
    }

    // Fallback to status-based messages
    switch (status) {
      case 404:
        return "Resume not found"
      case 401:
      case 403:
        return "You do not have permission to view this resume"
      case 500:
      default:
        return "Unable to generate preview link. Please try downloading instead."
    }
  }

  // Fetch signed URL when resume is selected and dialog opens
  useEffect(() => {
    if (open && resume) {
      const fetchSignedUrl = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await fetch(`/api/resumes/${resume.id}/view`)
          if (!response.ok) {
            // Try to parse JSON error response
            let errorCode: string | undefined
            try {
              const errorData = await response.json()
              errorCode = errorData.code
            } catch {
              // Response wasn't JSON, use status-based message
            }
            const errorMessage = getErrorMessage(response.status, errorCode)
            throw new Error(errorMessage)
          }
          const data = await response.json()
          setSignedUrl(data.url)
        } catch (err) {
          console.error("Preview error:", err)
          setError(err instanceof Error ? err.message : "Could not load document preview. Please try downloading instead.")
        } finally {
          setIsLoading(false)
        }
      }

      fetchSignedUrl()
    }
  }, [open, resume])

  if (!resume) return null

  // Get file extension for type detection
  const getFileExtension = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop() || ''
    return ext
  }

  const fileExtension = getFileExtension(resume.file_name)

  // Detect file type from extension
  const isPdf = fileExtension === 'pdf' || resume.file_type === "application/pdf"
  const isDocx = fileExtension === 'docx' || resume.file_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  const isLegacyDoc = fileExtension === 'doc' && !isDocx

  const handleDownload = () => {
    // Use signed URL if available, otherwise fallback to public URL (which might fail if bucket is private)
    const url = signedUrl || resume.file_url
    if (!url) {
      toast.error("Download failed. No file available.")
      return
    }

    try {
      // Create a temporary link to force download
      const link = document.createElement("a")
      link.href = url
      link.download = resume.file_name
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Download started")
    } catch {
      toast.error("Download failed. Try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden bg-background border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur z-10">
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-lg font-semibold truncate max-w-[300px] sm:max-w-[500px]">
              {resume.title}
            </DialogTitle>
            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
              {resume.file_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!signedUrl && !resume.file_url} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-muted/30 w-full h-full relative overflow-hidden flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 text-center p-6">
              <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium">{error}</p>
                <p className="text-sm text-muted-foreground">You can still download the file directly.</p>
              </div>
              <Button onClick={handleDownload} className="mt-2 gap-2">
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          ) : isPdf && signedUrl ? (
            <iframe
              src={`${signedUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
              title={`Preview of ${resume.file_name}`}
            />
          ) : isDocx && signedUrl ? (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
              className="w-full h-full border-0"
              title={`Preview of ${resume.file_name}`}
            />
          ) : isLegacyDoc ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-300">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Legacy .doc format</h3>
              <p className="text-muted-foreground max-w-md mb-8">
                Legacy .doc format cannot be previewed in the browser.
                <br />
                Please download to view.
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-300">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Preview not available for this file type</h3>
              <p className="text-sm text-muted-foreground mb-2 font-medium">{resume.file_name}</p>
              <p className="text-muted-foreground max-w-md mb-8">
                {isPdf
                  ? "Unable to render PDF preview."
                  : `This file format cannot be previewed directly in the browser.`}
                <br />
                Please download the file to view its original formatting.
              </p>
              <div className="flex gap-4">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
                {signedUrl && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open in New Tab
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
