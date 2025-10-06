"use client"

import { BarChart3 } from 'lucide-react'

interface ScoreDistributionProps {
  data: Array<{
    range: string
    count: number
  }>
}

export function ScoreDistribution({ data }: ScoreDistributionProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white font-geist">Score Distribution</h3>
        </div>
        <div className="text-center py-12 text-white/60 text-sm font-geist">
          No data available yet
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))
  const rangeOrder = ['0-20', '20-40', '40-60', '60-80', '80-100']
  const sortedData = rangeOrder
    .map(range => data.find(d => d.range === range))
    .filter(Boolean) as typeof data

  const getRangeColor = (range: string) => {
    switch (range) {
      case '0-20': return 'bg-red-500/80'
      case '20-40': return 'bg-orange-500/80'
      case '40-60': return 'bg-amber-500/80'
      case '60-80': return 'bg-lime-500/80'
      case '80-100': return 'bg-emerald-500/80'
      default: return 'bg-white/50'
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white font-geist">Score Distribution</h3>
        <span className="text-xs text-white/60 font-geist ml-auto">Match score ranges</span>
      </div>

      <div className="space-y-4">
        {sortedData.map((item, index) => {
          const percentage = (item.count / maxCount) * 100

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80 font-geist">{item.range}%</span>
                <span className="text-white/60 font-geist">
                  {item.count} job{item.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-6 bg-white/5 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${getRangeColor(item.range)} rounded-lg transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
