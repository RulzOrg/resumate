"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog"
import {
  User,
  Mail,
  Calendar,
  CreditCard,
  FileText,
  Briefcase,
  Trash2,
  Loader2,
  ShieldCheck
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UserDetails {
  user: {
    id: string
    email: string
    name: string
    clerk_user_id?: string
    subscription_status: string
    subscription_plan: string
    subscription_period_end?: string
    stripe_customer_id?: string
    stripe_subscription_id?: string
    onboarding_completed_at?: string
    created_at: string
    updated_at: string
  }
  resumes: Array<{
    id: string
    title: string
    file_name: string
    kind: string
    processing_status: string
    created_at: string
  }>
  jobAnalyses: Array<{
    id: string
    job_title: string
    company_name: string
    created_at: string
  }>
  applications: Array<{
    id: string
    job_title: string
    company_name: string
    status: string
    applied_at: string
  }>
}

export default function AdminUserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [updatingSubscription, setUpdatingSubscription] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState("")
  const [subscriptionPlan, setSubscriptionPlan] = useState("")

  const fetchUserDetails = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) throw new Error("Failed to fetch user details")

      const data = await response.json()
      setUserDetails(data)
      setSubscriptionStatus(data.user.subscription_status)
      setSubscriptionPlan(data.user.subscription_plan)
    } catch (error) {
      console.error("Failed to fetch user details:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUserDetails()
  }, [fetchUserDetails])

  const handleUpdateSubscription = async () => {
    if (!userDetails) return

    setUpdatingSubscription(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_status: subscriptionStatus,
          subscription_plan: subscriptionPlan
        })
      })

      if (!response.ok) throw new Error("Failed to update subscription")

      await fetchUserDetails()
      alert("Subscription updated successfully")
    } catch (error: any) {
      console.error("Failed to update subscription:", error)
      alert(error.message || "Failed to update subscription")
    } finally {
      setUpdatingSubscription(false)
    }
  }

  const handleDeleteSuccess = () => {
    router.push("/dashboard/admin/users")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (!userDetails) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4 font-geist">User not found</p>
          <Link href="/dashboard/admin/users">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-geist">
              Back to Users
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { user, resumes, jobAnalyses, applications } = userDetails

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          href="/dashboard/admin/users"
          className="text-sm text-emerald-400 hover:text-emerald-300 mb-4 inline-flex items-center gap-1 font-geist"
        >
          ← Back to Users
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=10b981`}
              alt={user.name}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h1 className="text-3xl font-bold text-white font-geist">{user.name}</h1>
              <p className="text-white/60 mt-1 font-geist">{user.email}</p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete User
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-medium text-white font-geist">Account Info</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60 font-geist">User ID:</span>
                <span className="text-white font-mono text-xs">{user.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 font-geist">Clerk ID:</span>
                <span className="text-white font-mono text-xs">{user.clerk_user_id?.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 font-geist">Joined:</span>
                <span className="text-white font-geist">{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 font-geist">Onboarding:</span>
                {user.onboarding_completed_at ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    Completed
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-medium text-white font-geist">Subscription</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block font-geist">Status</label>
                <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white font-geist">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="free" className="text-white font-geist">Free</SelectItem>
                    <SelectItem value="active" className="text-white font-geist">Active</SelectItem>
                    <SelectItem value="canceled" className="text-white font-geist">Canceled</SelectItem>
                    <SelectItem value="past_due" className="text-white font-geist">Past Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block font-geist">Plan</label>
                <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white font-geist">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="free" className="text-white font-geist">Free</SelectItem>
                    <SelectItem value="pro" className="text-white font-geist">Pro</SelectItem>
                    <SelectItem value="enterprise" className="text-white font-geist">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleUpdateSubscription}
                disabled={updatingSubscription}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-geist"
              >
                {updatingSubscription && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Subscription
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-medium text-white font-geist">Activity</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm font-geist">Resumes</span>
                <span className="text-2xl font-bold text-white font-geist">{resumes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm font-geist">Job Analyses</span>
                <span className="text-2xl font-bold text-white font-geist">{jobAnalyses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm font-geist">Applications</span>
                <span className="text-2xl font-bold text-white font-geist">{applications.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 font-geist">Resumes ({resumes.length})</h3>
            {resumes.length === 0 ? (
              <p className="text-white/50 text-center py-4 font-geist">No resumes</p>
            ) : (
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <div key={resume.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex-1">
                      <p className="text-white font-medium font-geist">{resume.title}</p>
                      <p className="text-white/50 text-sm font-geist">{resume.file_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-white/5 text-white/60 border-white/10">{resume.kind}</Badge>
                      <span className="text-white/50 text-sm font-geist">
                        {formatDistanceToNow(new Date(resume.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 font-geist">Recent Job Analyses ({jobAnalyses.length})</h3>
            {jobAnalyses.length === 0 ? (
              <p className="text-white/50 text-center py-4 font-geist">No job analyses</p>
            ) : (
              <div className="space-y-2">
                {jobAnalyses.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex-1">
                      <p className="text-white font-medium font-geist">{job.job_title}</p>
                      <p className="text-white/50 text-sm font-geist">{job.company_name}</p>
                    </div>
                    <span className="text-white/50 text-sm font-geist">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {userDetails && (
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}
