import { FileSearch, FilePlus } from "lucide-react"
import { formatRelativeTime } from "@/lib/jobs-utils"

interface Activity {
  id: string
  activity_type: string
  job_title: string
  company_name: string | null
  keywords: string[]
  created_at: string
  match_score: number | null
}

interface JobsActivityFeedProps {
  activities: Activity[]
}

export function JobsActivityFeed({ activities }: JobsActivityFeedProps) {
  if (activities.length === 0) return null

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-lg font-medium tracking-tight font-geist">Activity</h2>
      </div>
      <div className="divide-y divide-white/10">
        {activities.map((activity) => {
          const Icon = activity.activity_type === "job_added" ? FileSearch : FilePlus
          const description =
            activity.activity_type === "job_added"
              ? `Extracted keywords for "${activity.job_title}"`
              : `Generated CV for "${activity.job_title}"`
          const detail =
            activity.activity_type === "job_added"
              ? activity.keywords.slice(0, 3).join(", ")
              : `Match ${activity.match_score}% • adjusted achievements`

          return (
            <div key={activity.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-geist">{description}</p>
                  <p className="text-xs text-white/60 font-geist">{detail}</p>
                </div>
              </div>
              <span className="text-xs text-white/50 font-geist">
                {formatRelativeTime(activity.created_at)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
