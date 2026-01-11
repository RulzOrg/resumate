"use client"

import { useEffect, useState } from "react"
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface DashboardStats {
  users: {
    total: number
    newThisMonth: number
    newLastMonth: number
    growthRate: number
    activeThisWeek: number
  }
  subscriptions: {
    pro: number
    free: number
    trialing: number
    canceled: number
    pending: number
  }
  resumes: {
    total: number
    optimizations: number
    byStatus: {
      pending: number
      processing: number
      completed: number
      failed: number
    }
  }
  leadMagnets: {
    total: number
    converted: number
    conversionRate: number
  }
  recentSignups: Array<{
    id: string
    email: string
    name: string
    subscriptionStatus: string
    subscriptionPlan: string
    createdAt: string
  }>
}

export function AdminDashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchStats = async () => {
    if (hasFetched) return
    setHasFetched(true)

    try {
      setLoading(true)
      setError(null)
      console.log("[AdminDashboard] Fetching stats...")
      const response = await fetch("/api/admin/stats", {
        cache: "no-store",
      })
      console.log("[AdminDashboard] Response status:", response.status)
      console.log("[AdminDashboard] Response headers:", response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[AdminDashboard] Error response:", errorText)
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }

      const data = await response.json()
      console.log("[AdminDashboard] Stats data received:", data)
      console.log("[AdminDashboard] Stats loaded successfully")
      setStats(data)
    } catch (err) {
      console.error("[AdminDashboard] Fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load stats")
    } finally {
      console.log("[AdminDashboard] Setting loading to false")
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        <Button onClick={fetchStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.users.total}
          subtitle={`+${stats.users.newThisMonth} this month`}
          trend={stats.users.growthRate}
          icon={Users}
        />
        <StatCard
          title="Pro Subscribers"
          value={stats.subscriptions.pro}
          subtitle={`${stats.subscriptions.trialing} trialing`}
          icon={CreditCard}
          variant="success"
        />
        <StatCard
          title="Total Resumes"
          value={stats.resumes.total}
          subtitle={`${stats.resumes.optimizations} optimized`}
          icon={FileText}
        />
        <StatCard
          title="Lead Conversion"
          value={`${stats.leadMagnets.conversionRate}%`}
          subtitle={`${stats.leadMagnets.converted}/${stats.leadMagnets.total} converted`}
          icon={TrendingUp}
        />
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription Status</CardTitle>
            <CardDescription>Current subscription distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SubscriptionBar
              label="Pro (Active)"
              value={stats.subscriptions.pro}
              total={stats.users.total}
              color="bg-emerald-500"
            />
            <SubscriptionBar
              label="Free"
              value={stats.subscriptions.free}
              total={stats.users.total}
              color="bg-blue-500"
            />
            <SubscriptionBar
              label="Trialing"
              value={stats.subscriptions.trialing}
              total={stats.users.total}
              color="bg-amber-500"
            />
            <SubscriptionBar
              label="Canceled"
              value={stats.subscriptions.canceled}
              total={stats.users.total}
              color="bg-red-500"
            />
            {stats.subscriptions.pending > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending Links</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    {stats.subscriptions.pending}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resume Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resume Processing</CardTitle>
            <CardDescription>Current processing queue status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow
              label="Completed"
              value={stats.resumes.byStatus.completed}
              icon={CheckCircle}
              color="text-emerald-500"
            />
            <StatusRow
              label="Processing"
              value={stats.resumes.byStatus.processing}
              icon={Loader2}
              color="text-blue-500"
              animate
            />
            <StatusRow
              label="Pending"
              value={stats.resumes.byStatus.pending}
              icon={Clock}
              color="text-amber-500"
            />
            <StatusRow
              label="Failed"
              value={stats.resumes.byStatus.failed}
              icon={AlertCircle}
              color="text-red-500"
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Overview</CardTitle>
            <CardDescription>Platform activity summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Active this week</span>
              <span className="font-semibold">{stats.users.activeThisWeek}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Total optimizations</span>
              <span className="font-semibold">{stats.resumes.optimizations}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">New users (month)</span>
              <span className="font-semibold">{stats.users.newThisMonth}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Growth rate</span>
              <span className={`font-semibold ${stats.users.growthRate >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {stats.users.growthRate >= 0 ? "+" : ""}{stats.users.growthRate}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Signups</CardTitle>
            <CardDescription>New users in the last 7 days</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/users">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Plan</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={user.subscriptionStatus} />
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm capitalize">{user.subscriptionPlan}</span>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
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

interface StatCardProps {
  title: string
  value: number | string
  subtitle: string
  trend?: number
  icon: React.ElementType
  variant?: "default" | "success" | "warning" | "danger"
}

function StatCard({ title, value, subtitle, trend, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${
            variant === "success" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"
          }`}>
            <Icon className={`h-6 w-6 ${
              variant === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            }`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-3">
            {trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {trend >= 0 ? "+" : ""}{trend}%
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SubscriptionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function StatusRow({
  label,
  value,
  icon: Icon,
  color,
  animate,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  animate?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color} ${animate ? "animate-spin" : ""}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    canceled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[status] || variants.free}`}>
      {status.replace("_", " ")}
    </span>
  )
}
