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
import { Upload, FileText, X, CheckCircle, AlertTriangle } from "lucide-react"
import { uploadResume } from "@/lib/upload-handler"
import { ReviewFallbackUI } from "@/components/resume/review-fallback-ui"
import { ProcessingOverlay, type ProcessingStep } from "@/components/processing-overlay"

interface UploadResumeDialogProps {
  children: React.ReactNode
}

// Error code indicating the document is not a resume
const NOT_A_RESUME_ERROR_CODE = "NOT_A_RESUME"

interface ResumeAnalysis {
  personal_info: {
    name?: string
    email?: string
    phone?: string
    location?: string
    linkedin?: string
    portfolio?: string
  }
  experience_level: "entry" | "mid" | "senior" | "executive"
  skills: {
    technical: string[]
    soft: string[]
    languages: string[]
    certifications: string[]
  }
  work_experience: Array<{
    title: string
    company: string
    duration: string
    description: string
    achievements: string[]
  }>
  education: Array<{
    degree: string
    institution: string
    year?: string
    gpa?: string
  }>
  strengths: string[]
  improvement_areas: string[]
  keywords: string[]
  overall_score: number
  recommendations: string[]
}

export function UploadResumeDialog({ children }: UploadResumeDialogProps) {
  const [open, setOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null)
  const [step, setStep] = useState<"upload" | "analysis" | "fallback">("upload")
  const [rawParagraphs, setRawParagraphs] = useState<string[]>([])
  const [processingStepIndex, setProcessingStepIndex] = useState(0)
  const [isNotResumeError, setIsNotResumeError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Processing steps for the overlay
  const uploadSteps: ProcessingStep[] = [
    { label: "Uploading file", status: processingStepIndex > 0 ? "completed" : processingStepIndex === 0 && isUploading ? "active" : "pending" },
    { label: "Processing document", status: processingStepIndex > 1 ? "completed" : processingStepIndex === 1 ? "active" : "pending" },
    { label: "Extracting content", status: processingStepIndex > 2 ? "completed" : processingStepIndex === 2 ? "active" : "pending" },
    { label: "Finishing up", status: processingStepIndex > 3 ? "completed" : processingStepIndex === 3 ? "active" : "pending" },
  ]

  const handleFileSelect = (selectedFile: File) => {
    // Check file size first (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(`File size is ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Please upload a file smaller than 10MB.`)
      return
    }

    // Check file extension (more reliable than MIME type)
    const fileName = selectedFile.name.toLowerCase()
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      setError("Only PDF, Word (.doc, .docx), and plain text (.txt) files are allowed. CSV, JPEG, PNG files are not supported.")
      return
    }

    // Double-check with MIME type for additional security
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
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")) // Remove file extension
    setError("")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setProcessingStepIndex(0)
    setError("")
    setStep("upload")

    try {
      // Use the new hardened upload pipeline
      const result = await uploadResume(file, (progress) => {
        setUploadProgress(progress)
        // Update processing steps based on progress
        if (progress >= 25 && processingStepIndex < 1) setProcessingStepIndex(1)
        if (progress >= 50 && processingStepIndex < 2) setProcessingStepIndex(2)
        if (progress >= 75 && processingStepIndex < 3) setProcessingStepIndex(3)
      })

      if (!result.success) {
        const errorMessage = result.error || "Upload failed"
        setError(errorMessage)
        // Check if this is a "not a resume" error
        const isNotResume = result.responseBody?.code === NOT_A_RESUME_ERROR_CODE ||
          errorMessage.toLowerCase().includes("not a resume") ||
          errorMessage.toLowerCase().includes("bank statement") ||
          errorMessage.toLowerCase().includes("invoice") ||
          errorMessage.toLowerCase().includes("cover letter") ||
          errorMessage.toLowerCase().includes("job description")
        setIsNotResumeError(isNotResume)
        // Reset file selection so user can upload a different file
        if (isNotResume) {
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
        setIsUploading(false)
        setProcessingStepIndex(0)
        return
      }

      // Complete all steps
      setProcessingStepIndex(4)

      // Store resume ID
      setUploadedResumeId(result.resumeId!)

      // Handle different upload statuses
      if (result.status === "success") {
        // Success - evidence extracted
        setStep("analysis")
        // Optionally run additional analysis here
        // For now, just show success
        setTimeout(() => {
          router.push(`/dashboard/optimize?resumeId=${result.resumeId}`)
          setOpen(false)
          resetForm()
        }, 1500)
      } else if (result.status === "fallback") {
        // Fallback - show review UI
        setRawParagraphs(result.rawParagraphs || [])
        setStep("fallback")
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || "Upload failed. Please check your connection and try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleProceedToOptimization = () => {
    router.push(`/dashboard/optimize?resumeId=${uploadedResumeId}`)
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFile(null)
    setTitle("")
    setError("")
    setUploadProgress(0)
    setProcessingStepIndex(0)
    setUploadedResumeId(null)
    setRawParagraphs([])
    setStep("upload")
    setIsNotResumeError(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
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
        progress={uploadProgress}
      />

      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (isUploading) return // Prevent closing during upload
          if (isOpening && newOpen) return // Prevent rapid opening
          setOpen(newOpen)
          if (newOpen) {
            setIsOpening(true)
            setTimeout(() => setIsOpening(false), 500) // Debounce for 500ms
          } else {
            resetForm()
          }
        }}
      >
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Upload Resume"}
            {step === "analysis" && "Resume Uploaded Successfully"}
            {step === "fallback" && "Review Resume Content"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload your resume in PDF, Word, or plain text format to start optimizing it for job applications."}
            {step === "analysis" &&
              "Your resume has been successfully processed and indexed."}
            {step === "fallback" &&
              "We've uploaded your resume but need your help to structure the content."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && isNotResumeError ? (
            <div className="border-2 border-destructive/50 bg-destructive/10 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">Wrong Document Type</p>
                  <p className="text-sm text-muted-foreground">{error.replace(/^\[\d+\]\s*/, '')}</p>
                </div>
              </div>
              <div className="bg-background/50 rounded-md p-3 space-y-2">
                <p className="text-sm font-medium">What you can upload:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Resume or CV (PDF, DOCX, DOC, TXT)
                  </li>
                </ul>
                <p className="text-sm font-medium mt-3">Not accepted:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-destructive" />
                    Bank statements, invoices, receipts
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-destructive" />
                    Cover letters, job descriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-destructive" />
                    Legal documents, contracts
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => {
                  setError("")
                  setIsNotResumeError(false)
                }}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload a Different File
              </Button>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {/* Upload Step */}
          {step === "upload" && !isNotResumeError && (
            <>
              {!file ? (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop your resume here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">Supports PDF, Word, or plain text files (max 10MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetForm} disabled={isUploading}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Resume Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for your resume"
                      disabled={isUploading}
                    />
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleUpload} disabled={isUploading} className="flex-1">
                      {isUploading ? "Uploading..." : error ? "Retry Upload" : "Upload Resume"}
                    </Button>
                    <Button variant="outline" onClick={resetForm} disabled={isUploading}>
                      Remove File
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Analysis Step */}
          {step === "analysis" && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <div>
                  <p className="font-medium">Upload Complete!</p>
                  <p className="text-sm text-muted-foreground">Your resume has been successfully processed</p>
                  <p className="text-xs text-muted-foreground mt-2">Redirecting to optimization...</p>
                </div>
              </div>
            </div>
          )}

          {/* Fallback Step - Review UI */}
          {step === "fallback" && uploadedResumeId && (
            <ReviewFallbackUI
              resumeId={uploadedResumeId}
              rawParagraphs={rawParagraphs}
              onComplete={handleProceedToOptimization}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
