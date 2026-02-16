"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Menu, BookOpen, CreditCard, LayoutDashboard, X } from "lucide-react"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { Logo } from "@/components/ui/logo"
import { useAuth } from "@clerk/nextjs"

export function SiteHeader() {
  const { isSignedIn } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  // Body scroll lock
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!mobileMenuOpen) return

    // Focus the close button when menu opens
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
        menuButtonRef.current?.focus()
        return
      }

      // Focus trap - Tab key
      if (e.key === 'Tab' && menuPanelRef.current) {
        const focusableElements = menuPanelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-3 py-2 backdrop-blur"
          >
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden gap-1 md:flex bg-surface-subtle border-border border rounded-full p-1 backdrop-blur items-center">
            <Link
              href="/blog"
              className="px-4 py-2 text-sm font-medium text-foreground/90 hover:text-foreground transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="px-4 py-2 text-sm font-medium text-foreground/90 hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeSwitcher />
            <Link
              href={isSignedIn ? "/dashboard" : "/auth/signup"}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground bg-primary rounded-full py-2 px-4 hover:bg-primary/90 transition-colors"
            >
              {isSignedIn ? "Dashboard" : "Get Started"}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            ref={menuButtonRef}
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            className="md:hidden inline-flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-sm font-medium backdrop-blur"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />

        {/* Slide-in Panel */}
        <div
          ref={menuPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className={`fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-background backdrop-blur-xl border-l border-border transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <Link
              href="/"
              onClick={toggleMobileMenu}
              className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-3 py-2 backdrop-blur"
            >
              <Logo size="sm" />
            </Link>
            <button
              ref={closeButtonRef}
              onClick={toggleMobileMenu}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-surface-subtle transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6 text-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <div className="py-6 px-6 overflow-y-auto max-h-[calc(100vh-88px)]">
            <div className="space-y-3">
              <Link
                href="/blog"
                onClick={toggleMobileMenu}
                className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle rounded-xl border border-border transition-all duration-200"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-foreground">Blog</div>
                  <div className="text-sm text-muted-foreground">Career tips & guides</div>
                </div>
              </Link>

              <Link
                href="/pricing"
                onClick={toggleMobileMenu}
                className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle rounded-xl border border-border transition-all duration-200"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <CreditCard className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="text-foreground">Pricing</div>
                  <div className="text-sm text-muted-foreground">Flexible plans</div>
                </div>
              </Link>

              {isSignedIn && (
                <Link
                  href="/dashboard"
                  onClick={toggleMobileMenu}
                  className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle rounded-xl border border-border transition-all duration-200"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <LayoutDashboard className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-foreground">Dashboard</div>
                    <div className="text-sm text-muted-foreground">Manage your resumes</div>
                  </div>
                </Link>
              )}
            </div>

            {/* CTA Section */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeSwitcher />
                </div>

                {!isSignedIn && (
                  <Link
                    href="/auth/signup"
                    onClick={toggleMobileMenu}
                    className="block rounded-xl bg-primary px-6 py-4 text-center text-lg font-semibold text-primary-foreground transition-all duration-300 hover:bg-primary/90 active:scale-95"
                  >
                    Get Started Free
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
