import { SubscriptionsContent } from "@/components/admin/SubscriptionsContent"

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-space-grotesk tracking-tight">
          Subscription Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor active subscriptions and manage pending links
        </p>
      </div>

      <SubscriptionsContent />
    </div>
  )
}
