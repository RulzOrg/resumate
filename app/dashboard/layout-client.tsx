"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { NetworkStatus } from "@/components/layout/network-status"
import { ErrorBoundary } from "@/components/layout/error-boundary"
import { MobileNav } from "@/components/dashboard/mobile-nav"

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <>
      <div className="w-full min-h-screen relative flex">
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          onCollapsedChange={setIsSidebarCollapsed}
        />
        
        <div 
          className="flex flex-col min-w-0 w-full max-w-full transition-all duration-300"
          style={{
            paddingLeft: isMobile ? '0' : (isSidebarCollapsed ? '64px' : '288px'),
          }}
        >
          <Topbar 
            onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
            isMobileMenuOpen={isMobileSidebarOpen}
          />
          
          <main className="flex-1 pb-20 md:pb-0">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* Global network status indicator */}
      <NetworkStatus />
    </>
  )
}
