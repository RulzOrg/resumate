"use client"

import { useUser } from "@clerk/nextjs"
import Image from "next/image"
import { User } from "lucide-react"
import type { User as UserType } from "@/lib/db"

interface UserAvatarProps {
  user?: UserType
}

export function UserAvatar({ user }: UserAvatarProps) {
  const { user: clerkUser } = useUser()

  // Priority: custom avatar_url > Clerk imageUrl > placeholder
  const avatarUrl = user?.avatar_url || clerkUser?.imageUrl || null
  const userName = user?.name || clerkUser?.fullName || "User"

  if (avatarUrl) {
    return (
      <div className="relative h-9 w-9 rounded-full overflow-hidden border border-border">
        <Image
          src={avatarUrl}
          alt={userName}
          width={36}
          height={36}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="relative h-9 w-9 rounded-full bg-primary/20 border border-border flex items-center justify-center">
      <User className="h-5 w-5 text-primary" />
    </div>
  )
}


