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
  if (activities.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">Activity</h2>
        </div>
        <div className="px-4 py-10 text-center text-sm text-muted-foreground font-geist">
          Activity from job analyses and generated CVs will appear here once you get started.
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">Activity</h2>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => {
          const Icon = activity.activity_type === "job_added" ? FileSearch : FilePlus
          const description =
            activity.activity_type === "job_added"
              ? `Extracted keywords for "${activity.job_title}"`
              : `Generated CV for "${activity.job_title}"`
          const detail = activity.activity_type === "job_added"
            ? activity.keywords.slice(0, 3).join(", ") || "No keywords captured yet"
            : activity.match_score == null
              ? "Match N/A • adjusted achievements"
              : `Match ${activity.match_score}% • adjusted achievements`

          return (
            <div key={activity.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full border border-border bg-secondary flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-geist text-foreground">{description}</p>
                  <p className="text-xs text-muted-foreground font-geist">{detail}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-geist">
                {formatRelativeTime(activity.created_at)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
