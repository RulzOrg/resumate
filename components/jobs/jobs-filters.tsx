"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface JobsFiltersProps {
  companies: string[]
  selectedCompany: string
  selectedDateRange: string
  selectedMatchRange: string
  sortBy: string
  sortOrder: "asc" | "desc"
  onCompanyChange: (value: string) => void
  onDateRangeChange: (value: string) => void
  onMatchRangeChange: (value: string) => void
  onSortByChange: (value: string) => void
  onSortOrderToggle: () => void
  onClearFilters: () => void
}

export function JobsFilters({
  companies,
  selectedCompany,
  selectedDateRange,
  selectedMatchRange,
  sortBy,
  sortOrder,
  onCompanyChange,
  onDateRangeChange,
  onMatchRangeChange,
  onSortByChange,
  onSortOrderToggle,
  onClearFilters
}: JobsFiltersProps) {
  const hasActiveFilters = selectedCompany !== "all" || selectedDateRange !== "all" || selectedMatchRange !== "all"

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium font-geist">Filters & Sorting</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-auto py-1 px-2 text-xs text-white/60 hover:text-white"
          >
            <X className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Company Filter */}
        <div>
          <label className="text-xs text-white/60 font-geist mb-1.5 block">Company</label>
          <Select value={selectedCompany} onValueChange={onCompanyChange}>
            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map(company => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="text-xs text-white/60 font-geist mb-1.5 block">Date Added</label>
          <Select value={selectedDateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Match Score Filter */}
        <div>
          <label className="text-xs text-white/60 font-geist mb-1.5 block">Match Score</label>
          <Select value={selectedMatchRange} onValueChange={onMatchRangeChange}>
            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
              <SelectValue placeholder="All scores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scores</SelectItem>
              <SelectItem value="high">High (80-100%)</SelectItem>
              <SelectItem value="medium">Medium (50-79%)</SelectItem>
              <SelectItem value="low">Low (0-49%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div>
          <label className="text-xs text-white/60 font-geist mb-1.5 block">Sort By</label>
          <div className="flex gap-1.5">
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="match">Match Score</SelectItem>
                <SelectItem value="title">Job Title</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={onSortOrderToggle}
              className="h-8 px-2 text-xs bg-white/5 border-white/10 hover:bg-white/10"
            >
              {sortOrder === "desc" ? "↓" : "↑"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
