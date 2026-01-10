"use client"

import { useEffect, useState } from "react"
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Briefcase,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DailyData {
  date: string
  count: number
}

interface AnalyticsData {
  period: number
  signups: DailyData[]
  resumes: DailyData[]
  optimizations: DailyData[]
  jobAnalyses: DailyData[]
  subscriptions: {
    byPlan: Array<{ plan: string; count: number }>
    byStatus: Array<{ status: string; count: number }>
  }
  topUsers: Array<{
    id: string
    email: string
    name: string
    plan: string
    resumes: number
    jobAnalyses: number
  }>
  leadMagnets: Array<{
    date: string
    total: number
    converted: number
  }>
}

export function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState("30")

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/analytics?period=${period}`)
      if (!response.ok) throw new Error("Failed to fetch analytics")

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  // Calculate totals
  const totalSignups = data.signups.reduce((sum, d) => sum + d.count, 0)
  const totalResumes = data.resumes.reduce((sum, d) => sum + d.count, 0)
  const totalOptimizations = data.optimizations.reduce((sum, d) => sum + d.count, 0)
  const totalJobAnalyses = data.jobAnalyses.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="New Signups"
          value={totalSignups}
          icon={Users}
          description={`Last ${period} days`}
        />
        <SummaryCard
          title="Resumes Uploaded"
          value={totalResumes}
          icon={FileText}
          description={`Last ${period} days`}
        />
        <SummaryCard
          title="Optimizations"
          value={totalOptimizations}
          icon={TrendingUp}
          description={`Last ${period} days`}
        />
        <SummaryCard
          title="Job Analyses"
          value={totalJobAnalyses}
          icon={Briefcase}
          description={`Last ${period} days`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Signups
            </CardTitle>
            <CardDescription>Daily new user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartSimple data={data.signups} color="bg-blue-500" />
          </CardContent>
        </Card>

        {/* Resume Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resume Activity
            </CardTitle>
            <CardDescription>Daily uploads and optimizations</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartSimple data={data.optimizations} color="bg-emerald-500" />
          </CardContent>
        </Card>

        {/* Subscription Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Subscription Distribution
            </CardTitle>
            <CardDescription>Current user distribution by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.subscriptions.byPlan.map((item) => (
                <div key={item.plan} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{item.plan}</span>
                    <span className="text-muted-foreground">{item.count} users</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.plan === "pro" ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{
                        width: `${Math.min(100, (item.count / Math.max(...data.subscriptions.byPlan.map(p => p.count))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">By Status</h4>
              <div className="grid grid-cols-2 gap-2">
                {data.subscriptions.byStatus.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm capitalize">{item.status.replace("_", " ")}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Magnet Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Lead Magnet Performance
            </CardTitle>
            <CardDescription>Submissions and conversions over time</CardDescription>
          </CardHeader>
          <CardContent>
            {data.leadMagnets.length > 0 ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Submissions</p>
                    <p className="text-2xl font-bold">
                      {data.leadMagnets.reduce((sum, d) => sum + d.total, 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Conversions</p>
                    <p className="text-2xl font-bold">
                      {data.leadMagnets.reduce((sum, d) => sum + d.converted, 0)}
                    </p>
                  </div>
                </div>

                {/* Daily breakdown */}
                <div className="space-y-2">
                  {data.leadMagnets.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <div className="flex items-center gap-4">
                        <span>{day.total} submissions</span>
                        <span className="text-emerald-600">{day.converted} converted</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No lead magnet data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Activity</CardTitle>
          <CardDescription>Most active users on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Plan</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Resumes</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Job Analyses</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Total Activity</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user, index) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.plan === "pro"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm">{user.resumes}</td>
                    <td className="py-3 px-2 text-sm">{user.jobAnalyses}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-24">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(100, ((user.resumes + user.jobAnalyses) / (data.topUsers[0].resumes + data.topUsers[0].jobAnalyses)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{user.resumes + user.jobAnalyses}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: number
  icon: React.ElementType
  description: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="p-3 rounded-full bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BarChartSimple({ data, color }: { data: DailyData[]; color: string }) {
  if (data.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground">No data available</p>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="h-48">
      <div className="flex items-end justify-between h-full gap-1">
        {data.slice(-14).map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              className={`w-full ${color} rounded-t transition-all hover:opacity-80`}
              style={{ height: `${Math.max(4, (item.count / maxValue) * 100)}%` }}
              title={`${item.date}: ${item.count}`}
            />
            {data.length <= 14 && (
              <span className="text-[10px] text-muted-foreground mt-1 rotate-45 origin-left">
                {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        ))}
      </div>
      {data.length > 14 && (
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{new Date(data[data.length - 14]?.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span>{new Date(data[data.length - 1]?.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      )}
    </div>
  )
}
