"use client"

import type React from "react"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Link2, X } from "lucide-react"

interface AnalyzeJobDialogProps {
  children: React.ReactNode
}

export function AnalyzeJobDialog({ children }: AnalyzeJobDialogProps) {
  const [open, setOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")
  // URL
  const [jobUrl, setJobUrl] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [jobDescription, setJobDescription] = useState("")

  const router = useRouter()

  const handleFetchFromUrl = async () => {
    if (!jobUrl.trim()) return

    setIsFetching(true)
    setError("")

    try {
      const response = await fetch("/api/jobs/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        // If we decide to reintroduce auto-fetch, populate description
        setJobDescription(data.content || "")
      } else {
        const result = await response.json()
        setError(result.error || "Failed to fetch job posting")
      }
    } catch (err) {
      setError("Failed to fetch job posting")
    } finally {
      setIsFetching(false)
    }
  }

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError("Job description is required")
      return
    }

    setIsAnalyzing(true)
    setError("")

    const deriveTitle = () => {
      try {
        if (jobUrl.trim()) {
          const u = new URL(jobUrl.trim())
          const last = u.pathname.split("/").filter(Boolean).pop() || ""
          const fromPath = last
            .replace(/[-_]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
          if (fromPath) {
            return fromPath
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          }
          const hostPart = u.hostname.split(".")[0]
          return hostPart ? `${hostPart.charAt(0).toUpperCase() + hostPart.slice(1)} Role` : "Target Role"
        }
      } catch {}
      const firstLine = jobDescription.split(/\n|\r/)[0]?.trim()
      if (firstLine && firstLine.length > 0) return firstLine.slice(0, 80)
      return "Target Role"
    }

    try {
      const response = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: deriveTitle(),
          company_name: undefined,
          job_url: jobUrl.trim() || undefined,
          job_description: jobDescription.trim(),
        }),
      })

      if (response.ok) {
        setOpen(false)
        resetForm()
        router.refresh()
      } else {
        const result = await response.json()
        setError(result.error || "Analysis failed")
      }
    } catch (err) {
      setError("An error occurred during analysis")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetForm = () => {
    setJobUrl("")
    setJobDescription("")
    setError("")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        overlayClassName="bg-black/80 backdrop-blur-sm"
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-white/10 bg-[#111111] p-0"
        showCloseButton={false}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl tracking-tight">Add Target Job</DialogTitle>
                <DialogDescription className="mt-1 text-white/60 text-sm">
                  Import from a URL or paste the description.
                </DialogDescription>
              </DialogHeader>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 space-y-6">
            <div>
              <Label htmlFor="job-url" className="mb-2 block text-white/80">Job Post URL</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Link2 className="h-5 w-5 text-white/40" />
                </div>
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://example.com/careers/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={isFetching}
                  className="bg-white/5 border-white/10 text-white placeholder-white/40 pl-10"
                />
              </div>
            </div>

            <div className="flex items-center py-1">
              <div className="flex-grow border-t border-white/10" />
              <span className="mx-4 text-xs text-white/50 uppercase">Or</span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isAnalyzing}
                rows={10}
                className="resize-none bg-white/5 border-white/10 text-white placeholder-white/40"
              />
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-4 bg-black/30 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-2xl">
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto text-white/80 bg-white/10 hover:bg-white/20"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!jobDescription.trim() || isAnalyzing}
            className="w-full sm:w-auto text-black bg-emerald-500 hover:bg-emerald-400"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Add Job'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
