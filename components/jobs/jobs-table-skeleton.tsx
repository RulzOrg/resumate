import { Skeleton } from "@/components/ui/skeleton"

export function JobsTableSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Table content */}
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
          >
            {/* Role & Company */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>

            {/* Keywords */}
            <div className="flex-1 flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>

            {/* Match */}
            <Skeleton className="h-12 w-12 rounded-full" />

            {/* Actions */}
            <Skeleton className="h-9 w-28" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  )
}
