import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function OptimizedResumeLoading() {
  return (
    <main className="py-5 sm:py-6">
      <div className="px-6">
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-5 w-48 mb-3" />
          <Skeleton className="h-8 w-56 mb-1" />
          <Skeleton className="h-5 w-72" />
        </div>

        {/* Resume Viewer Card */}
        <Card className="border-border bg-card overflow-hidden">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-border">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] h-[calc(100vh-280px)] min-h-[800px]">
              {/* Left Panel - Sections List Skeleton */}
              <div className="relative border-r-0 md:border-r border-border bg-muted/20 overflow-hidden">
                <div className="p-4 space-y-1">
                  {/* Section items */}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                      <Skeleton className="h-4 w-4 rounded-sm flex-shrink-0" />
                      <Skeleton className="h-4 w-4 rounded-sm flex-shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-8 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel - Resume Preview Skeleton */}
              <div className="relative bg-muted overflow-hidden">
                <div className="p-4 md:p-6 lg:p-8">
                  <div className="bg-white rounded-lg shadow-xl p-8 md:p-10 min-h-[900px] space-y-6">
                    {/* Header */}
                    <div className="border-b-2 border-primary/20 pb-4">
                      <Skeleton className="h-8 w-48 mb-2 bg-slate-200" />
                      <Skeleton className="h-4 w-80 bg-slate-200" />
                    </div>

                    {/* Summary Section */}
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full bg-slate-200" />
                      <Skeleton className="h-4 w-11/12 bg-slate-200" />
                      <Skeleton className="h-4 w-3/4 bg-slate-200" />
                    </div>

                    {/* Work Experience Section */}
                    <div className="space-y-4">
                      <Skeleton className="h-3 w-32 bg-slate-200" />
                      <div className="border-t border-slate-200 pt-4 space-y-4">
                        {[1, 2].map((exp) => (
                          <div key={exp} className="space-y-2">
                            <div className="flex justify-between">
                              <Skeleton className="h-5 w-40 bg-slate-200" />
                              <Skeleton className="h-4 w-32 bg-slate-200" />
                            </div>
                            <Skeleton className="h-4 w-32 bg-slate-200" />
                            <div className="pl-3 space-y-1">
                              <Skeleton className="h-3 w-full bg-slate-200" />
                              <Skeleton className="h-3 w-11/12 bg-slate-200" />
                              <Skeleton className="h-3 w-10/12 bg-slate-200" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Education Section */}
                    <div className="space-y-3">
                      <Skeleton className="h-3 w-24 bg-slate-200" />
                      <div className="border-t border-slate-200 pt-3">
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-48 bg-slate-200" />
                          <Skeleton className="h-4 w-20 bg-slate-200" />
                        </div>
                        <Skeleton className="h-4 w-56 bg-slate-200 mt-1" />
                      </div>
                    </div>

                    {/* Skills Section */}
                    <div className="space-y-3">
                      <Skeleton className="h-3 w-16 bg-slate-200" />
                      <div className="border-t border-slate-200 pt-3">
                        <Skeleton className="h-4 w-full bg-slate-200" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
