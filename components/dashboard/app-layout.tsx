"use client"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"
import type { User as UserType } from "@/lib/db"

const BREADCRUMB_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/profile": "Resumes",
  "/dashboard/optimized": "Optimized",
  "/dashboard/settings": "Settings",
}

interface AppLayoutProps {
  user: UserType
  children: React.ReactNode
}

export function AppLayout({ user, children }: AppLayoutProps) {
  const pathname = usePathname()

  // Build breadcrumb segments
  const breadcrumbLabel =
    BREADCRUMB_MAP[pathname] ??
    (pathname.startsWith("/dashboard/optimized/")
      ? "Resume Detail"
      : "Dashboard")

  const isNestedPage =
    pathname !== "/dashboard" && !BREADCRUMB_MAP[pathname]

  // Collapse sidebar by default on optimized resume detail pages
  const defaultSidebarOpen = !pathname.startsWith("/dashboard/optimized/")

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/50 backdrop-blur-lg px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {isNestedPage ? (
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {isNestedPage && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
