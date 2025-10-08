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
import { Upload, FileText, X, CheckCircle } from "lucide-react"
import { uploadResume } from "@/lib/upload-handler"
import { ReviewFallbackUI } from "@/components/resume/review-fallback-ui"

interface UploadResumeDialogProps {
  children: React.ReactNode
}

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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
    setError("")

    try {
      // Use the new hardened upload pipeline
      const result = await uploadResume(file, (progress) => {
        setUploadProgress(progress)
      })

      if (!result.success) {
        setError(result.error || "Upload failed")
        setIsUploading(false)
        return
      }

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
      setError(err.message || "An error occurred during upload")
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
    setUploadedResumeId(null)
    setRawParagraphs([])
    setStep("upload")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
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
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Upload Step */}
          {step === "upload" && (
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
                      {isUploading ? "Uploading..." : "Upload Resume"}
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
  )
}
