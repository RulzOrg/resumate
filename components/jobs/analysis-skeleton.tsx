export function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Match Score Skeleton */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-white/10 rounded"></div>
          <div className="h-6 w-16 bg-white/10 rounded"></div>
        </div>
        <div className="mt-2 h-3 w-full bg-white/10 rounded"></div>
      </div>

      {/* Keywords Skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-32 bg-white/10 rounded"></div>
          <div className="h-4 w-12 bg-white/10 rounded-full"></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-7 w-20 bg-white/10 rounded-full"></div>
          ))}
        </div>
      </div>

      {/* Skills Skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-40 bg-white/10 rounded"></div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-2 bg-white/10 rounded-full"></div>
              <div className="h-4 w-32 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions Skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-48 bg-white/10 rounded"></div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-2 bg-white/10 rounded-full"></div>
              <div className="h-4 w-40 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* ATS Checks Skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-28 bg-white/10 rounded"></div>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="h-4 w-40 bg-white/10 rounded"></div>
              <div className="mt-2 h-3 w-56 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
