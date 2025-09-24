"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, Loader2, CheckCircle, X } from "lucide-react"

interface UploadMasterResumeDialogProps {
  children: React.ReactNode
}

export function UploadMasterResumeDialog({ children }: UploadMasterResumeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const resetState = () => {
    setFile(null)
    setTitle("")
    setIsUploading(false)
    setProgress(0)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, Word, or plain text file")
      return
    }

    setFile(selectedFile)
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Select a resume to upload")
      return
    }

    setIsUploading(true)
    setError(null)
    setProgress(10)
    
    // Start progress timer
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => (prev >= 80 ? prev : prev + 10))
    }, 150)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (title.trim()) {
        formData.append("title", title.trim())
      }

      // Create and store AbortController for cancellation
      const controller = new AbortController()
      uploadAbortRef.current = controller

      const response = await fetch("/api/resumes/master/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(payload.error || "Upload failed")
      }

      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      setProgress(100)
      setSuccess(true)
      router.refresh()
    } catch (uploadError) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      setProgress(0)
      // Handle abort distinctly
      const isAbort =
        (uploadError as any)?.name === "AbortError" ||
        (uploadError instanceof DOMException && uploadError.name === "AbortError")
      if (isAbort) {
        setError("Upload cancelled")
      } else {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed")
      }
    } finally {
      setIsUploading(false)
      // Clear stored controller
      uploadAbortRef.current = null
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetState()
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Master Resume</DialogTitle>
          <DialogDescription>
            Upload your baseline resume. We&apos;ll analyze the content so future versions can be generated instantly.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-white/70">Master resume uploaded and analyzed. You can now generate tailored versions.</p>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="resume-title">Resume Title</Label>
              <Input
                id="resume-title"
                placeholder="e.g., Jane Doe — Master Resume"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="master-resume-file">Resume File</Label>
              <div
                className="flex flex-col items-center justify-center gap-3 rounded border border-dashed border-white/20 bg-white/5 p-6 text-center"
                onDragOver={(event) => {
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const droppedFile = event.dataTransfer.files?.[0]
                  if (droppedFile) {
                    handleFileSelect(droppedFile)
                  }
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <Upload className="h-5 w-5 text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Drag & drop your resume</p>
                  <p className="text-xs text-white/60">PDF, Word, or plain text file, up to 10MB</p>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-black/40 text-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="master-resume-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0]
                      if (selectedFile) {
                        handleFileSelect(selectedFile)
                      }
                    }}
                  />
                </div>
                {file && (
                  <div className="text-xs text-white/60">
                    Selected: <span className="text-white/80">{file.name}</span>
                  </div>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading and analyzing...
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isUploading) {
                    // Abort in-flight request and cleanup
                    if (uploadAbortRef.current) {
                      uploadAbortRef.current.abort()
                    }
                    if (progressTimerRef.current) {
                      clearInterval(progressTimerRef.current)
                      progressTimerRef.current = null
                    }
                    setIsUploading(false)
                    setProgress(0)
                    setSuccess(false)
                    setError("Upload cancelled")
                  } else {
                    setOpen(false)
                  }
                }}
                className="text-white/70"
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading
                  </>
                ) : (
                  "Upload Master Resume"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
