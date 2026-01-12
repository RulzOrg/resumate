import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <main className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Optimize Section */}
            <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
              <Skeleton className="h-7 w-40 mb-6" />
              <div className="space-y-4">
                {/* Select Resume */}
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                {/* Job Title & Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                {/* Job Description */}
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-36 w-full" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
                {/* Submit Button */}
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            {/* Optimized Resumes Section */}
            <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
              <Skeleton className="h-7 w-48 mb-6" />
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 py-4 ${i > 1 ? "border-t border-gray-300 dark:border-white/10" : ""}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-5 w-64 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                      <div className="text-center mr-2">
                        <Skeleton className="h-5 w-12 mb-1" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-9 w-9 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8 mt-8 lg:mt-0">
            {/* Account Status Card */}
            <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>

            {/* Master Resumes Section */}
            <div className="rounded-2xl border border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted dark:bg-white/5">
                    <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
