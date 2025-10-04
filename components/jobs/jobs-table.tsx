"use client"

import Link from "next/link"
import { FilePlus } from "lucide-react"
import { getJobIcon, getMatchScoreColor } from "@/lib/jobs-utils"
import { formatDistanceToNow } from "date-fns"

interface Job {
  id: string
  job_title: string
  company_name: string | null
  created_at: string
  keywords: string[]
  match_score: number
  cv_count: number
}

interface JobsTableProps {
  jobs: Job[]
}

export function JobsTable({ jobs }: JobsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-white/60">
          <tr className="border-b border-white/10">
            <th className="text-left font-medium py-3 px-4">Role</th>
            <th className="text-left font-medium py-3 px-4">Company</th>
            <th className="text-left font-medium py-3 px-4">Added</th>
            <th className="text-left font-medium py-3 px-4">Keywords</th>
            <th className="text-left font-medium py-3 px-4">Match</th>
            <th className="text-right font-medium py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, idx) => {
            const JobIcon = getJobIcon(job.job_title)
            const matchColor = getMatchScoreColor(job.match_score)
            
            return (
              <tr
                key={job.id}
                className={`hover:bg-white/[0.04] ${
                  idx < jobs.length - 1 ? "border-b border-white/10" : ""
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <JobIcon className="w-4 h-4 text-white/60" />
                    <span className="font-geist text-white/90">{job.job_title}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-white/80">
                  {job.company_name || "—"}
                </td>
                <td className="py-3 px-4 text-white/70">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: false })} ago
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1.5">
                    {job.keywords.slice(0, 3).map((keyword, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${matchColor}`}
                        style={{ width: `${job.match_score}%` }}
                      />
                    </div>
                    <span className="text-white/80">{job.match_score}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/dashboard/optimize?jobId=${job.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-black px-2.5 py-1.5 text-xs font-medium hover:bg-emerald-400 transition"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    Generate CV
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
