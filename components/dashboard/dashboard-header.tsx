"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Settings, User } from "lucide-react"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import type { User as UserType } from "@/lib/db"
import { UserAvatar } from "./user-avatar"
import { WelcomeVideoButton } from "./welcome-video-button"
import { useWelcomeVideo } from "@/components/providers/welcome-video-provider"

interface DashboardHeaderProps {
  user: UserType
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const welcomeVideo = useWelcomeVideo()

  return (
    <header className="sticky top-0 z-30 bg-background/50 backdrop-blur-lg border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                <RefreshCw className="h-4 w-4" />
              </span>
              <span className="text-base font-medium tracking-tighter">ResuMate AI</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {welcomeVideo && (
              <WelcomeVideoButton onClick={welcomeVideo.openWelcomeVideo} />
            )}
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="Open account menu"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      ;(e.currentTarget as HTMLElement).click()
                    }
                  }}
                >
                  <UserAvatar user={user} />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-foreground/90 dark:bg-black/90 backdrop-blur-lg border-border dark:border-white/10" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-foreground dark:text-white">{user.name}</p>
                    <p className="w-[200px] truncate text-sm text-foreground/60 dark:text-white/60">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-surface-muted dark:bg-white/10" />
                <DropdownMenuItem asChild className="text-foreground/80 dark:text-white/80 hover:text-foreground dark:hover:text-white hover:bg-surface-muted dark:hover:bg-white/10">
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-foreground/80 dark:text-white/80 hover:text-foreground dark:hover:text-white hover:bg-surface-muted dark:hover:bg-white/10">
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-surface-muted dark:bg-white/10" />
                <LogoutButton />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
