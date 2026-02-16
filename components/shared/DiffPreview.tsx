"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DiffEntry } from "@/lib/chat-edit-types"

export function DiffPreview({ diffs }: { diffs: DiffEntry[] }) {
  return (
    <div className="mt-2 space-y-2">
      {diffs.map((diff, i) => (
        <div
          key={i}
          className="rounded-md border border-border bg-muted/30 p-2 text-xs"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1 py-0 h-4",
                diff.type === "added" && "border-green-500/50 text-green-600 dark:text-green-400",
                diff.type === "modified" && "border-amber-500/50 text-amber-600 dark:text-amber-400",
                diff.type === "removed" && "border-red-500/50 text-red-600 dark:text-red-400"
              )}
            >
              {diff.type}
            </Badge>
            <span className="text-muted-foreground truncate">
              {diff.section}
            </span>
          </div>

          {diff.before && (
            <p className="text-red-600 dark:text-red-400 line-through opacity-70 break-words">
              {diff.before}
            </p>
          )}
          {diff.after && (
            <p className="text-green-600 dark:text-green-400 break-words">
              {diff.after}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
