import { Suspense } from "react"
import { AnalyticsContent } from "@/components/admin/AnalyticsContent"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Detailed platform metrics and trends
        </p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 rounded-xl border border-border bg-card">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
