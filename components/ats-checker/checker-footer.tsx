"use client"

import Link from "next/link"
import { Twitter, Linkedin } from "lucide-react"

export function CheckerFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm text-slate-500 dark:text-muted-foreground font-sans">
            © {currentYear} Useresumate. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors"
            >
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
