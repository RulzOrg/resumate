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
import { ProcessingOverlay, type ProcessingStep } from "@/components/ui/processing-overlay"

interface UploadMasterResumeDialogProps {
  children: React.ReactNode
  currentResumeCount?: number
}

export function UploadMasterResumeDialog({ children, currentResumeCount = 0 }: UploadMasterResumeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [processingStepIndex, setProcessingStepIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Processing steps for the overlay
  const uploadSteps: ProcessingStep[] = [
    { label: "Uploading file", status: processingStepIndex > 0 ? "completed" : processingStepIndex === 0 && isUploading ? "active" : "pending" },
    { label: "Processing document", status: processingStepIndex > 1 ? "completed" : processingStepIndex === 1 ? "active" : "pending" },
    { label: "Extracting content", status: processingStepIndex > 2 ? "completed" : processingStepIndex === 2 ? "active" : "pending" },
    { label: "Finishing up", status: processingStepIndex > 3 ? "completed" : processingStepIndex === 3 ? "active" : "pending" },
  ]

  const resetState = () => {
    setFile(null)
    setTitle("")
    setIsUploading(false)
    setProgress(0)
    setProcessingStepIndex(0)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    // Check file size first (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(`File size is ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Please upload a file smaller than 10MB.`)
      return
    }

    // Check file extension (more reliable than MIME type)
    const fileName = selectedFile.name.toLowerCase()
    const allowedExtensions = ['.pdf', '.doc', '.docx']
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
    
    if (!hasValidExtension) {
      setError("Only PDF and Word (.doc, .docx) files are allowed.")
      return
    }

    // Double-check with MIME type for additional security
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

    // Check 3-resume limit
    if (currentResumeCount >= 3) {
      setError("You can only upload up to 3 resumes. Please delete an existing resume first.")
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(false)
    setProgress(10)
    setProcessingStepIndex(0)
    
    // Start progress timer with step updates
    let stepCounter = 0
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev >= 80 ? prev : prev + 10
        // Update steps based on progress
        if (newProgress >= 25 && stepCounter < 1) {
          stepCounter = 1
          setProcessingStepIndex(1)
        }
        if (newProgress >= 50 && stepCounter < 2) {
          stepCounter = 2
          setProcessingStepIndex(2)
        }
        if (newProgress >= 75 && stepCounter < 3) {
          stepCounter = 3
          setProcessingStepIndex(3)
        }
        return newProgress
      })
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

      const response = await fetch("/api/resumes/upload", {
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
      setProcessingStepIndex(4)
      setSuccess(true)
      
      // Auto-close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false)
        router.refresh()
      }, 2000)
    } catch (uploadError) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      setProgress(0)
      setProcessingStepIndex(0)
      // Handle abort distinctly
      const isAbort =
        (uploadError as any)?.name === "AbortError" ||
        (uploadError instanceof DOMException && uploadError.name === "AbortError")
      if (isAbort) {
        setError("Upload cancelled")
      } else {
        console.error("Upload error:", uploadError)
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please check your connection and try again.")
      }
    } finally {
      setIsUploading(false)
      // Clear stored controller
      uploadAbortRef.current = null
    }
  }

  return (
    <>
      {/* Processing Overlay */}
      <ProcessingOverlay
        isOpen={isUploading}
        title="Processing your resume"
        steps={uploadSteps}
        currentStepIndex={processingStepIndex}
        progress={progress}
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isUploading) return // Prevent closing during upload
          if (isOpening && nextOpen) return // Prevent rapid opening
          setOpen(nextOpen)
          if (nextOpen) {
            setIsOpening(true)
            setTimeout(() => setIsOpening(false), 500) // Debounce for 500ms
          } else {
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
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Master resume uploaded successfully! You can now generate tailored versions.</p>
            <Button 
              onClick={() => {
                setOpen(false)
                router.refresh()
              }}
            >
              Close
            </Button>
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
                className="flex flex-col items-center justify-center gap-3 rounded border border-dashed border-border bg-surface-subtle p-6 text-center"
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted border border-border">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Drag & drop your resume</p>
                  <p className="text-xs text-muted-foreground">PDF, Word, or plain text file, up to 10MB</p>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-background/40 text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="master-resume-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-surface-muted border border-border rounded-lg p-3 mt-3">
                    <div>
                      <span className="text-foreground/80">{file.name}</span>
                      <span className="ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setTitle("")
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                      disabled={isUploading}
                      className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                onClick={(e) => {
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
                  e.stopPropagation()
                        setFile(null)
                        setTitle("")
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                }}
                className="text-muted-foreground"
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
                ) : error ? (
                  "Retry Upload"
                ) : (
                  "Upload Master Resume"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
