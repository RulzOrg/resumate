"use client"

import { Activity, Briefcase, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RecentActivityProps {
  activities: Array<{
    type: string
    title: string
    subtitle: string
    score: number
    createdAt: string
  }>
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-white/60" />
          <h3 className="text-lg font-semibold text-white font-geist">Recent Activity</h3>
        </div>
        <div className="text-center py-12 text-white/60 text-sm font-geist">
          No recent activity
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-white/60" />
        <h3 className="text-lg font-semibold text-white font-geist">Recent Activity</h3>
        <span className="text-xs text-white/60 font-geist ml-auto">Last 10 actions</span>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const icon = activity.type === 'job_added' ? Briefcase : FileText
          const Icon = icon
          const iconBg = activity.type === 'job_added' 
            ? 'bg-blue-500/10 text-blue-400' 
            : 'bg-emerald-500/10 text-emerald-400'

          return (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <div className={`rounded-lg p-2 ${iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white font-geist truncate">
                  {activity.title}
                </div>
                <div className="text-xs text-white/60 font-geist truncate">
                  {activity.subtitle}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-emerald-400 font-geist">
                  {activity.score.toFixed(0)}%
                </div>
                <div className="text-xs text-white/60 font-geist whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
