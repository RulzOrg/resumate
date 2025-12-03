"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Upload, CheckCircle2, FileText, AlertCircle, Loader2, ArrowRight } from "lucide-react"

// Dynamically import UserButton to avoid SSR issues
const DynamicUserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => ({ default: mod.UserButton })),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-9 w-9 rounded-full bg-muted animate-pulse" />
    ),
  }
)

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface OnboardingFlowProps {
  userName: string
  hasMasterResume: boolean
  masterResumeTitle?: string | null
}

type UploadStatus = "idle" | "uploading" | "success" | "error"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function OnboardingFlow({
  userName,
  hasMasterResume,
  masterResumeTitle,
}: OnboardingFlowProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadProgressTimer = useRef<NodeJS.Timeout | null>(null)

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(
    hasMasterResume ? "success" : "idle",
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadWarning, setUploadWarning] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    hasMasterResume ? masterResumeTitle ?? "Master Resume" : null,
  )
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const resetUploadTimers = () => {
    if (uploadProgressTimer.current) {
      clearInterval(uploadProgressTimer.current)
      uploadProgressTimer.current = null
    }
  }

  useEffect(
    () => () => {
      if (uploadProgressTimer.current) {
        clearInterval(uploadProgressTimer.current)
      }
    },
    [],
  )

  const validateFile = (file: File) => {
    // Check file size first (10MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return `File size is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please upload a file smaller than 10MB.`
    }

    // Check file extension (more reliable than MIME type)
    const fileName = file.name.toLowerCase()
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      return "Only PDF, Word (.doc, .docx), and plain text (.txt) files are allowed. CSV, JPEG, PNG files are not supported."
    }

    // Double-check with MIME type for additional security
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Upload a PDF, Word, or plain text resume"
    }

    return null
  }

  const simulateProgress = useCallback(() => {
    resetUploadTimers()
    uploadProgressTimer.current = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 5))
    }, 100)
  }, [])

  const performUpload = useCallback(
    async (file: File) => {
      setUploadStatus("uploading")
      setUploadError(null)
      setUploadWarning(null)
      setUploadProgress(10)
      simulateProgress()

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/resumes/master/upload", {
          method: "POST",
          body: formData,
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload.error || "Upload failed")
        }

        resetUploadTimers()
        setUploadProgress(100)
        setUploadStatus("success")
        setUploadedFileName(payload.resume?.title || file.name)

        if (payload.error) {
          setUploadWarning(payload.error)
        }

        router.refresh()
      } catch (error: any) {
        console.error("Resume upload failed", error)
        resetUploadTimers()
        setUploadProgress(0)
        setUploadStatus("error")
        setUploadError(error.message || "Failed to upload resume. Try again.")
      }
    },
    [router, simulateProgress],
  )

  const handleFileSelection = useCallback(
    (file: File | null) => {
      if (!file) return
      const validationError = validateFile(file)
      if (validationError) {
        setUploadStatus("error")
        setUploadError(validationError)
        return
      }
      setUploadedFileName(file.name)
      performUpload(file)
    },
    [performUpload],
  )

  const handleFinish = async () => {
    setIsFinishing(true)
    setCompletionError(null)
    try {
      // Mark onboarding as complete
      const response = await fetch("/api/users/complete-onboarding", {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to complete onboarding")
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Failed to complete onboarding:", error)
      setCompletionError(error.message || "Failed to complete setup. Please try again.")
      setIsFinishing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    handleFileSelection(dropped ?? null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <div className="h-4 w-4 rounded-sm bg-primary" />
            </div>
            ResuMate AI
          </Link>
          <DynamicUserButton afterSignOutUrl="/auth/login" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">
        <div className="w-full max-w-xl space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome, {userName}
            </h1>
            <p className="text-muted-foreground text-lg">
              Let's set up your profile with your master resume.
            </p>
          </div>

          {/* Upload Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Upload Master Resume
                </h2>
                <p className="text-sm text-muted-foreground">
                  This resume will serve as the foundation for all your future applications.
                  We support PDF, DOCX, and TXT (max 10MB).
                </p>
              </div>

              {/* Upload Zone */}
              <div
                className={cn(
                  "relative flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 dark:border-white/20 p-8 text-center transition-colors",
                  uploadStatus === "error" && "border-red-500/40 bg-red-500/5",
                  uploadStatus === "success" && "border-emerald-500/40 bg-emerald-500/5",
                )}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "copy"
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const dropped = event.dataTransfer.files?.[0]
                  handleFileSelection(dropped ?? null)
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                />

                {uploadStatus === "uploading" ? (
                  <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <div className="space-y-1 w-full text-center">
                      <p className="text-sm font-medium">Uploading...</p>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : uploadStatus === "success" ? (
                  <div className="flex flex-col items-center gap-2 animate-in zoom-in-95 duration-300">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-medium">Upload Complete</p>
                      <p className="text-sm text-muted-foreground max-w-[250px] truncate">
                        {uploadedFileName}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={(e) => {
                      e.stopPropagation()
                      setUploadStatus("idle")
                      setUploadedFileName(null)
                    }}>
                      Replace file
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-0"
                  >
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOCX, or TXT
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Alerts */}
              {uploadError && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {uploadWarning && (
                <Alert className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadWarning}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Footer Action */}
            <div className="bg-muted/30 p-6 sm:p-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                {uploadStatus === "success"
                  ? "Ready to continue to your dashboard."
                  : "Upload your resume to proceed."}
              </div>
              <Button
                onClick={handleFinish}
                disabled={uploadStatus !== "success" || isFinishing}
                size="lg"
                className="w-full sm:w-auto gap-2"
              >
                {isFinishing && <Loader2 className="h-4 w-4 animate-spin" />}
                {isFinishing ? "Setting up..." : "Continue to Dashboard"}
                {!isFinishing && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {completionError && (
            <Alert variant="destructive" className="animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{completionError}</AlertDescription>
            </Alert>
          )}
        </div>
      </main>
    </div>
  )
}

export default OnboardingFlow

