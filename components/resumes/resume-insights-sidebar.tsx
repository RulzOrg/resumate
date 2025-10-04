import { ListChecks, Percent, Lightbulb, Plus } from "lucide-react"
import { extractRoleName } from "@/lib/resume-utils"

interface ResumeInsightsSidebarProps {
  topRoles: Array<{ role: string; count: number }>
  avgScore: number
}

export function ResumeInsightsSidebar({ topRoles, avgScore }: ResumeInsightsSidebarProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-lg font-medium tracking-tight font-geist">Resume insights</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <ListChecks className="w-[18px] h-[18px] text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist">Top roles</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">
              Most generated resumes target these roles.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topRoles.length > 0 ? (
                topRoles.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
                  >
                    {extractRoleName(item.role)}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80">
                  No roles yet
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
            <p className="text-sm font-medium font-geist">Average score</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">
              Most resumes score between 75–90% after edits.
            </p>
          </div>
          <span className="text-xs text-emerald-200 font-medium">{avgScore}%</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <Lightbulb className="w-[18px] h-[18px] text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist">Suggestions</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">
              Tweak top sections and add missing tools to lift lower scores.
            </p>
          </div>
          <span className="text-xs text-white/80 font-medium">Action</span>
        </div>

        <button className="inline-flex hover:bg-emerald-400 transition text-sm font-medium text-black bg-emerald-500 w-full rounded-full pt-2 pr-3 pb-2 pl-3 gap-x-2 gap-y-2 items-center justify-center">
          <Plus className="w-4 h-4" />
          New Resume
        </button>
      </div>
    </div>
  )
}
