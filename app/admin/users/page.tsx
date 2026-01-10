import { Suspense } from "react"
import { UsersContent } from "@/components/admin/UsersContent"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">
          View, search, and manage all platform users
        </p>
      </div>

      <Suspense fallback={<UsersSkeleton />}>
        <UsersContent />
      </Suspense>
    </div>
  )
}

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="p-4 border-b border-border last:border-0 flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
