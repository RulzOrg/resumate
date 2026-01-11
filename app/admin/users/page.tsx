import { UsersContent } from "@/components/admin/UsersContent"

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">
          View, search, and manage all platform users
        </p>
      </div>

      <UsersContent />
    </div>
  )
}
