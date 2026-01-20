"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Upload, Target, Star, Check, Download, FileSearch } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Logo } from "@/components/logo"
import { useAuth } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ResourcesMegaMenu, RESOURCES_ITEMS } from "@/components/resources-mega-menu"
import { ChevronDown } from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const NAV_ITEMS: NavItem[] = [
  { label: "How It Works", href: "/#how-it-works", icon: Upload, description: "Simple 3-step process" },
  { label: "Features", href: "/#features", icon: Target, description: "Powerful AI tools" },
  { label: "Pricing", href: "/#pricing", icon: Star, description: "Flexible plans" },
]

export function PublicHeader() {
  const { isSignedIn } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="mt-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 backdrop-blur"
          >
            <Logo size="sm" />
          </Link>

          <div className="hidden gap-1 md:flex bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-full p-1 backdrop-blur items-center">
            <a
              href="/#how-it-works"
              className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans"
            >
              How It Works
            </a>
            <a href="/#features" className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans">
              Features
            </a>
            <a href="/#pricing" className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans">
              Pricing
            </a>

            {/* Resources Dropdown - Click to open, click outside to close */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans focus:outline-none">
                Resources
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={12}
                className="w-auto min-w-[320px] p-0 border-2 border-neutral-200 dark:border-neutral-700 bg-[#ffffff] dark:bg-[#0a0a0a] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
              >
                <ResourcesMegaMenu />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeSwitcher />
            <Link
              href={isSignedIn ? "/dashboard" : "/auth/signup"}
              className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors font-sans"
            >
              {isSignedIn ? "Open Dashboard" : "Optimize My Resume"}
            </Link>
          </div>

          <button
            onClick={toggleMobileMenu}
            className="md:hidden inline-flex items-center gap-2 rounded-lg border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 text-sm font-medium backdrop-blur font-sans"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>
        </nav>

        {/* Mobile Menu */}
        <div className={`fixed inset-0 z-50 md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={toggleMobileMenu}
            style={{ opacity: mobileMenuOpen ? 1 : 0 }}
          />

          {/* Slide-in Panel */}
          <div className={`fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-background backdrop-blur-xl border-l border-border dark:border-white/10 transform transition-transform duration-300 ease-out`}
               style={{ transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)' }}>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-white/10">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  onClick={toggleMobileMenu}
                  className="inline-flex items-center rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 backdrop-blur"
                >
                  <Logo size="sm" />
                </Link>
              </div>
              <button
                onClick={toggleMobileMenu}
                className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-border/80 dark:border-white/20 hover:bg-surface-subtle dark:hover:bg-white/5 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6 text-foreground dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <div className="py-6 px-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 88px)' }}>
              <div className="space-y-3">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={toggleMobileMenu}
                    className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle dark:hover:bg-white/5 rounded-xl border border-border/80 dark:border-white/20 transition-all duration-200"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <item.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-foreground dark:text-white font-sans">{item.label}</div>
                      <div className="text-sm text-foreground/60 dark:text-white/60">{item.description}</div>
                    </div>
                  </a>
                ))}

                {/* Resources Section */}
                <div className="pt-4 pb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50 dark:text-white/50 px-4">Resources</div>
                </div>
                {RESOURCES_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={toggleMobileMenu}
                    className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle dark:hover:bg-white/5 rounded-xl border border-border/80 dark:border-white/20 transition-all duration-200"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <item.icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-foreground dark:text-white font-sans">{item.label}</div>
                      <div className="text-sm text-foreground/60 dark:text-white/60">{item.description}</div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* CTA Section */}
              <div className="mt-8 pt-8 border-t border-border dark:border-white/20">
                <div className="space-y-4">
                  <div className="text-center px-4 py-2 bg-emerald-500/10 rounded-lg">
                    <div className="text-sm text-emerald-500 dark:text-emerald-400 font-medium font-sans">{isSignedIn ? "Welcome Back" : "Start Free Today"}</div>
                    <div className="text-xs text-foreground/60 dark:text-white/60 font-sans">{isSignedIn ? "Continue optimizing your resume" : "No credit card required"}</div>
                  </div>

                  <Link
                    href={isSignedIn ? "/dashboard" : "/auth/signup"}
                    onClick={toggleMobileMenu}
                    className="block group relative overflow-hidden rounded-xl bg-emerald-500 px-6 py-4 text-center text-lg font-semibold text-black transition-all duration-300 hover:bg-emerald-400 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center justify-center gap-2 font-sans">
                      {isSignedIn ? "Open Dashboard" : "Get Started"}
                      <Download className="h-4 w-4" />
                    </span>
                  </Link>

                  {!isSignedIn && (
                    <Link
                      href="/auth/login"
                      onClick={toggleMobileMenu}
                      className="block text-center px-6 py-3 text-base font-medium text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white transition-colors font-sans"
                    >
                      Already have an account? Sign In
                    </Link>
                  )}
                </div>
              </div>

              {/* Capability Badges */}
              <div className="mt-8 px-4">
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/70 dark:text-white/70 font-sans">
                    AI-Powered
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/70 dark:text-white/70 font-sans">
                    ATS-Optimized
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/70 dark:text-white/70 font-sans">
                    Unlimited Versions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
