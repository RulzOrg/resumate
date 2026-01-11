"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Shield } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"

interface AdminUser {
  id: string
  clerkId: string
  email: string
  name: string
  isAdmin: boolean
}

interface AdminHeaderProps {
  admin: AdminUser
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg font-space-grotesk hidden sm:inline-block">
              ResuMate Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>Logged in as</span>
            <span className="font-medium text-foreground">{admin.email}</span>
          </div>
          <ThemeSwitcher />
          {mounted && (
            <UserButton
              afterSwitchSessionUrl="/admin"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          )}
        </div>
      </div>
    </header>
  )
}
