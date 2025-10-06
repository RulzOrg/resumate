"use client"

import { Hash } from 'lucide-react'

interface KeywordAnalysisProps {
  data: Array<{
    keyword: string
    frequency: number
  }>
}

export function KeywordAnalysis({ data }: KeywordAnalysisProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white font-geist">Top Keywords</h3>
        </div>
        <div className="text-center py-12 text-white/60 text-sm font-geist">
          No keywords extracted yet
        </div>
      </div>
    )
  }

  const maxFreq = Math.max(...data.map(d => d.frequency))

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Hash className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white font-geist">Top Keywords</h3>
        <span className="text-xs text-white/60 font-geist ml-auto">Most common in job posts</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.map((item, index) => {
          const size = 0.7 + (item.frequency / maxFreq) * 0.6 // Scale from 0.7 to 1.3
          const opacity = 0.6 + (item.frequency / maxFreq) * 0.4 // Scale from 0.6 to 1.0

          return (
            <div
              key={index}
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 transition-all hover:border-blue-400/50 hover:bg-blue-500/20"
              style={{
                fontSize: `${size}rem`,
                opacity
              }}
            >
              <span className="text-blue-400 font-geist font-medium">{item.keyword}</span>
              <span className="text-xs text-blue-400/60 font-geist">×{item.frequency}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
