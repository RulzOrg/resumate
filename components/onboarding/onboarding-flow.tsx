"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react"

// Dynamically import UserButton to avoid SSR issues
const DynamicUserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => ({ default: mod.UserButton })),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-9 w-9 rounded-full bg-white/10 animate-pulse" />
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
      setUploadProgress((prev) => (prev >= 80 ? prev : prev + 10))
    }, 180)
  }, [])

  const performUpload = useCallback(
    async (file: File) => {
      setUploadStatus("uploading")
      setUploadError(null)
      setUploadWarning(null)
      setUploadProgress(12)
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

        setTimeout(() => {
          setUploadProgress(0)
        }, 600)

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

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[1400px] -translate-x-1/2 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120,119,198,0.2), hsla(0,0%,100%,0))",
        }}
      />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M21 21v-5h-5" />
                </svg>
              </span>
              <span className="text-base font-medium tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                ResuMate AI
              </span>
            </Link>
          </div>
          <div className="relative h-9 w-9">
            <DynamicUserButton afterSignOutUrl="/auth/login" />
          </div>
        </div>
      </header>

      <main className="py-12 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {`Welcome to ResuMate AI${userName ? `, ${userName}` : ""}`}
            </h1>
            <p className="mt-2 text-base text-white/60">
              Upload your resume to get started with AI-powered optimization.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
            <div className="space-y-8 p-6 sm:p-8">
              <section>
                <div className="mb-5">
                  <h2
                    className="text-lg font-medium tracking-tight"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    Upload Your Master Resume
                  </h2>
                  <p className="text-sm text-white/60">
                    <span className="text-emerald-400 font-medium">Required:</span> This becomes the baseline for every AI-generated resume. We support PDF, DOCX, and TXT up to 10MB.
                  </p>
                </div>

                <div
                  className={cn(
                    "relative flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 p-8 text-center transition-colors",
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
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      fileInputRef.current?.click()
                    }
                  }}
                >
                  <div className="flex flex-col items-center">
                    <UploadCloud className="mb-3 h-10 w-10 text-white/30" />
                    <span className="text-sm font-medium text-white/80">
                      <span className="text-emerald-400">Click to upload</span> or drag and drop
                    </span>
                    <span className="mt-1 block text-xs text-white/50">Max file size 10MB</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                  />
                </div>

                {uploadStatus === "uploading" && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading and analyzing your resume…
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadStatus === "success" && uploadedFileName && (
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Uploaded {uploadedFileName}</span>
                  </div>
                )}

                {uploadWarning && (
                  <Alert className="mt-3 border-amber-500/40 bg-amber-500/10 text-amber-100">
                    <AlertDescription>{uploadWarning}</AlertDescription>
                  </Alert>
                )}

                {uploadError && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}
              </section>
            </div>

            <div className="rounded-b-2xl border-t border-white/10 bg-black/30 px-6 py-5 sm:px-8">
              {completionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{completionError}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={handleFinish}
                  disabled={uploadStatus !== "success" || isFinishing}
                  className="w-full rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/40 sm:w-auto"
                >
                  {isFinishing ? "Opening dashboard…" : "Finish Setup & View Dashboard"}
                </Button>
                {uploadStatus !== "success" && !isFinishing && (
                  <p className="text-xs text-white/50 text-center">
                    Upload your resume to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default OnboardingFlow
