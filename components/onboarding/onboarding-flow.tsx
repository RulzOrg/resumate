"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { UploadCloud, Link2, Plus, Trash2, CheckCircle2, Loader2, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { JobTarget } from "@/lib/db"
import { cn } from "@/lib/utils"

interface OnboardingFlowProps {
  userName: string
  hasMasterResume: boolean
  masterResumeTitle?: string | null
  initialJobTargets: JobTarget[]
}

type UploadStatus = "idle" | "uploading" | "success" | "error"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatJobUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")
    const path = parsed.pathname.replace(/\/+$/, "")
    return path && path !== "/" ? `${host}${path.length > 40 ? `${path.slice(0, 37)}…` : path}` : host
  } catch {
    return url
  }
}

export function OnboardingFlow({
  userName,
  hasMasterResume,
  masterResumeTitle,
  initialJobTargets,
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

  const [jobUrl, setJobUrl] = useState("")
  const [jobTargets, setJobTargets] = useState<JobTarget[]>(initialJobTargets)
  const [jobError, setJobError] = useState<string | null>(null)
  const [isSavingJob, setIsSavingJob] = useState(false)
  const [removingJobId, setRemovingJobId] = useState<string | null>(null)

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
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 10MB"
    }
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

  const handleJobAdd = async () => {
    const trimmed = jobUrl.trim()
    setJobError(null)

    if (!trimmed) {
      setJobError("Enter a job URL to add it")
      return
    }

    try {
      setIsSavingJob(true)
      const response = await fetch("/api/job-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_url: trimmed }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save job")
      }

      if (payload.target) {
        setJobTargets((prev) => {
          const filtered = prev.filter((target) => target.id !== payload.target.id)
          return [payload.target, ...filtered]
        })
      }

      setJobUrl("")
      router.refresh()
    } catch (error: any) {
      console.error("Failed to save job target", error)
      setJobError(error.message || "Unable to save job. Try again.")
    } finally {
      setIsSavingJob(false)
    }
  }

  const handleJobDelete = async (id: string) => {
    try {
      setJobError(null)
      setRemovingJobId(id)
      const response = await fetch(`/api/job-targets?id=${id}`, {
        method: "DELETE",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Unable to remove job")
      }
      setJobTargets((prev) => prev.filter((target) => target.id !== id))
      router.refresh()
    } catch (error: any) {
      console.error("Failed to delete job target", error)
      setJobError(error.message || "Unable to remove job. Try again.")
    } finally {
      setRemovingJobId(null)
    }
  }

  const handleFinish = async () => {
    setIsFinishing(true)
    try {
      router.push("/dashboard")
    } finally {
      setTimeout(() => setIsFinishing(false), 400)
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
            <UserButton afterSignOutUrl="/auth/login" />
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
              Let&apos;s set up your profile so we can tailor every resume to the roles you love.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
            <div className="space-y-8 p-6 sm:p-8">
              <section>
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500/20 text-sm font-semibold text-emerald-300">
                    1
                  </div>
                  <div>
                    <h2
                      className="text-lg font-medium tracking-tight"
                      style={{ fontFamily: "var(--font-space-grotesk)" }}
                    >
                      Upload Your Master Resume
                    </h2>
                    <p className="text-sm text-white/60">
                      This becomes the baseline for every AI-generated resume. We support PDF, DOCX, and TXT up to 10MB.
                    </p>
                  </div>
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

              <div className="border-t border-white/10" />

              <section>
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 text-sm font-semibold text-white/60">
                    2
                  </div>
                  <div>
                    <h2
                      className="text-lg font-medium tracking-tight"
                      style={{ fontFamily: "var(--font-space-grotesk)" }}
                    >
                      Add Your Target Jobs
                    </h2>
                    <p className="text-sm text-white/60">
                      Paste job post URLs you&apos;re excited about. We&apos;ll keep them handy so you can optimize in a click.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-grow">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/40">
                      <Link2 className="h-5 w-5" />
                    </span>
                    <Input
                      type="url"
                      value={jobUrl}
                      onChange={(event) => setJobUrl(event.target.value)}
                      placeholder="Paste job URL (LinkedIn, Indeed, company site…)"
                      className="w-full rounded-lg border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder:text-white/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                      disabled={isSavingJob}
                    />
                  </div>
                  <Button
                    onClick={handleJobAdd}
                    disabled={isSavingJob}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 sm:w-auto"
                  >
                    {isSavingJob ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Add Job
                      </>
                    )}
                  </Button>
                </div>

                {jobError && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    {jobError}
                  </div>
                )}

                <div className="mt-4 rounded-lg bg-black/30 p-4">
                  {jobTargets.length === 0 ? (
                    <p className="text-center text-sm text-white/50">
                      Your target jobs will appear here after you add them.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {jobTargets.map((target) => (
                        <li
                          key={target.id}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80"
                        >
                          <div>
                            <p className="font-medium text-white/90">
                              {target.job_title || formatJobUrl(target.job_url)}
                            </p>
                            <p className="text-xs text-white/50">
                              {target.company_name || target.job_url}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleJobDelete(target.id)}
                            disabled={removingJobId === target.id}
                            className="text-white/60 hover:text-red-400"
                          >
                            {removingJobId === target.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-4 rounded-b-2xl border-t border-white/10 bg-black/30 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <Link
                href="/dashboard"
                className="text-center text-sm text-white/60 transition-colors hover:text-white sm:text-left"
              >
                Skip &amp; go to dashboard
              </Link>
              <Button
                onClick={handleFinish}
                disabled={uploadStatus === "uploading" || isFinishing}
                className="w-full rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-emerald-400 sm:w-auto"
              >
                {isFinishing ? "Opening dashboard…" : "Finish Setup & View Dashboard"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default OnboardingFlow
