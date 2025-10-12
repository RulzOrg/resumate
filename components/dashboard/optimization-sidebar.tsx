"use client"

import { Files, ScanLine, ListChecks, Highlighter, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OptimizationSidebarProps {
  variantCount?: number
  atsHealthy?: boolean
  formattingGood?: boolean
  keywordsNeeded?: number
}

export function OptimizationSidebar({
  variantCount = 3,
  atsHealthy = true,
  formattingGood = true,
  keywordsNeeded = 2,
}: OptimizationSidebarProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">
          Resume optimization
        </h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-border bg-muted flex items-center justify-center">
            <Files className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist text-foreground">Variants</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">
              {variantCount === 0
                ? "No variants created yet."
                : `${variantCount} tailored ${variantCount === 1 ? "version" : "versions"} in use.`}
            </p>
          </div>
          {variantCount > 0 && (
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Active</span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-border bg-muted flex items-center justify-center">
            <ScanLine className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist text-foreground">ATS compatibility</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">
              {atsHealthy ? "No parsing blockers detected." : "Issues found."}
            </p>
          </div>
          <span
            className={`text-xs font-medium ${
              atsHealthy ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {atsHealthy ? "Pass" : "Warn"}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-border bg-muted flex items-center justify-center">
            <ListChecks className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist text-foreground">Formatting</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">
              {formattingGood
                ? "Consistent headings and sections."
                : "Inconsistencies found."}
            </p>
          </div>
          <span
            className={`text-xs font-medium ${
              formattingGood ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {formattingGood ? "Good" : "Review"}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-border bg-muted flex items-center justify-center">
            <Highlighter className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist text-foreground">Keywords</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">
              {keywordsNeeded > 0
                ? `Add ${keywordsNeeded} role-specific tools to boost match.`
                : "All key terms present."}
            </p>
          </div>
          <span
            className={`text-xs font-medium ${
              keywordsNeeded > 0 ? "text-foreground" : "text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {keywordsNeeded > 0 ? "Action" : "Good"}
          </span>
        </div>

        <Button className="inline-flex hover:bg-emerald-400 transition text-sm font-medium text-black bg-emerald-500 w-full rounded-full pt-2 pr-3 pb-2 pl-3 gap-x-2 gap-y-2 items-center justify-center">
          <Wand2 className="w-4 h-4" />
          Optimize & tailor
        </Button>
      </div>
    </div>
  )
}
