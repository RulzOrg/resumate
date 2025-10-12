import { WandSparkles, FileCheck2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Activity {
  id: string
  title: string
  job_title: string
  company_name: string | null
  match_score: number | null
  created_at: string
  activity_type: string
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">Activity</h2>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => {
          const isAutoMatch = activity.match_score && activity.match_score > 85
          const Icon = isAutoMatch ? WandSparkles : FileCheck2
          
          return (
            <div key={activity.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full border border-border bg-muted flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-geist text-foreground">
                    {isAutoMatch
                      ? `Auto-matched "${activity.title}" to ${activity.company_name || activity.job_title} posting`
                      : `Resume audit completed`}
                  </p>
                  <p className="text-xs text-muted-foreground font-geist">
                    {isAutoMatch
                      ? `Match ${activity.match_score}% • optimized for ${activity.job_title}`
                      : `Tailored "${activity.title}" with keyword updates`}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-geist">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
