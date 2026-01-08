"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2, CreditCard, User, Shield, Zap, Mail, Bell } from "lucide-react"

interface SettingsClientProps {
  user: {
    id: string
    name: string
    email: string
  }
  subscription: any
  usageLimits: any
}

export function SettingsClient({ user, subscription, usageLimits }: SettingsClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Newsletter subscription state
  const [newsletterEnabled, setNewsletterEnabled] = useState(false)
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)
  const [newsletterLoading, setNewsletterLoading] = useState(true)
  const [newsletterActionLoading, setNewsletterActionLoading] = useState(false)

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

  // Fetch newsletter subscription status
  useEffect(() => {
    const fetchNewsletterStatus = async () => {
      try {
        const response = await fetch("/api/beehiiv/status")
        const data = await response.json()
        
        setNewsletterEnabled(data.enabled)
        setNewsletterSubscribed(data.subscribed)
      } catch (error) {
        console.error("Failed to fetch newsletter status:", error)
      } finally {
        setNewsletterLoading(false)
      }
    }

    fetchNewsletterStatus()
  }, [])

  // Handle newsletter subscription toggle
  const handleNewsletterToggle = async (checked: boolean) => {
    setNewsletterActionLoading(true)
    
    try {
      const endpoint = checked ? "/api/beehiiv/subscribe" : "/api/beehiiv/unsubscribe"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (data.success) {
        setNewsletterSubscribed(checked)
        toast.success(
          checked 
            ? "Successfully subscribed to newsletter" 
            : "Successfully unsubscribed from newsletter"
        )
      } else {
        throw new Error(data.error || "Failed to update newsletter subscription")
      }
    } catch (error: any) {
      console.error("Newsletter toggle error:", error)
      toast.error(error.message || "Failed to update newsletter subscription")
    } finally {
      setNewsletterActionLoading(false)
    }
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
                      Upgrade to Pro for unlimited optimizations.
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
            <CardTitle>Newsletter Preferences</CardTitle>
            <CardDescription>
              Manage your newsletter subscription and email preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!newsletterEnabled ? (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Newsletter integration is not currently enabled.
                </p>
              </div>
            ) : newsletterLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading subscription status...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <Label htmlFor="newsletter" className="text-base font-medium">
                        Newsletter Subscription
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive updates, tips, and exclusive content via email
                    </p>
                  </div>
                  <Switch
                    id="newsletter"
                    checked={newsletterSubscribed}
                    onCheckedChange={handleNewsletterToggle}
                    disabled={newsletterActionLoading}
                  />
                </div>

                {newsletterSubscribed && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Mail className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          You're subscribed!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          You'll receive our newsletter at <strong>{user.email}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    You can unsubscribe at any time by toggling the switch above or by clicking the 
                    unsubscribe link in any newsletter email.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Configure when we send you emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-1">
                <Label className="text-sm font-medium">Resume Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your resume optimization is complete
                </p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-1">
                <Label className="text-sm font-medium">Account Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Important updates about your account and security
                </p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Note: Critical account emails cannot be disabled.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
