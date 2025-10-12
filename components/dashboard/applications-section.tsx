"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Filter, Download, Wand2, Search } from "lucide-react"
import { ApplicationsTable } from "./applications-table"

interface Application {
  id: string
  title: string
  job_title: string
  company_name: string | null
  variant_name: string
  status: string
  created_at: string
  match_score: number | null
}

interface ApplicationsSectionProps {
  applications: Application[]
}

export function ApplicationsSection({ applications }: ApplicationsSectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  
  const currentPage = parseInt(searchParams.get("page") || "1", 10)
  const perPage = 10

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (searchQuery && currentPage !== 1) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("page", "1")
      router.push(`?${params.toString()}`)
    }
  }, [searchQuery, router, searchParams, currentPage])

  // Filter applications based on search query
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications
    
    const query = searchQuery.toLowerCase()
    return applications.filter(app => 
      app.job_title.toLowerCase().includes(query) ||
      app.company_name?.toLowerCase().includes(query) ||
      app.variant_name.toLowerCase().includes(query)
    )
  }, [applications, searchQuery])

  // Pagination calculations
  const totalApplications = filteredApplications.length
  const totalPages = Math.max(1, Math.ceil(totalApplications / perPage))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const start = (safePage - 1) * perPage
  const paginatedApplications = filteredApplications.slice(start, start + perPage)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(newPage))
    router.push(`?${params.toString()}`)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-border gap-3">
        <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">
          Applications & matches
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-geist hidden sm:inline">Filter</span>
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition">
            <Download className="w-3.5 h-3.5" />
            <span className="font-geist hidden sm:inline">Export</span>
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/15 transition">
            <Wand2 className="w-3.5 h-3.5" />
            <span className="font-geist hidden sm:inline">Auto-match</span>
          </button>
        </div>
      </div>

      {paginatedApplications.length > 0 ? (
        <>
          <ApplicationsTable applications={paginatedApplications} />
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="font-geist">
                Showing {Math.min(totalApplications === 0 ? 0 : start + 1, totalApplications)}–
                {Math.min(start + perPage, totalApplications)} of {totalApplications}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition disabled:opacity-50 disabled:cursor-not-allowed font-geist text-xs text-secondary-foreground"
                >
                  Previous
                </button>
                <span className="opacity-70 font-geist text-xs">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition disabled:opacity-50 disabled:cursor-not-allowed font-geist text-xs text-secondary-foreground"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground font-geist">
            {searchQuery ? `No applications found matching "${searchQuery}"` : "No applications yet. Start by optimizing a resume for a job posting."}
          </p>
        </div>
      )}
    </>
  )
}
