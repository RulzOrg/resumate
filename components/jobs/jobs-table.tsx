"use client"

import Link from "next/link"
import { FilePlus } from "lucide-react"
import { getJobIcon, getMatchScoreColor } from "@/lib/jobs-utils"
import { formatDistanceToNow } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ResponsiveTable,
  MobileCardList,
  MobileCard,
  MobileCardRow,
} from "@/components/ui/responsive-table"

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
    <>
      {/* Desktop Table */}
      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10">
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Match</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {jobs.map((job, idx) => {
            const JobIcon = getJobIcon(job.job_title)
            const matchColor = getMatchScoreColor(job.match_score)
            
            return (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <JobIcon className="w-4 h-4 text-white/60" />
                    <span className="font-geist text-white/90">{job.job_title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-white/80">
                  {job.company_name || "—"}
                </TableCell>
                <TableCell className="text-white/70">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: false })} ago
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${matchColor}`}
                        style={{ width: `${job.match_score}%` }}
                      />
                    </div>
                    <span className="text-white/80">{job.match_score}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dashboard/optimize?jobId=${job.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-black px-2.5 py-1.5 text-xs font-medium hover:bg-emerald-400 transition"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    Generate CV
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
          </TableBody>
        </Table>
      </ResponsiveTable>

      {/* Mobile Card View */}
      <MobileCardList>
        {jobs.map((job) => {
          const JobIcon = getJobIcon(job.job_title)
          const matchColor = getMatchScoreColor(job.match_score)
          
          return (
            <MobileCard key={job.id}>
              {/* Role */}
              <div className="flex items-start gap-2 pb-3 border-b border-white/10">
                <JobIcon className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-geist text-white/90 font-medium">{job.job_title}</h3>
                  <p className="text-sm text-white/60 mt-0.5">{job.company_name || "—"}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <MobileCardRow label="Added">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: false })} ago
                </MobileCardRow>

                <MobileCardRow label="Keywords">
                  <div className="flex flex-wrap gap-1.5 justify-end">
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
                </MobileCardRow>

                <MobileCardRow label="Match">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${matchColor}`}
                        style={{ width: `${job.match_score}%` }}
                      />
                    </div>
                    <span className="text-white/80 text-sm font-medium">{job.match_score}%</span>
                  </div>
                </MobileCardRow>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-white/10">
                <Link
                  href={`/dashboard/optimize?jobId=${job.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-black px-3 py-2 text-sm font-medium hover:bg-emerald-400 transition"
                >
                  <FilePlus className="w-4 h-4" />
                  Generate CV
                </Link>
              </div>
            </MobileCard>
          )
        })}
      </MobileCardList>
    </>
  )
}
