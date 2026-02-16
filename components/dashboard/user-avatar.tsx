"use client"

import { useUser } from "@clerk/nextjs"
import Image from "next/image"
import { User } from "lucide-react"
import type { User as UserType } from "@/lib/db"

interface UserAvatarProps {
  user?: UserType
  size?: "default" | "sm"
}

export function UserAvatar({ user, size = "default" }: UserAvatarProps) {
  const { user: clerkUser } = useUser()

  // Priority: custom avatar_url > Clerk imageUrl > placeholder
  const avatarUrl = user?.avatar_url || clerkUser?.imageUrl || null
  const userName = user?.name || clerkUser?.fullName || "User"

  const sizeClasses = size === "sm" ? "h-7 w-7" : "h-9 w-9"
  const iconClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5"
  const imgSize = size === "sm" ? 28 : 36

  if (avatarUrl) {
    return (
      <div className={`relative ${sizeClasses} rounded-full overflow-hidden border border-border shrink-0`}>
        <Image
          src={avatarUrl}
          alt={userName}
          width={imgSize}
          height={imgSize}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`relative ${sizeClasses} rounded-full bg-primary/20 border border-border flex items-center justify-center shrink-0`}>
      <User className={`${iconClasses} text-primary`} />
    </div>
  )
}


