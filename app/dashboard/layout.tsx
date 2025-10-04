import { Sidebar } from "@/components/layout/sidebar"
import { DashboardLayoutClient } from "./layout-client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="antialiased text-white bg-black font-geist min-h-screen">
      {/* Background gradient */}
      <div
        className="fixed top-0 left-0 w-full h-[880px] -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%,rgba(120,119,198,0.3),hsla(0,0%,100%,0))",
        }}
      />

      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </div>
  )
}
