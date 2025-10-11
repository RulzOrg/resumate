"use client"

import { UserButton } from "@clerk/nextjs"
import dynamic from "next/dynamic"
import type { User as UserType } from "@/lib/db"

interface UserAvatarProps {
  user?: UserType
}

// Dynamically import UserButton to avoid SSR issues
const DynamicUserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => ({ default: mod.UserButton })),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-9 w-9 rounded-full bg-white/10 animate-pulse" />
    ),
  }
)

export function UserAvatar({ user: _user }: UserAvatarProps) {
  return (
    <div className="relative h-9 w-9 rounded-full">
      <DynamicUserButton afterSignOutUrl="/auth/login" />
    </div>
  )
}


