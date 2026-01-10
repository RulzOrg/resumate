"use client"

import { useEffect, useState } from "react"
import {
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PendingSubscription {
  id: string
  polarSubscriptionId: string
  polarCustomerId: string
  customerEmail: string
  customerName: string | null
  planType: string
  status: string
  amount: number
  currency: string
  createdAt: string
  linkedUser: {
    id: string
    email: string
    name: string
  } | null
}

interface ActiveSubscription {
  id: string
  email: string
  name: string
  subscriptionStatus: string
  subscriptionPlan: string
  subscriptionPeriodEnd: string | null
  polarCustomerId: string | null
  polarSubscriptionId: string | null
  createdAt: string
}

interface SubscriptionStats {
  byStatus: Record<string, number>
  unlinked: number
}

export function SubscriptionsContent() {
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/subscriptions")
      if (!response.ok) throw new Error("Failed to fetch subscriptions")

      const data = await response.json()
      setPendingSubscriptions(data.pendingSubscriptions)
      setActiveSubscriptions(data.activeSubscriptions)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
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
        <Button onClick={fetchSubscriptions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const totalActive = activeSubscriptions.filter(s => s.subscriptionStatus === "active").length
  const totalTrialing = activeSubscriptions.filter(s => s.subscriptionStatus === "trialing").length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Pro</p>
                <p className="text-3xl font-bold mt-1">{totalActive}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trialing</p>
                <p className="text-3xl font-bold mt-1">{totalTrialing}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Links</p>
                <p className="text-3xl font-bold mt-1">{stats?.unlinked || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <LinkIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-3xl font-bold mt-1">
                  ${(totalActive * 19).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Subscriptions</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Links
            {(stats?.unlinked || 0) > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {stats?.unlinked}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>
                Users with active Pro subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSubscriptions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No active subscriptions
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Renews</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Subscribed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSubscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium text-sm">{sub.name}</p>
                              <p className="text-xs text-muted-foreground">{sub.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={sub.subscriptionStatus} />
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm capitalize">{sub.subscriptionPlan}</span>
                          </td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {sub.subscriptionPeriodEnd
                              ? new Date(sub.subscriptionPeriodEnd).toLocaleDateString()
                              : "-"
                            }
                          </td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Subscription Links</CardTitle>
              <CardDescription>
                Subscriptions that need to be linked to user accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSubscriptions.filter(s => !s.linkedUser).length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    All subscriptions are linked
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Customer</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Created</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Linked To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSubscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium text-sm">{sub.customerName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{sub.customerEmail}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm capitalize">{sub.planType}</span>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            ${(sub.amount / 100).toFixed(2)} {sub.currency}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                              {sub.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2">
                            {sub.linkedUser ? (
                              <div className="text-sm">
                                <p className="font-medium">{sub.linkedUser.name}</p>
                                <p className="text-xs text-muted-foreground">{sub.linkedUser.email}</p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-600">
                                Not linked
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchSubscriptions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>
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
