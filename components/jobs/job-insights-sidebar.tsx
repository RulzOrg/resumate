import { ListChecks, Percent, Lightbulb, Plus } from "lucide-react"
import Link from "next/link"

interface JobInsightsSidebarProps {
  topKeywords: Array<{ keyword: string; frequency: number }>
  avgMatch: number
}

export async function JobInsightsSidebar({ topKeywords, avgMatch }: JobInsightsSidebarProps) {
  const displayedKeywords = topKeywords.slice(0, 3)
  const hasKeywords = displayedKeywords.length > 0
  const hasMatchData = avgMatch > 0
  const avgMatchDescription = hasMatchData
    ? "Average match across your generated CVs."
    : "Generate a tailored CV to see match insights."
  const avgMatchValue = hasMatchData ? `${avgMatch}%` : "—"

  const suggestionMessage = (() => {
    if (!hasMatchData) {
      return "Run an analysis and generate a CV to unlock targeted suggestions."
    }
    if (avgMatch >= 80) {
      return "Strong matches so far—keep iterating for new roles.";
    }
    if (avgMatch >= 50) {
      return "Add missing keywords from recent job descriptions to lift scores.";
    }
    return "Regenerate your CV with more tailored achievements to raise match scores.";
  })()
  
  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-lg font-medium tracking-tight font-geist">Job insights</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <ListChecks className="w-[18px] h-[18px] text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist">Top keywords</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">
              {hasKeywords
                ? "Frameworks, tooling, and domain terms extracted."
                : "Keywords will appear after you analyze a job."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hasKeywords ? (
                displayedKeywords.map((item) => (
                  <span
                    key={item.keyword}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
                  >
                    {item.keyword}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
                  No keywords yet
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <Percent className="w-[18px] h-[18px] text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist">Average match</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">{avgMatchDescription}</p>
          </div>
          <span className="text-xs text-emerald-200 font-medium">{avgMatchValue}</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <Lightbulb className="w-[18px] h-[18px] text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist">Suggestions</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">{suggestionMessage}</p>
          </div>
          <span className="text-xs text-white/80 font-medium">Action</span>
        </div>

        <Link 
          href="/dashboard/jobs/add"
          className="inline-flex hover:bg-emerald-400 transition text-sm font-medium text-black bg-emerald-500 w-full rounded-full pt-2 pr-3 pb-2 pl-3 gap-x-2 gap-y-2 items-center justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Job Description
        </Link>
      </div>
    </div>
  )
}
