import { AnalyticsContent } from "@/components/admin/AnalyticsContent"

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Detailed platform metrics and trends
        </p>
      </div>

      <AnalyticsContent />
    </div>
  )
}
