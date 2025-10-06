"use client"

import { TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

interface MatchTrendsChartProps {
  data: Array<{
    date: string
    avgScore: number
    jobCount: number
  }>
}

export function MatchTrendsChart({ data }: MatchTrendsChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white font-geist">Match Score Trends</h3>
        </div>
        <div className="text-center py-12 text-white/60 text-sm font-geist">
          No data available yet. Add jobs to see trends.
        </div>
      </div>
    )
  }

  const maxScore = Math.max(...data.map(d => d.avgScore), 100)
  const sortedData = [...data].reverse() // Show oldest to newest

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white font-geist">Match Score Trends</h3>
        <span className="text-xs text-white/60 font-geist ml-auto">Last 30 days</span>
      </div>

      {/* Simple bar chart */}
      <div className="space-y-3">
        {sortedData.map((item, index) => {
          const percentage = (item.avgScore / maxScore) * 100
          const date = format(new Date(item.date), 'MMM d')

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80 font-geist">{date}</span>
                <span className="text-emerald-400 font-geist font-medium">
                  {item.avgScore.toFixed(1)}%
                </span>
              </div>
              <div className="h-8 bg-white/5 rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/80 rounded-lg transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs text-white/80 font-geist">
                  {item.jobCount} job{item.jobCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
