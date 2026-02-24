"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Monitor,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { SignOutButton } from "@clerk/nextjs"
import { Logo } from "@/components/ui/logo"
import { UserAvatar } from "./user-avatar"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import type { User as UserType } from "@/lib/db"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resumes", href: "/dashboard/profile", icon: FileText },
  { label: "Optimized", href: "/dashboard/optimized", icon: Sparkles },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const

const SUPPORT_ITEMS = [
  { label: "Help & Support", href: "/support", icon: HelpCircle },
] as const

interface AppSidebarProps {
  user: UserType
}

const THEME_CYCLE = ["light", "system", "dark"] as const
const THEME_ICONS = { light: Sun, system: Monitor, dark: Moon } as const

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const { theme, setTheme } = useTheme()
  const isCollapsed = state === "collapsed"

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme as typeof THEME_CYCLE[number])
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length
    setTheme(THEME_CYCLE[nextIndex])
  }

  const CurrentThemeIcon = THEME_ICONS[(theme as keyof typeof THEME_ICONS) ?? "system"]

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <Logo size="sm" />
                {!isCollapsed && (
                  <span className="ml-2 font-semibold text-sm truncate">Useresumate</span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SUPPORT_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isCollapsed ? (
              <SidebarMenuButton tooltip="Toggle theme" onClick={cycleTheme}>
                <CurrentThemeIcon />
              </SidebarMenuButton>
            ) : (
              <div className="flex items-center justify-between px-2 py-1">
                <ThemeSwitcher />
              </div>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard/profile">
                <UserAvatar user={user} size={isCollapsed ? "sm" : "default"} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SignOutButton redirectUrl="/">
              <SidebarMenuButton tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SignOutButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
