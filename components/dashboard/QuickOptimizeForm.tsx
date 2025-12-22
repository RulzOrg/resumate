"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"

interface Resume {
  id: string
  title: string
  file_name: string
  processing_status: string
}

interface QuickOptimizeFormProps {
  resumes: Resume[]
}

export function QuickOptimizeForm({ resumes }: QuickOptimizeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id || "")
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")

  const completedResumes = resumes.filter(r => r.processing_status === "completed")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedResumeId) {
      setError("Please select a resume")
      return
    }

    if (!jobTitle.trim()) {
      setError("Please enter a job title")
      return
    }

    if (jobDescription.trim().length < 50) {
      setError("Please enter a more detailed job description (at least 50 characters)")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/resumes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: selectedResumeId,
          job_title: jobTitle.trim(),
          company_name: companyName.trim() || null,
          job_description: jobDescription.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to optimize resume")
      }

      // Redirect to the optimized resume
      router.push(`/dashboard/optimized/${data.optimized_resume.id}`)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      setIsLoading(false)
    }
  }

  if (completedResumes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground/60 dark:text-white/60 mb-4">
          Upload a resume first to start optimizing
        </p>
        <Button
          onClick={() => {
            // Trigger upload dialog - this would need to be implemented
            // For now, just show a message
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-black"
        >
          Upload Resume
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Select Resume</label>
        <select
          value={selectedResumeId}
          onChange={(e) => setSelectedResumeId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={isLoading}
        >
          {completedResumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Job Title *</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
            className="w-full px-3 py-2 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Google"
            className="w-full px-3 py-2 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Job Description *</label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={6}
          className="w-full px-3 py-2 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-foreground/50 dark:text-white/50">
          {jobDescription.length} characters {jobDescription.length < 50 && "(minimum 50)"}
        </p>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !selectedResumeId || !jobTitle.trim() || jobDescription.length < 50}
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-3"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Optimizing... (this may take 30-60 seconds)
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Optimize Resume
          </>
        )}
      </Button>
    </form>
  )
}

