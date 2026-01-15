"use client"

import { FileSearch, FileText, BarChart3, Layout, Search, Download } from "lucide-react"

const FEATURES = [
  {
    title: "ATS Compatibility Audit",
    description:
      "We scan structure, sections, fonts, tables, and graphics that could break parsing. Identify blockers and get clear steps to fix them.",
    icon: FileSearch,
    large: true,
  },
  {
    title: "Parsing Readiness",
    description:
      "Detect elements that confuse ATS parsing like columns, headers/footers, icons, and images.",
    icon: FileText,
  },
  {
    title: "Instant Resume Score",
    description:
      "See a quick score of ATS readiness and priority fixes to improve it.",
    icon: BarChart3,
  },
  {
    title: "Formatting Checks",
    description:
      "Flags for tables, text boxes, unusual fonts, and layout issues.",
    icon: Layout,
  },
  {
    title: "Keyword Coverage",
    description:
      "High-level signals on skills and terms commonly scanned by ATS.",
    icon: Search,
  },
  {
    title: "Exportable Fix List",
    description:
      "Receive a concise list of changes you can apply in minutes.",
    icon: Download,
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold text-slate-900 dark:text-white">
            Ensure ATS compatibility before you apply.
          </h2>
          <p className="mt-3 text-base text-slate-500 dark:text-muted-foreground font-sans">
            Automated checks for formatting, parsing, and keyword alignment so
            your resume is machine-readable and recruiter-friendly.
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <div
            key={index}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-6 transition-all duration-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 ${
              feature.large ? "md:col-span-2 md:row-span-2" : ""
            }`}
          >
            <div className={feature.large ? "relative flex-1" : ""}>
              <div className="flex items-center gap-2 mb-2">
                <feature.icon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                <h3
                  className={`font-medium tracking-tight font-sans text-slate-900 dark:text-white ${
                    feature.large ? "text-2xl sm:text-3xl" : "text-lg"
                  }`}
                >
                  {feature.title}
                </h3>
              </div>
              <p
                className={`text-slate-500 dark:text-muted-foreground font-sans ${
                  feature.large ? "text-sm sm:text-base mt-2" : "text-sm mt-2"
                }`}
              >
                {feature.description}
              </p>
            </div>

            {/* Large card decorative element */}
            {feature.large && (
              <div className="mt-6 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-gradient-to-br from-emerald-100 dark:from-emerald-500/10 via-transparent to-transparent">
                <div className="aspect-[16/9] flex items-center justify-center p-8">
                  <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                    <div className="h-3 rounded-full bg-emerald-400 dark:bg-emerald-500/40" />
                    <div className="h-3 rounded-full bg-emerald-300 dark:bg-emerald-500/30" />
                    <div className="h-3 rounded-full bg-emerald-200 dark:bg-emerald-500/20" />
                    <div className="col-span-2 h-3 rounded-full bg-slate-200 dark:bg-white/10" />
                    <div className="h-3 rounded-full bg-slate-200 dark:bg-white/10" />
                    <div className="h-3 rounded-full bg-emerald-300 dark:bg-emerald-500/30" />
                    <div className="col-span-2 h-3 rounded-full bg-emerald-200 dark:bg-emerald-500/20" />
                  </div>
                </div>
              </div>
            )}

            {/* Hover glow effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute -inset-px bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
