"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Eye,
  Edit,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  FileText,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDebounce } from "@/hooks/use-debounce"

interface User {
  id: string
  email: string
  name: string
  clerkUserId: string | null
  subscriptionStatus: string
  subscriptionPlan: string
  subscriptionPeriodEnd: string | null
  polarCustomerId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  stats: {
    resumes: number
    jobAnalyses: number
    resumeVersions: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

interface UserDetail {
  id: string
  email: string
  name: string
  clerkUserId: string | null
  subscriptionStatus: string
  subscriptionPlan: string
  subscriptionPeriodEnd: string | null
  polarCustomerId: string | null
  polarSubscriptionId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  resumes: Array<{
    id: string
    title: string
    kind: string
    processingStatus: string
    createdAt: string
  }>
  jobAnalyses: Array<{
    id: string
    jobTitle: string
    companyName: string
    createdAt: string
  }>
  _count: {
    resumes: number
    jobAnalyses: number
    resumeVersions: number
    jobApplications: number
  }
}

export function UsersContent() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [plan, setPlan] = useState("all")
  const [page, setPage] = useState(1)

  // Modals
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status,
        plan,
      })

      if (debouncedSearch) {
        params.set("search", debouncedSearch)
      }

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error("Failed to fetch users")

      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [page, status, plan, debouncedSearch])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleViewUser = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`)
      if (!response.ok) throw new Error("Failed to fetch user details")

      const data = await response.json()
      setSelectedUser(data.user)
      setViewModalOpen(true)
    } catch (err) {
      console.error("Error fetching user:", err)
    }
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async (hardDelete: boolean = false) => {
    if (!userToDelete) return

    try {
      setDeleting(true)
      const url = hardDelete
        ? `/api/admin/users/${userToDelete.id}?hard=true`
        : `/api/admin/users/${userToDelete.id}`

      const response = await fetch(url, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete user")

      setDeleteModalOpen(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (err) {
      console.error("Error deleting user:", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleUpdateSubscription = async (userId: string, newStatus: string, newPlan: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionStatus: newStatus,
          subscriptionPlan: newPlan,
        }),
      })

      if (!response.ok) throw new Error("Failed to update user")
      fetchUsers()
      setViewModalOpen(false)
    } catch (err) {
      console.error("Error updating user:", err)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
          </SelectContent>
        </Select>

        <Select value={plan} onValueChange={(v) => { setPlan(v); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Resumes</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Jobs</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={user.subscriptionStatus} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm capitalize">{user.subscriptionPlan}</span>
                      </td>
                      <td className="py-3 px-4 text-sm">{user.stats.resumes}</td>
                      <td className="py-3 px-4 text-sm">{user.stats.jobAnalyses}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(user)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(user)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View User Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View and manage user information
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedUser.subscriptionStatus} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">{selectedUser.subscriptionPlan}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedUser.subscriptionPeriodEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">Renews</p>
                    <p className="font-medium">
                      {new Date(selectedUser.subscriptionPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Resumes</p>
                  <p className="text-2xl font-bold">{selectedUser._count.resumes}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Job Analyses</p>
                  <p className="text-2xl font-bold">{selectedUser._count.jobAnalyses}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Versions</p>
                  <p className="text-2xl font-bold">{selectedUser._count.resumeVersions}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Applications</p>
                  <p className="text-2xl font-bold">{selectedUser._count.jobApplications}</p>
                </Card>
              </div>

              {/* Recent Resumes */}
              {selectedUser.resumes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Recent Resumes
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.resumes.slice(0, 5).map((resume) => (
                      <div
                        key={resume.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{resume.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {resume.kind} - {resume.processingStatus}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(resume.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Job Analyses */}
              {selectedUser.jobAnalyses.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Recent Job Analyses
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.jobAnalyses.slice(0, 5).map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{job.jobTitle}</p>
                          <p className="text-xs text-muted-foreground">{job.companyName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleUpdateSubscription(selectedUser.id, "active", "pro")}
                >
                  Upgrade to Pro
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateSubscription(selectedUser.id, "free", "free")}
                >
                  Downgrade to Free
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewModalOpen(false)
                    setUserToDelete({
                      ...selectedUser,
                      stats: {
                        resumes: selectedUser._count.resumes,
                        jobAnalyses: selectedUser._count.jobAnalyses,
                        resumeVersions: selectedUser._count.resumeVersions,
                      },
                    })
                    setDeleteModalOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {userToDelete && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">{userToDelete.name}</p>
                <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This will delete all user data including {userToDelete.stats.resumes} resumes and {userToDelete.stats.jobAnalyses} job analyses.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleConfirmDelete(false)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Soft Delete
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleConfirmDelete(true)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
