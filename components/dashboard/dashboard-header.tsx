import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RefreshCw, Settings, Plus, User } from "lucide-react"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { UploadResumeDialog } from "./upload-resume-dialog"
import type { User as UserType } from "@/lib/db"
import { UserAvatar } from "./user-avatar"

interface DashboardHeaderProps {
  user: UserType
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-black/50 backdrop-blur-lg border-b border-white/10">
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
            <UploadResumeDialog>
              <Button className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors">
                <Plus className="h-4 w-4" />
                New Generation
              </Button>
            </UploadResumeDialog>
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
              <DropdownMenuContent className="w-56 bg-black/90 backdrop-blur-lg border-white/10" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="w-[200px] truncate text-sm text-white/60">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild className="text-white/80 hover:text-white hover:bg-white/10">
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-white/80 hover:text-white hover:bg-white/10">
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <LogoutButton />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
