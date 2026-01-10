"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  Shield,
  Zap,
  CreditCard,
  HardDrive,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  Server,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ServiceStatus {
  name: string
  status: "healthy" | "degraded" | "down"
  latency?: number
  message?: string
  lastChecked: string
}

interface HealthData {
  status: "healthy" | "degraded" | "down"
  services: ServiceStatus[]
  database: {
    totalUsers: number
    totalResumes: number
    pendingResumes: number
    failedResumes: number
  }
  meta: {
    checkDuration: number
    timestamp: string
    environment: string
  }
}

const serviceIcons: Record<string, React.ElementType> = {
  "PostgreSQL Database": Database,
  "Clerk Authentication": Shield,
  "OpenAI API": Zap,
  "Polar Payments": CreditCard,
  "Qdrant Vector DB": Server,
  "Supabase Storage": HardDrive,
}

export function SystemHealthContent() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchHealth = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/health")
      if (!response.ok) throw new Error("Failed to fetch health status")

      const data = await response.json()
      setHealth(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health status")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !health) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchHealth} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!health) return null

  const StatusIcon = health.status === "healthy"
    ? CheckCircle
    : health.status === "degraded"
    ? AlertTriangle
    : XCircle

  const statusColors = {
    healthy: "text-emerald-500",
    degraded: "text-amber-500",
    down: "text-red-500",
  }

  const statusBg = {
    healthy: "bg-emerald-100 dark:bg-emerald-900/30",
    degraded: "bg-amber-100 dark:bg-amber-900/30",
    down: "bg-red-100 dark:bg-red-900/30",
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={`border-2 ${health.status === "healthy" ? "border-emerald-200 dark:border-emerald-800" : health.status === "degraded" ? "border-amber-200 dark:border-amber-800" : "border-red-200 dark:border-red-800"}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${statusBg[health.status]}`}>
                <StatusIcon className={`h-8 w-8 ${statusColors[health.status]}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold capitalize">System {health.status}</h2>
                <p className="text-muted-foreground">
                  {health.services.filter(s => s.status === "healthy").length} of {health.services.length} services operational
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Environment</p>
              <Badge variant="outline" className="capitalize">
                {health.meta.environment}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{health.database.totalUsers.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Resumes</p>
              <p className="text-2xl font-bold">{health.database.totalResumes.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Pending Processing</p>
              <p className="text-2xl font-bold text-amber-600">{health.database.pendingResumes}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Failed Processing</p>
              <p className="text-2xl font-bold text-red-600">{health.database.failedResumes}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {health.services.map((service) => {
          const Icon = serviceIcons[service.name] || Activity
          const ServiceStatusIcon = service.status === "healthy"
            ? CheckCircle
            : service.status === "degraded"
            ? AlertTriangle
            : XCircle

          return (
            <Card key={service.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusBg[service.status]}`}>
                      <Icon className={`h-5 w-5 ${statusColors[service.status]}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">{service.message}</p>
                    </div>
                  </div>
                  <ServiceStatusIcon className={`h-5 w-5 ${statusColors[service.status]}`} />
                </div>

                {service.latency !== undefined && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Latency:</span>
                    <span className={`font-medium ${service.latency > 500 ? "text-amber-600" : "text-emerald-600"}`}>
                      {service.latency}ms
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Meta Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Health Check Details</CardTitle>
          <CardDescription>Technical information about the health check</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Check Duration</p>
              <p className="text-lg font-medium">{health.meta.checkDuration}ms</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Last Checked</p>
              <p className="text-lg font-medium">
                {new Date(health.meta.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Auto-Refresh</p>
              <p className="text-lg font-medium">Every 30s</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </p>
        <Button onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Now
        </Button>
      </div>
    </div>
  )
}
