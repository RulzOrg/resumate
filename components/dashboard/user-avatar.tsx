"use client"

import { UserButton } from "@clerk/nextjs"
import type { User as UserType } from "@/lib/db"

interface UserAvatarProps {
  user?: UserType
}

export function UserAvatar({ user: _user }: UserAvatarProps) {
  return (
    <div className="relative h-9 w-9 rounded-full">
      <UserButton afterSignOutUrl="/auth/login" />
    </div>
  )
}


