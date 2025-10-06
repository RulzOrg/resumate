"use client"

import { useState, useEffect } from "react"
import { UsersTable } from "@/components/admin/users-table"
import { AdminUserListItem } from "@/lib/db"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search,
        subscription_status: subscriptionFilter === "all" ? "" : subscriptionFilter
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error("Failed to fetch users")

      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, subscriptionFilter])

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/dashboard/admin"
              className="text-sm text-emerald-400 hover:text-emerald-300 mb-2 inline-flex items-center gap-1 font-geist"
            >
              ← Back to Admin Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white font-geist">User Management</h1>
            <p className="text-white/60 mt-1 font-geist">
              {total} total users
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-white/5 border-white/10 text-white placeholder-white/40 font-geist"
            />
            <Button
              onClick={handleSearch}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-geist"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white font-geist">
              <SelectValue placeholder="Filter by plan" />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/10">
              <SelectItem value="all" className="text-white font-geist">All Users</SelectItem>
              <SelectItem value="free" className="text-white font-geist">Free</SelectItem>
              <SelectItem value="active" className="text-white font-geist">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <>
            <UsersTable users={users} onUserDeleted={fetchUsers} />

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-white/60 font-geist">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50 font-geist"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-50 font-geist"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
