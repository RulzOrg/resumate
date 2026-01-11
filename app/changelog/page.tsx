import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { RefreshCw, ArrowLeft, Sparkles, Wrench, Bug, ChevronRight } from "lucide-react"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { changelogEntries, type ChangelogEntry } from "@/lib/changelog-data"

export const metadata: Metadata = {
  title: "Changelog | ResuMate AI",
  description: "See what's new in ResuMate AI. Track all updates, new features, and improvements to our AI-powered resume optimization platform.",
  openGraph: {
    title: "Changelog | ResuMate AI",
    description: "See what's new in ResuMate AI. Track all updates, new features, and improvements.",
    type: "website",
  },
}

function getTypeIcon(type: ChangelogEntry["type"]) {
  switch (type) {
    case "major":
      return <Sparkles className="h-4 w-4" />
    case "minor":
      return <Wrench className="h-4 w-4" />
    case "patch":
      return <Bug className="h-4 w-4" />
  }
}

function getTypeLabel(type: ChangelogEntry["type"]) {
  switch (type) {
    case "major":
      return "Major Release"
    case "minor":
      return "Feature Update"
    case "patch":
      return "Bug Fix"
  }
}

function getTypeColor(type: ChangelogEntry["type"]) {
  switch (type) {
    case "major":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    case "minor":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30"
    case "patch":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30"
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function ChangelogPage() {
  return (
    <div className="antialiased text-foreground bg-background font-sans min-h-screen">
      {/* Background gradient */}
      <div className="absolute top-0 left-0 w-full h-[600px] -z-10 gradient-blur"></div>

      {/* Header */}
      <header className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <nav className="mt-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 backdrop-blur"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                <RefreshCw className="h-4 w-4" />
              </span>
              <span className="text-base font-medium tracking-tighter font-sans">ResuMate AI</span>
            </Link>

            <div className="hidden gap-1 md:flex bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-full p-1 backdrop-blur items-center">
              <Link
                href="/#how-it-works"
                className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans"
              >
                How It Works
              </Link>
              <Link
                href="/#features"
                className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans"
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans"
              >
                Pricing
              </Link>
              <Link
                href="/changelog"
                className="px-4 py-2 text-sm font-medium text-emerald-400 font-sans"
              >
                Changelog
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors font-sans"
              >
                Open Dashboard
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white mb-8 transition-colors font-sans"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* Page Header */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-sans">
                v{changelogEntries[0]?.version}
              </div>
              <span className="text-sm text-foreground/50 dark:text-white/50 font-sans">Latest</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight font-space-grotesk font-semibold mb-4">
              Changelog
            </h1>
            <p className="text-lg text-foreground/70 dark:text-white/70 max-w-2xl font-sans">
              All the latest updates, improvements, and fixes to ResuMate AI.
              We're constantly working to make your resume optimization experience better.
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-0 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 via-border/50 dark:via-white/10 to-transparent"></div>

            {/* Changelog Entries */}
            <div className="space-y-16">
              {changelogEntries.map((entry, index) => (
                <article key={entry.version} className="relative pl-8 sm:pl-20">
                  {/* Timeline Dot */}
                  <div className="absolute left-0 sm:left-8 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"></div>

                  {/* Version Badge & Date */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(entry.type)} font-sans`}>
                      {getTypeIcon(entry.type)}
                      {getTypeLabel(entry.type)}
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 font-sans">
                      v{entry.version}
                    </div>
                    <time className="text-sm text-foreground/50 dark:text-white/50 font-sans">
                      {formatDate(entry.date)}
                    </time>
                  </div>

                  {/* Entry Card */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
                    {/* Highlight for first entry */}
                    {index === 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-blue-500"></div>
                    )}

                    <h2 className="text-xl sm:text-2xl font-medium tracking-tight mb-3 font-space-grotesk">
                      {entry.title}
                    </h2>
                    <p className="text-foreground/70 dark:text-white/70 mb-6 font-sans">
                      {entry.description}
                    </p>

                    {/* Screenshot */}
                    {entry.screenshot && (
                      <div className="mb-6 rounded-xl overflow-hidden border border-border dark:border-white/10 bg-gradient-to-br from-emerald-500/5 to-blue-500/5">
                        <div className="relative aspect-video w-full">
                          <Image
                            src={entry.screenshot}
                            alt={`${entry.title} screenshot`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 800px"
                          />
                        </div>
                      </div>
                    )}

                    {/* Features List */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-foreground/50 dark:text-white/50 uppercase tracking-wider font-sans">
                        What's New
                      </h3>
                      <ul className="space-y-4">
                        {entry.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex gap-4">
                            <div className="flex-shrink-0 mt-1">
                              <ChevronRight className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="font-medium mb-1 font-sans">{feature.title}</h4>
                              <p className="text-sm text-foreground/60 dark:text-white/60 font-sans">
                                {feature.description}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* End of Timeline */}
            <div className="relative pl-8 sm:pl-20 pt-16">
              <div className="absolute left-0 sm:left-8 -translate-x-1/2 w-4 h-4 rounded-full bg-surface-subtle dark:bg-white/5 border-2 border-border/80 dark:border-white/20"></div>
              <p className="text-sm text-foreground/40 dark:text-white/40 font-sans">
                The beginning of ResuMate AI
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-24 relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-gradient-to-br from-emerald-500/10 via-surface-subtle dark:via-white/5 to-blue-500/10 p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight mb-4 font-space-grotesk">
              Ready to optimize your resume?
            </h2>
            <p className="text-foreground/70 dark:text-white/70 mb-8 max-w-md mx-auto font-sans">
              Join thousands of job seekers using AI to land more interviews.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 text-base font-medium text-black bg-emerald-500 rounded-full py-3 px-8 hover:bg-emerald-400 transition-colors font-sans"
              >
                Get Started Free
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border/80 dark:border-white/20 bg-surface-subtle dark:bg-white/5 px-8 py-3 text-base font-medium text-foreground/90 dark:text-white/90 backdrop-blur hover:bg-surface-muted dark:hover:bg-white/10 font-sans"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border dark:border-white/10 mt-24">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-foreground/50 dark:text-white/50 font-sans">
              © {new Date().getFullYear()} ResuMate AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <Link href="/terms" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white font-sans">
                  Terms
                </Link>
                <Link href="/privacy" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white font-sans">
                  Privacy
                </Link>
                <Link href="/support" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white font-sans">
                  Support
                </Link>
                <Link href="/changelog" className="text-sm text-emerald-400 hover:text-emerald-300 font-sans">
                  Changelog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
