"use client"

import { BarChart3, ShieldCheck, Clock } from 'lucide-react'
import type { Resume } from '@/lib/db'
import {
  formatRelativeTime,
  getActivityAction,
  calculateATSScore,
  extractSkills,
  getWordCount
} from '@/lib/master-resume-utils'

interface InsightsSidebarProps {
  resumes: Resume[]
  activities: Resume[]
}

export function InsightsSidebar({ resumes, activities }: InsightsSidebarProps) {
  // Calculate average ATS score
  const atsScores = resumes.map(r => {
    const skills = extractSkills(r.content_text, r.parsed_sections)
    return calculateATSScore(r.content_text, skills)
  })
  const avgATS = atsScores.length > 0
    ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length)
    : 0

  // Mock view data (would come from analytics in production)
  const viewData = resumes.slice(0, 3).map(r => ({
    name: r.title.split('—')[0].trim(),
    views: Math.floor(Math.random() * 100) + 50 // Mock data
  }))

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      {/* Header */}
      <div className="px-3 sm:px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5" />
          <h3 className="text-base font-medium tracking-tight font-geist">Insights</h3>
        </div>
        <span className="text-[11px] text-white/50 font-geist">Last 30 days</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Views Chart */}
        <div>
          <h4 className="text-sm font-medium font-geist">Views by resume</h4>
          <p className="text-[12px] text-white/60 font-geist">A quick look at recent engagement.</p>
          
          <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
            {/* Simple bar chart placeholder */}
            <div className="space-y-3">
              {viewData.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-white/60 font-geist">{item.name}</span>
                    <span className="text-[11px] text-white/80 font-geist">{item.views}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min((item.views / 150) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {viewData.map((item, index) => (
                <div key={index} className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="text-[11px] text-white/60 font-geist truncate">{item.name}</p>
                  <p className="text-sm font-medium font-geist">{item.views}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ATS Health */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-medium text-white/90 font-geist">ATS Health</span>
            </div>
            <span className="text-sm text-emerald-300 font-geist">Avg {avgATS}</span>
          </div>
          <p className="mt-2 text-[12px] text-white/60 font-geist">
            {avgATS >= 85
              ? 'Excellent! Your resumes meet ATS guidelines.'
              : avgATS >= 70
              ? 'Your resumes meet most guidelines. Improve keywords and reduce passive voice for higher scores.'
              : 'Consider adding more keywords and action verbs to improve ATS compatibility.'}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 text-[11px] rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 font-geist">
              Keywords
            </span>
            <span className="px-2 py-1 text-[11px] rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-200 font-geist">
              Action verbs
            </span>
            <span className="px-2 py-1 text-[11px] rounded-full border border-sky-400/30 bg-sky-400/10 text-sky-200 font-geist">
              Formatting
            </span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/70" />
              <span className="text-sm font-medium text-white/90 font-geist">Recent activity</span>
            </div>
            {/* <a href="#" className="text-[12px] text-white/60 hover:text-white font-geist">View all</a> */}
          </div>
          <div className="mt-2 space-y-2">
            {activities.length > 0 ? (
              activities.slice(0, 5).map((activity) => {
                const isNew = new Date(activity.created_at).getTime() > new Date(activity.updated_at).getTime() - 60000
                const action = getActivityAction(activity.kind, isNew)
                
                return (
                  <div key={activity.id} className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 font-geist truncate flex-1">
                      {action} "{activity.title}"
                    </span>
                    <span className="text-[11px] text-white/40 font-geist ml-2 flex-shrink-0">
                      {formatRelativeTime(activity.updated_at)}
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-[12px] text-white/60 font-geist">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
