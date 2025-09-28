"use client"

import Link from "next/link"
import type { JobAnalysis } from "@/lib/db"
import { Briefcase } from "lucide-react"

interface TargetJobsCompactListProps {
  analyses: JobAnalysis[]
  limit?: number
  defaultResumeId?: string
}

export function TargetJobsCompactList({ analyses, limit = 2, defaultResumeId }: TargetJobsCompactListProps) {
  const items = analyses.slice(0, limit)
  const createGenerateHref = (jobId: string) => {
    const params = new URLSearchParams({ jobId })
    if (defaultResumeId) {
      params.set("resumeId", defaultResumeId)
    }
    return `/dashboard/optimize?${params.toString()}`
  }
  return (
    <div className="space-y-4">
      {items.map((job) => (
        <div
          key={job.id}
          className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white/5">
              <Briefcase className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <p className="font-medium">{job.job_title}</p>
              <p className="text-sm text-white/60">{job.company_name || "Company"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link href={`/dashboard/jobs/${job.id}`} className="text-xs font-medium text-white/70 hover:text-white transition">
              View
            </Link>
            <Link
              href={createGenerateHref(job.id)}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
            >
              Generate
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}


