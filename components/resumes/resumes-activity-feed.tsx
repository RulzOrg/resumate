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
    return null
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-lg font-medium tracking-tight font-geist">Activity</h2>
      </div>
      <div className="divide-y divide-white/10">
        {activities.map((activity) => {
          const isEdit = activity.activity_type === "resume_edited"
          const Icon = isEdit ? PencilLine : FileDown
          
          return (
            <div key={activity.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-geist">
                    {isEdit ? "Edited" : "Generated"} resume "{activity.job_title}"
                  </p>
                  <p className="text-xs text-white/60 font-geist">
                    {activity.company_name && `${activity.company_name} • `}
                    {activity.match_score && `${activity.match_score}% match`}
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/50 font-geist">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
