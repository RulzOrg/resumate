/**
 * Optimized version of JobsTable using React.memo and memoized callbacks
 */
"use client"

import { memo, useCallback } from "react"
import Link from "next/link"
import { FilePlus } from "lucide-react"
import { CircularProgress } from "./circular-progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

interface JobsTableOptimizedProps {
  jobs: Job[]
  selectedJobs: Set<string>
  deleteMode: boolean
  onSelectAll: (checked: boolean) => void
  onSelectJob: (jobId: string, checked: boolean) => void
}

// Memoize individual row component
const JobRow = memo(function JobRow({ 
  job, 
  isSelected, 
  deleteMode, 
  onSelectJob,
  maxVisibleKeywords = 3
}: { 
  job: Job
  isSelected: boolean
  deleteMode: boolean
  onSelectJob: (jobId: string, checked: boolean) => void
  maxVisibleKeywords?: number
}) {
  const clampedScore = Math.max(0, Math.min(100, Number(job.match_score) || 0))
  const visibleKeywords = job.keywords.slice(0, maxVisibleKeywords)
  const remainingKeywords = job.keywords.slice(maxVisibleKeywords)
  const hasMore = remainingKeywords.length > 0

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectJob(job.id, e.target.checked)
  }, [job.id, onSelectJob])

  return (
    <TableRow className="border-b border-white/10 hover:bg-white/5">
      {deleteMode && (
        <TableCell>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="w-4 h-4 rounded border-white/30 bg-white/5 checked:bg-emerald-500 checked:border-emerald-500"
          />
        </TableCell>
      )}
      <TableCell>
        <div>
          <div className="font-medium text-white/90 font-geist">{job.job_title}</div>
          <div className="text-sm text-white/60 font-geist mt-0.5">{job.company_name || "—"}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1.5 max-w-md">
          {visibleKeywords.map((keyword, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              {keyword}
            </span>
          ))}
          {hasMore && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60 cursor-help">
                    +{remainingKeywords.length} more
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="flex flex-wrap gap-1.5 p-1">
                    {remainingKeywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex justify-center">
          <CircularProgress value={clampedScore} size={48} strokeWidth={4} />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Link
          href={`/dashboard/optimize?jobId=${job.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-black px-2.5 py-1.5 text-xs font-medium hover:bg-emerald-400 transition whitespace-nowrap"
        >
          <FilePlus className="w-3.5 h-3.5" />
          Generate CV
        </Link>
      </TableCell>
    </TableRow>
  )
})

export const JobsTableOptimized = memo(function JobsTableOptimized({ 
  jobs, 
  selectedJobs, 
  deleteMode, 
  onSelectAll, 
  onSelectJob 
}: JobsTableOptimizedProps) {
  const allSelected = jobs.length > 0 && jobs.every(j => selectedJobs.has(j.id))
  const someSelected = jobs.some(j => selectedJobs.has(j.id)) && !allSelected

  const handleSelectAllChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAll(e.target.checked)
  }, [onSelectAll])

  return (
    <>
      {/* Desktop Table */}
      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10">
              {deleteMode && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={handleSelectAllChange}
                    className="w-4 h-4 rounded border-white/30 bg-white/5 checked:bg-emerald-500 checked:border-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead>Role & Company</TableHead>
              <TableHead className="w-1/3">Keywords</TableHead>
              <TableHead className="w-20">Match</TableHead>
              <TableHead className="text-right w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                isSelected={selectedJobs.has(job.id)}
                deleteMode={deleteMode}
                onSelectJob={onSelectJob}
              />
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>

      {/* Mobile Card View - simplified for performance */}
      <MobileCardList>
        {jobs.map((job) => (
          <MobileCard key={job.id}>
            <div className="space-y-3">
              <div>
                <h3 className="font-geist text-white/90 font-medium">{job.job_title}</h3>
                <p className="text-sm text-white/60">{job.company_name || "—"}</p>
              </div>
              <Link
                href={`/dashboard/optimize?jobId=${job.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-black px-3 py-2 text-sm font-medium hover:bg-emerald-400 transition"
              >
                <FilePlus className="w-4 h-4" />
                Generate CV
              </Link>
            </div>
          </MobileCard>
        ))}
      </MobileCardList>
    </>
  )
})
