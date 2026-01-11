import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor your platform metrics and recent activity
        </p>
      </div>

      <AdminDashboardContent />
    </div>
  )
}
