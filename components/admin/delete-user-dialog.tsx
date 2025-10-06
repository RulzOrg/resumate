"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userEmail: string
  userName: string
  onSuccess?: () => void
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  onSuccess
}: DeleteUserDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete user")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Failed to delete user:", error)
      alert(error.message || "Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-black border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white font-geist">
            Delete User Account?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/60 font-geist">
            This will permanently delete <strong className="text-white">{userName}</strong> ({userEmail}) and all associated data including:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All resumes and resume versions</li>
              <li>All job analyses and applications</li>
              <li>Subscription and billing data</li>
            </ul>
            <p className="mt-2 text-red-400 font-medium">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={deleting}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {deleting ? "Deleting..." : "Delete User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
