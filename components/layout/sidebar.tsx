"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  BarChart3,
  Users,
  Settings,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  FolderIcon,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"

interface SidebarProps {
  className?: string
  isMobileOpen?: boolean
  onMobileClose?: () => void
  onCollapsedChange?: (collapsed: boolean) => void
}

const mainNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Jobs",
    href: "/dashboard/jobs",
    icon: Briefcase,
  },
  {
    title: "Resumes",
    href: "/dashboard/resumes",
    icon: FileText,
  },
  {
    title: "Projects",
    href: "/dashboard/projects",
    icon: FolderIcon,
  },
  {
    title: "New Project",
    href: "/dashboard/projects/new",
    icon: Plus,
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
]

const accountNavItems = [
  {
    title: "Master Resume",
    href: "/dashboard/master-resume",
    icon: FileText,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar({ className, isMobileOpen = false, onMobileClose, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const onCollapsedChangeRef = useRef(onCollapsedChange)
  const { user } = useUser()
  
  // Check if user is admin (via Clerk publicMetadata)
  const isAdmin = user?.publicMetadata?.role === "admin"

  // Keep ref up to date with latest callback
  useEffect(() => {
    onCollapsedChangeRef.current = onCollapsedChange
  }, [onCollapsedChange])

  // Load collapsed state from localStorage (runs only on mount)
  useEffect(() => {
    const stored = localStorage.getItem("sidebarCollapsed")
    if (stored !== null) {
      const collapsed = stored === "1"
      setIsCollapsed(collapsed)
      onCollapsedChangeRef.current?.(collapsed)
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebarCollapsed", newState ? "1" : "0")
    onCollapsedChange?.(newState)
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
      />

      {/* Sidebar */}
      <aside
        id="mobile-sidebar"
        className={cn(
          "fixed z-40 top-0 bottom-0 left-0 transition-all duration-300 will-change-transform overflow-x-hidden border-r border-white/10 backdrop-blur-xl bg-black/50",
          isCollapsed ? "w-16" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className={cn(
            "flex items-center px-4 py-4 border-b border-white/10",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                  <Sparkles className="w-4 h-4 text-black/90" />
                </span>
                <span className="text-base font-medium tracking-tighter font-geist">
                  ResuMate AI
                </span>
              </Link>
            )}
            {isCollapsed && (
              <>
                <div>
                  <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                    <Sparkles className="w-4 h-4 text-black/90" />
                  </span>
                </div>
                <button
                  onClick={toggleCollapse}
                  className="absolute right-4 hidden md:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 bg-white/5"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>
              </>
            )}
            {!isCollapsed && (
              <div className="inline-flex items-center gap-2">
              <button
                onClick={toggleCollapse}
                className="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 bg-white/5"
                aria-label="Toggle sidebar"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-white/70" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-white/70" />
                )}
              </button>
              <button
                onClick={onMobileClose}
                className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 bg-white/5"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {!isCollapsed && (
              <div className="px-2 mb-2">
                <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium font-geist">
                  Main
                </p>
              </div>
            )}
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "text-white/90 bg-white/10 border border-white/10"
                        : "text-white/80 border border-transparent hover:text-white hover:bg-white/5 hover:border-white/10",
                      isCollapsed && "justify-center"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6",
                        isActive ? "text-emerald-300" : "text-white"
                      )}
                    />
                    {!isCollapsed && (
                      <span className="font-geist">{item.title}</span>
                    )}
                  </Link>
                )
              })}
            </div>

            {!isCollapsed && (
              <div className="px-2 mt-6 mb-2">
                <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium font-geist">
                  Account
                </p>
              </div>
            )}
            <div className="space-y-1 mt-1">
              {accountNavItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors",
                      isActive && "text-white bg-white/10 border-white/10",
                      isCollapsed && "justify-center"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-[18px] h-[18px]",
                        isActive ? "text-emerald-300" : "text-white"
                      )}
                    />
                    {!isCollapsed && (
                      <span className="font-geist">{item.title}</span>
                    )}
                  </Link>
                )
              })}
              
              {/* Admin Portal - only visible to admin users */}
              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors",
                    pathname === "/dashboard/admin" && "text-white bg-white/10 border-white/10",
                    isCollapsed && "justify-center"
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      "w-[18px] h-[18px]",
                      pathname === "/dashboard/admin" ? "text-emerald-300" : "text-white"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="font-geist">Admin Portal</span>
                  )}
                </Link>
              )}
            </div>
          </nav>

          {/* Upgrade / footer */}
          {!isCollapsed && (
            <div className="px-4 py-4 border-t border-white/10">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <p className="text-xs font-medium text-emerald-200 font-geist">
                    ATS Health active
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-emerald-200/80 font-geist">
                  Real-time checks enabled.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
