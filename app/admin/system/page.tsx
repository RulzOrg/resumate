import { SystemHealthContent } from "@/components/admin/SystemHealthContent"

export default function AdminSystemPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          System Health
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor service status and system metrics
        </p>
      </div>

      <SystemHealthContent />
    </div>
  )
}
