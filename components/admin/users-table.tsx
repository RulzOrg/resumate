"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Trash2 } from "lucide-react"
import { AdminUserListItem } from "@/lib/db"
import { DeleteUserDialog } from "./delete-user-dialog"

interface UsersTableProps {
  users: AdminUserListItem[]
  onUserDeleted?: () => void
}

export function UsersTable({ users, onUserDeleted }: UsersTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null)

  const handleDeleteClick = (user: AdminUserListItem) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const getSubscriptionBadge = (status: string, plan: string) => {
    if (status === "active") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          {plan}
        </Badge>
      )
    }
    return (
      <Badge className="bg-white/5 text-white/60 border-white/10">
        {status}
      </Badge>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/70 font-geist">User</TableHead>
              <TableHead className="text-white/70 font-geist">Email</TableHead>
              <TableHead className="text-white/70 font-geist">Subscription</TableHead>
              <TableHead className="text-white/70 font-geist">Resumes</TableHead>
              <TableHead className="text-white/70 font-geist">Jobs</TableHead>
              <TableHead className="text-white/70 font-geist">Joined</TableHead>
              <TableHead className="text-white/70 font-geist text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-white/50 py-8 font-geist">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white font-geist">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=10b981`}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/80 font-geist">{user.email}</TableCell>
                  <TableCell>
                    {getSubscriptionBadge(user.subscription_status, user.subscription_plan)}
                  </TableCell>
                  <TableCell className="text-white/80 font-geist">{user.resume_count}</TableCell>
                  <TableCell className="text-white/80 font-geist">{user.job_analysis_count}</TableCell>
                  <TableCell className="text-white/80 font-geist">
                    {(() => {
                      try {
                        const date = new Date(user.created_at)
                        if (isNaN(date.getTime())) return "Invalid date"
                        return formatDistanceToNow(date, { addSuffix: true })
                      } catch {
                        return "Invalid date"
                      }
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/admin/users/${user.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/70 hover:text-white hover:bg-white/10"
                          aria-label={`View user ${user.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(user)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        aria-label={`Delete user ${user.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          userName={selectedUser.name}
          onSuccess={onUserDeleted}
        />
      )}
    </>
  )
}
