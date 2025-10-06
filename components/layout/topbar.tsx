"use client"

import { Search, Plus, Menu, Home } from "lucide-react"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"

interface TopbarProps {
  onMobileMenuClick?: () => void
  isMobileMenuOpen?: boolean
}

export function Topbar({ onMobileMenuClick, isMobileMenuOpen = false }: TopbarProps) {
  const pathname = usePathname()

  // Generate breadcrumb from pathname
  const getBreadcrumb = () => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 1) return "Dashboard"
    
    // Handle nested routes like /dashboard/jobs/add
    if (segments.length > 2) {
      const parent = segments[segments.length - 2]
      const current = segments[segments.length - 1]
      return {
        parent: parent.charAt(0).toUpperCase() + parent.slice(1),
        current: current.charAt(0).toUpperCase() + current.slice(1)
      }
    }
    
    const current = segments[segments.length - 1]
    return current.charAt(0).toUpperCase() + current.slice(1)
  }
  
  const breadcrumb = getBreadcrumb()

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/50 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onMobileMenuClick}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-white/10 bg-white/5"
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search"
              className="w-64 rounded-full bg-white/5 border border-white/15 text-white placeholder-white/40 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-white/60">
            <Home className="w-4 h-4" />
            <span className="font-geist">Dashboard</span>
            <span className="text-white/30">/</span>
            {typeof breadcrumb === 'object' ? (
              <>
                <span className="font-geist">{breadcrumb.parent}</span>
                <span className="text-white/30">/</span>
                <span className="font-geist text-white/80">{breadcrumb.current}</span>
              </>
            ) : (
              <span className="font-geist text-white/80">{breadcrumb}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 rounded-full bg-white/5 border border-white/15 text-white placeholder-white/40 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <Button className="inline-flex items-center gap-2 rounded-full bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline font-geist">New variant</span>
          </Button>
          <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2">
            <UserAvatar />
          </button>
        </div>
      </div>
    </header>
  )
}
