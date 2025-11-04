"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, CreditCard, User, Bell, Shield, Zap } from "lucide-react"

interface SettingsClientProps {
  user: {
    id: string
    name: string
    email: string
    newsletterSubscribed: boolean
  }
  subscription: any
  usageLimits: any
}

export function SettingsClient({ user, subscription, usageLimits }: SettingsClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [newsletterEnabled, setNewsletterEnabled] = useState(user.newsletterSubscribed)

  const handleManageSubscription = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to open billing portal")
      }
    } catch (error: any) {
      console.error("Billing portal error:", error)
      toast.error(error.message || "Failed to open billing portal")
    } finally {
      setLoading(false)
    }
  }

  const handleNewsletterToggle = async (enabled: boolean) => {
    setNewsletterEnabled(enabled)

    try {
      const response = await fetch("/api/user/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to update newsletter preference")
      }

      toast.success(enabled
        ? "You've been subscribed to our newsletter!"
        : "You've been unsubscribed from our newsletter."
      )
    } catch (error) {
      console.error("Newsletter update error:", error)
      toast.error("Failed to update newsletter preference")
      // Revert the toggle on error
      setNewsletterEnabled(!enabled)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "trialing":
        return "bg-blue-500"
      case "past_due":
        return "bg-yellow-500"
      case "canceled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Tabs defaultValue="account" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="account">
          <User className="w-4 h-4 mr-2" />
          Account
        </TabsTrigger>
        <TabsTrigger value="subscription">
          <CreditCard className="w-4 h-4 mr-2" />
          Subscription
        </TabsTrigger>
        <TabsTrigger value="preferences">
          <Bell className="w-4 h-4 mr-2" />
          Preferences
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Name</Label>
              <p className="text-lg font-medium">{user.name}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{user.email}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">User ID</Label>
              <p className="text-sm font-mono text-muted-foreground">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Manage your security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/user-profile"}
            >
              <Shield className="w-4 h-4 mr-2" />
              Manage Security Settings
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Update your password, enable two-factor authentication, and manage sessions
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subscription" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              Your subscription details and usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold capitalize">
                  {subscription?.plan || "Free"}
                </p>
                <Badge className={getStatusColor(subscription?.status || "free")}>
                  {subscription?.status || "Free"}
                </Badge>
              </div>
              <Button
                onClick={handleManageSubscription}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {subscription?.plan === "free" ? "Upgrade Plan" : "Manage Subscription"}
              </Button>
            </div>

            {subscription?.periodEnd && (
              <div>
                <Label className="text-sm text-muted-foreground">
                  {subscription.status === "canceled" ? "Access ends" : "Next billing date"}
                </Label>
                <p className="text-lg font-medium">
                  {formatDate(subscription.periodEnd)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>
              Track your feature usage against your plan limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageLimits ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Resume Optimizations</span>
                    <span className="font-medium">
                      {usageLimits.resumeOptimizations.used} / {usageLimits.resumeOptimizations.limit}
                    </span>
                  </div>
                  <Progress
                    value={(usageLimits.resumeOptimizations.used / usageLimits.resumeOptimizations.limit) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Job Analyses</span>
                    <span className="font-medium">
                      {usageLimits.jobAnalyses.used} / {usageLimits.jobAnalyses.limit}
                    </span>
                  </div>
                  <Progress
                    value={(usageLimits.jobAnalyses.used / usageLimits.jobAnalyses.limit) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Resume Versions</span>
                    <span className="font-medium">
                      {usageLimits.resumeVersions.used} / {usageLimits.resumeVersions.limit}
                    </span>
                  </div>
                  <Progress
                    value={(usageLimits.resumeVersions.used / usageLimits.resumeVersions.limit) * 100}
                    className="h-2"
                  />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Loading usage data...</p>
            )}

            {subscription?.plan === "free" && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Need more?
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Upgrade to Pro for unlimited optimizations and advanced features.
                    </p>
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-blue-600 dark:text-blue-400"
                      onClick={() => router.push("/pricing")}
                    >
                      View pricing →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Manage your email preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="newsletter">Newsletter</Label>
                <p className="text-sm text-muted-foreground">
                  Receive tips, updates, and special offers
                </p>
              </div>
              <Switch
                id="newsletter"
                checked={newsletterEnabled}
                onCheckedChange={handleNewsletterToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="product-updates">Product Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new features and improvements
                </p>
              </div>
              <Switch
                id="product-updates"
                defaultChecked
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="usage-alerts">Usage Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when approaching plan limits
                </p>
              </div>
              <Switch
                id="usage-alerts"
                defaultChecked
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Preferences</CardTitle>
            <CardDescription>
              Customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-save">Auto-save</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save your work
                </p>
              </div>
              <Switch
                id="auto-save"
                defaultChecked
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-suggestions">AI Suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Show AI-powered suggestions while editing
                </p>
              </div>
              <Switch
                id="ai-suggestions"
                defaultChecked
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-red-600">
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              disabled
            >
              Delete Account
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Once you delete your account, there is no going back. Please be certain.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}