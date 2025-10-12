import { PencilLine, FileDown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Activity {
  id: string
  activity_type: string
  title: string
  job_title: string
  company_name: string | null
  created_at: string
  match_score: number | null
}

interface ResumesActivityFeedProps {
  activities: Activity[]
}

export function ResumesActivityFeed({ activities }: ResumesActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-lg font-medium tracking-tight font-geist text-foreground">Activity</h2>
        </div>
        <div className="px-4 py-10 text-center text-sm text-muted-foreground font-geist">
          Generate or edit a resume to see a timeline of activity here.
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
          const isEdit = activity.activity_type === "resume_edited"
          const Icon = isEdit ? PencilLine : FileDown
          
          return (
            <div key={activity.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <Icon className="w-[18px] h-[18px] text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-geist text-foreground">
                    {isEdit ? "Edited" : "Generated"} resume "{activity.job_title}"
                  </p>
                  <p className="text-xs text-muted-foreground font-geist">
                    {activity.company_name && `${activity.company_name} • `}
                    {activity.match_score !== null ? `${activity.match_score}% match` : "Match score pending"}
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
