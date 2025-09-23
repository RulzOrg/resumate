"use client"

import { UserButton } from "@clerk/nextjs"

export function UserAvatar() {
  return (
    <div className="relative h-9 w-9 rounded-full">
      <UserButton afterSignOutUrl="/auth/login" />
    </div>
  )
}


