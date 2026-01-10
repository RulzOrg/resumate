import { Suspense } from "react"
import { SubscriptionsContent } from "@/components/admin/SubscriptionsContent"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          Subscription Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor active subscriptions and manage pending links
        </p>
      </div>

      <Suspense fallback={<SubscriptionsSkeleton />}>
        <SubscriptionsContent />
      </Suspense>
    </div>
  )
}

function SubscriptionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 rounded-xl border border-border bg-card">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="py-3 border-b border-border last:border-0">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
