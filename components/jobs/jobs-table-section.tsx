"use client"

import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Filter, Download, Search, Trash2, ChevronDown } from "lucide-react"
import { JobsTable } from "./jobs-table"
import { JobsFilters } from "./jobs-filters"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { isAfter, isWithinInterval, subDays, subMonths, startOfDay } from "date-fns"
import { useDebounce } from "@/hooks/use-debounce"

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
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // Debounce search for performance
  const [showFilters, setShowFilters] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  
  // Filter states
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [selectedDateRange, setSelectedDateRange] = useState("all")
  const [selectedMatchRange, setSelectedMatchRange] = useState("all")
  
  // Sort states
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  const currentPage = parseInt(searchParams.get("page") || "1", 10)
  const perPage = 10

  // Extract unique companies for filter dropdown
  const companies = useMemo(() => {
    const uniqueCompanies = new Set(
      jobs.map(j => j.company_name).filter((c): c is string => !!c)
    )
    return Array.from(uniqueCompanies).sort()
  }, [jobs])

  // Filter and sort jobs (use debounced search for performance)
  const filteredJobs = useMemo(() => {
    let filtered = [...jobs]

    // Search filter (debounced)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(job => 
        job.job_title.toLowerCase().includes(query) ||
        job.company_name?.toLowerCase().includes(query) ||
        job.keywords.some(k => k.toLowerCase().includes(query))
      )
    }

    // Company filter
    if (selectedCompany !== "all") {
      filtered = filtered.filter(job => job.company_name === selectedCompany)
    }

    // Date range filter
    if (selectedDateRange !== "all") {
      const now = new Date()
      const jobDate = (job: Job) => startOfDay(new Date(job.created_at))
      
      filtered = filtered.filter(job => {
        const date = jobDate(job)
        switch (selectedDateRange) {
          case "today":
            return isAfter(date, startOfDay(now))
          case "week":
            return isWithinInterval(date, { start: subDays(now, 7), end: now })
          case "month":
            return isWithinInterval(date, { start: subMonths(now, 1), end: now })
          case "3months":
            return isWithinInterval(date, { start: subMonths(now, 3), end: now })
          default:
            return true
        }
      })
    }

    // Match score filter
    if (selectedMatchRange !== "all") {
      filtered = filtered.filter(job => {
        const score = Number(job.match_score) || 0
        switch (selectedMatchRange) {
          case "high":
            return score >= 80
          case "medium":
            return score >= 50 && score < 80
          case "low":
            return score < 50
          default:
            return true
        }
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "match":
          comparison = (Number(a.match_score) || 0) - (Number(b.match_score) || 0)
          break
        case "title":
          comparison = a.job_title.localeCompare(b.job_title)
          break
        case "company":
          comparison = (a.company_name || "").localeCompare(b.company_name || "")
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [jobs, debouncedSearchQuery, selectedCompany, selectedDateRange, selectedMatchRange, sortBy, sortOrder])

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

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(new Set(paginatedJobs.map(j => j.id)))
    } else {
      setSelectedJobs(new Set())
    }
  }

  const handleSelectJob = (jobId: string, checked: boolean) => {
    const newSelected = new Set(selectedJobs)
    if (checked) {
      newSelected.add(jobId)
    } else {
      newSelected.delete(jobId)
    }
    setSelectedJobs(newSelected)
  }

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return

    try {
      const response = await fetch("/api/jobs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: Array.from(selectedJobs) })
      })

      if (!response.ok) throw new Error("Failed to delete jobs")

      toast.success(`${selectedJobs.size} job${selectedJobs.size > 1 ? "s" : ""} deleted`, {
        className: "font-geist"
      })
      setSelectedJobs(new Set())
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete jobs", { className: "font-geist" })
    }
  }

  // Export handler
  const handleExport = () => {
    const dataStr = JSON.stringify(filteredJobs, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `jobs-export-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Jobs exported successfully", { className: "font-geist" })
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCompany("all")
    setSelectedDateRange("all")
    setSelectedMatchRange("all")
  }

  // Toggle delete mode
  const handleToggleDeleteMode = () => {
    setDeleteMode(!deleteMode)
    if (deleteMode) {
      setSelectedJobs(new Set()) // Clear selections when exiting delete mode
    }
  }

  return (
    <div className="space-y-3">
      {/* Filters Panel */}
      {showFilters && (
        <JobsFilters
          companies={companies}
          selectedCompany={selectedCompany}
          selectedDateRange={selectedDateRange}
          selectedMatchRange={selectedMatchRange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onCompanyChange={setSelectedCompany}
          onDateRangeChange={setSelectedDateRange}
          onMatchRangeChange={setSelectedMatchRange}
          onSortByChange={setSortBy}
          onSortOrderToggle={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          onClearFilters={handleClearFilters}
        />
      )}

      <div className="rounded-xl border border-white/10 bg-white/5">
        {/* Bulk Actions Toolbar */}
        {deleteMode && selectedJobs.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-red-500/10">
            <span className="text-sm text-white/80 font-geist">
              {selectedJobs.size} job{selectedJobs.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleDeleteMode}
                className="h-8 text-xs text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="font-geist hidden sm:inline">Filter</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="font-geist hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handleToggleDeleteMode}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                deleteMode
                  ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="font-geist hidden sm:inline">{deleteMode ? "Cancel" : "Delete"}</span>
            </button>
          </div>
        </div>

        {paginatedJobs.length > 0 ? (
          <>
            <JobsTable
              jobs={paginatedJobs}
              selectedJobs={selectedJobs}
              deleteMode={deleteMode}
              onSelectAll={handleSelectAll}
              onSelectJob={handleSelectJob}
            />
            
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
    </div>
  )
}
