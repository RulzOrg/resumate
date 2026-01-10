import { Suspense } from "react"
import { SystemHealthContent } from "@/components/admin/SystemHealthContent"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminSystemPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          System Health
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor service status and system metrics
        </p>
      </div>

      <Suspense fallback={<SystemSkeleton />}>
        <SystemHealthContent />
      </Suspense>
    </div>
  )
}

function SystemSkeleton() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl border border-border bg-card">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-6 rounded-xl border border-border bg-card">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
