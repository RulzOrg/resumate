"use client"

import { useEffect, useState } from 'react'
import { TrendingUp, FileText, Briefcase, Target, Activity, Star } from 'lucide-react'
import { MatchTrendsChart } from './match-trends-chart'
import { KeywordAnalysis } from './keyword-analysis'
import { ScoreDistribution } from './score-distribution'
import { RecentActivity } from './recent-activity'

interface AnalyticsData {
  matchTrends: Array<{
    date: string
    avgScore: number
    jobCount: number
  }>
  keywordFrequency: Array<{
    keyword: string
    frequency: number
  }>
  bestResumes: Array<{
    id: string
    title: string
    fileName: string
    optimizationCount: number
    avgMatchScore: number
  }>
  stats: {
    totalResumes: number
    totalJobs: number
    totalOptimizations: number
    avgMatchScore: number
  } | null
  recentActivity: Array<{
    type: string
    title: string
    subtitle: string
    score: number
    createdAt: string
  }>
  scoreDistribution: Array<{
    range: string
    count: number
  }>
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics')
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const analytics = await response.json()
      setData(analytics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60 font-geist">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-400 font-geist">{error}</div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const stats = data.stats || {
    totalResumes: 0,
    totalJobs: 0,
    totalOptimizations: 0,
    avgMatchScore: 0
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FileText}
          label="Total Resumes"
          value={stats.totalResumes}
          color="blue"
        />
        <StatCard
          icon={Briefcase}
          label="Jobs Analyzed"
          value={stats.totalJobs}
          color="emerald"
        />
        <StatCard
          icon={Target}
          label="Optimizations"
          value={stats.totalOptimizations}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Match Score"
          value={`${stats.avgMatchScore.toFixed(1)}%`}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <MatchTrendsChart data={data.matchTrends} />
        <ScoreDistribution data={data.scoreDistribution} />
      </div>

      {/* Keyword Analysis & Best Resumes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <KeywordAnalysis data={data.keywordFrequency} />
        <BestResumesCard resumes={data.bestResumes} />
      </div>

      {/* Recent Activity */}
      <RecentActivity activities={data.recentActivity} />
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  color: 'blue' | 'emerald' | 'purple' | 'amber'
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
    amber: 'bg-amber-500/10 text-amber-400'
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 sm:p-3 ${colorClasses[color]}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div className="text-xs sm:text-sm text-white/60 font-geist">{label}</div>
          <div className="text-xl sm:text-2xl font-bold text-white font-geist mt-1">{value}</div>
        </div>
      </div>
    </div>
  )
}

interface BestResumesCardProps {
  resumes: AnalyticsData['bestResumes']
}

function BestResumesCard({ resumes }: BestResumesCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white font-geist">Best Performing Resumes</h3>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-8 text-white/60 text-sm font-geist">
          No optimized resumes yet
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume, index) => (
            <div
              key={resume.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-medium text-white font-geist">{resume.title}</div>
                  <div className="text-xs text-white/60 font-geist">
                    {resume.optimizationCount} optimization{resume.optimizationCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400 font-geist">
                  {resume.avgMatchScore.toFixed(1)}%
                </div>
                <div className="text-xs text-white/60 font-geist">avg score</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
