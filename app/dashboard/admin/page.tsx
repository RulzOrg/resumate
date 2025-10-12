import { requireAdmin } from "@/lib/admin-utils"
import { getAdminStats, getAllUsersAdmin } from "@/lib/db"
import { StatsCard } from "@/components/admin/stats-card"
import { UsersTable } from "@/components/admin/users-table"
import { Users, UserCheck, DollarSign, FileText, Briefcase, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminDashboardPage() {
  await requireAdmin()

  const stats = await getAdminStats()
  const recentUsers = await getAllUsersAdmin({ page: 1, limit: 10, sortBy: "created_at", sortOrder: "desc" })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">Admin Portal</h1>
            <p className="text-muted-foreground mt-1 text-sm font-geist">Manage users and monitor platform activity</p>
          </div>
          <Link href="/dashboard/admin/users">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-black">
              View All Users
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description={`${stats.usersCreatedToday} joined today`}
          />
          <StatsCard
            title="Active Users"
            value={stats.activeUsers}
            icon={UserCheck}
            description="Completed onboarding"
          />
          <StatsCard
            title="Pro Users"
            value={stats.proUsers}
            icon={DollarSign}
            description={`${stats.enterpriseUsers} enterprise`}
          />
          <StatsCard
            title="Total Resumes"
            value={stats.totalResumes}
            icon={FileText}
            description={`${stats.totalJobAnalyses} job analyses`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-medium text-foreground font-geist">Growth (30 days)</h3>
            </div>
            <p className="text-2xl font-bold text-foreground font-geist">{stats.usersCreatedThisMonth}</p>
            <p className="text-sm text-muted-foreground mt-1 font-geist">New users this month</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-medium text-foreground font-geist">Growth (7 days)</h3>
            </div>
            <p className="text-2xl font-bold text-foreground font-geist">{stats.usersCreatedThisWeek}</p>
            <p className="text-sm text-muted-foreground mt-1 font-geist">New users this week</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-purple-500" />
              <h3 className="text-base font-medium text-foreground font-geist">Subscription Split</h3>
            </div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-geist">Free:</span>
                <span className="text-foreground font-geist">{stats.freeUsers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-geist">Pro:</span>
                <span className="text-foreground font-geist">{stats.proUsers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-geist">Enterprise:</span>
                <span className="text-foreground font-geist">{stats.enterpriseUsers}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground font-space-grotesk">Recent Users</h2>
            <Link href="/dashboard/admin/users">
              <Button variant="ghost" className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-500/10">
                View All →
              </Button>
            </Link>
          </div>
          <UsersTable users={recentUsers.users} />
        </div>
      </div>
    </div>
  )
}
