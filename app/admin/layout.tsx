import { requireAdminAuth } from "@/lib/admin-auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdminAuth()

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader admin={admin} />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
