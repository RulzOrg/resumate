"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { JobAnalysis } from "@/lib/db"
import { Briefcase, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TargetJobsCompactListProps {
  analyses: JobAnalysis[]
  allAnalyses?: JobAnalysis[]
  limit?: number
  defaultResumeId?: string
}

export function TargetJobsCompactList({ analyses, allAnalyses, limit = 2, defaultResumeId }: TargetJobsCompactListProps) {
  const router = useRouter()
  const items = analyses.slice(0, limit)
  const allJobs = allAnalyses || analyses
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const createGenerateHref = (jobId: string) => {
    const params = new URLSearchParams({ jobId })
    if (defaultResumeId) {
      params.set("resumeId", defaultResumeId)
    }
    return `/dashboard/optimize?${params.toString()}`
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const allItemIds = new Set(allJobs.map((job) => job.id))
    const allSelected = allItemIds.size > 0 && Array.from(allItemIds).every((id) => selectedIds.has(id))
    
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(allItemIds)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingIds.has(id)) return
    
    setDeletingIds((prev) => new Set(prev).add(id))
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete job")
      }
      
      router.refresh()
    } catch (error) {
      console.error("Error deleting job:", error)
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    
    // Show confirmation dialog for bulk delete
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} ${selectedIds.size === 1 ? "job" : "jobs"}? This action cannot be undone.`
    )
    
    if (!confirmed) return
    
    const idsToDelete = Array.from(selectedIds)
    setDeletingIds((prev) => new Set([...prev, ...idsToDelete]))
    
    try {
      console.log("Deleting jobs:", idsToDelete.length, "ids")
      const response = await fetch("/api/jobs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete jobs")
      }
      
      console.log("Delete successful:", data)
      setSelectedIds(new Set())
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting jobs:", error)
      alert(`Failed to delete jobs: ${error.message || "Unknown error"}`)
      setDeletingIds((prev) => {
        const next = new Set(prev)
        idsToDelete.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  const allItemIds = new Set(allJobs.map((job) => job.id))
  const allSelected = allItemIds.size > 0 && Array.from(allItemIds).every((id) => selectedIds.has(id))
  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <div className="space-y-4">
      {(selectedIds.size > 0 || allJobs.length > items.length) && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10">
          <div className="flex items-center gap-3">
            {allJobs.length > items.length && (
              <button
                onClick={handleSelectAll}
                className="text-xs font-medium text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white transition"
              >
                {allSelected ? "Deselect all" : `Select all ${allJobs.length} jobs`}
              </button>
            )}
            {selectedIds.size > 0 && (
              <span className="text-sm text-foreground/70 dark:text-white/70">
                {selectedIds.size} {selectedIds.size === 1 ? "job" : "jobs"} selected
                {someSelected && allJobs.length > items.length && ` (${allJobs.length} total)`}
              </span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleBulkDelete()
              }}
              disabled={deletingIds.size > 0}
              className="h-8 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {deletingIds.size > 0 ? "Deleting..." : `Delete ${selectedIds.size}`}
            </Button>
          )}
        </div>
      )}
      
      {items.map((job) => {
        const isSelected = selectedIds.has(job.id)
        const isDeleting = deletingIds.has(job.id)
        
        return (
          <div
            key={job.id}
            className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-surface-subtle dark:bg-white/5 border border-border dark:border-white/10 transition-opacity ${
              isDeleting ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleSelect(job.id)}
                className="h-4 w-4 rounded border-border dark:border-white/20 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500 dark:focus:ring-emerald-400 cursor-pointer"
              />
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10">
                <Briefcase className="h-5 w-5 text-foreground/70 dark:text-white/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{job.job_title}</p>
                <p className="text-sm text-foreground/60 dark:text-white/60 truncate">{job.company_name || "Company"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Link 
                href={`/dashboard/jobs/${job.id}`} 
                className="text-xs font-medium text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white transition"
              >
                View
              </Link>
              <Link
                href={createGenerateHref(job.id)}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
              >
                Generate New Resume
              </Link>
              <button
                onClick={() => handleDelete(job.id)}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-foreground/50 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30"
                aria-label="Delete job"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
      
      {items.length > 1 && allJobs.length === items.length && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white transition"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
      )}
    </div>
  )
}
