"use client"

import { Search, Plus, Menu, X, Home } from "lucide-react"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
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
    <header className="sticky top-0 z-20 border-b border-border bg-background/50 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onMobileMenuClick}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            className={`md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors ${
              isMobileMenuOpen 
                ? "border-emerald-500/50 bg-emerald-500/10" 
                : "border-border bg-secondary"
            }`}
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Menu className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="w-4 h-4" />
            <span className="font-geist">Dashboard</span>
            <span className="opacity-50">/</span>
            {typeof breadcrumb === 'object' ? (
              <>
                <span className="font-geist">{breadcrumb.parent}</span>
                <span className="opacity-50">/</span>
                <span className="font-geist text-foreground">{breadcrumb.current}</span>
              </>
            ) : (
              <span className="font-geist text-foreground">{breadcrumb}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 rounded-full bg-input border border-border text-foreground placeholder-muted-foreground pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>
          <Button className="inline-flex items-center gap-2 rounded-full bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline font-geist">New variant</span>
          </Button>
          <ThemeToggle />
          <button className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-2">
            <UserAvatar />
          </button>
        </div>
      </div>
    </header>
  )
}
