"use client"

import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Filter, Download, Search } from "lucide-react"
import { JobsTable } from "./jobs-table"

interface Job {
  id: string
  job_title: string
  company_name: string | null
  created_at: string
  keywords: string[]
  match_score: number
  cv_count: number
}

interface JobsTableSectionProps {
  jobs: Job[]
}

export function JobsTableSection({ jobs }: JobsTableSectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  
  const currentPage = parseInt(searchParams.get("page") || "1", 10)
  const perPage = 10

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs
    
    const query = searchQuery.toLowerCase()
    return jobs.filter(job => 
      job.job_title.toLowerCase().includes(query) ||
      job.company_name?.toLowerCase().includes(query) ||
      job.keywords.some(k => k.toLowerCase().includes(query))
    )
  }, [jobs, searchQuery])

  // Pagination calculations
  const totalJobs = filteredJobs.length
  const totalPages = Math.max(1, Math.ceil(totalJobs / perPage))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const start = (safePage - 1) * perPage
  const paginatedJobs = filteredJobs.slice(start, start + perPage)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(newPage))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-white/10 gap-3">
        <h2 className="text-lg font-medium tracking-tight font-geist">Jobs</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-white/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-xs"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-geist hidden sm:inline">Filter</span>
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition">
            <Download className="w-3.5 h-3.5" />
            <span className="font-geist hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {paginatedJobs.length > 0 ? (
        <>
          <JobsTable jobs={paginatedJobs} />
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/70">
              <span className="font-geist">
                Showing {Math.min(totalJobs === 0 ? 0 : start + 1, totalJobs)}–
                {Math.min(start + perPage, totalJobs)} of {totalJobs}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed font-geist text-xs"
                >
                  Previous
                </button>
                <span className="opacity-70 font-geist text-xs">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed font-geist text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-white/60 font-geist">
            {searchQuery ? `No jobs found matching "${searchQuery}"` : "No jobs yet. Add a job description to get started."}
          </p>
        </div>
      )}
    </div>
  )
}
