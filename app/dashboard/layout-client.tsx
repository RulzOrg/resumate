"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

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
        <Topbar onMobileMenuClick={() => setIsMobileSidebarOpen(true)} />
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
