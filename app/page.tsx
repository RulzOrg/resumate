"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Upload, Target, Download, Check, Star, Plus, Menu, RefreshCw, FileSearch, ChevronDown } from "lucide-react"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { Logo } from "@/components/ui/logo"
import { ProCheckoutButton } from "@/components/pricing/pro-checkout-button"
import { useAuth } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ResourcesMegaMenu, RESOURCES_ITEMS } from "@/components/resources-mega-menu"

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Useresumate",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "AI-powered resume optimization platform that creates ATS-friendly tailored resumes for multiple job applications",
  url: "https://www.useresumate.com",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan with 3 resume optimizations per month"
  },
  featureList: [
    "AI Resume Optimization",
    "ATS-Friendly Formatting", 
    "Multiple Resume Versions",
    "Job-Specific Tailoring",
    "Cover Letter Generation",
    "ATS Score Checking"
  ],
}

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is an ATS and why does my resume need to be ATS-friendly?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ATS (Applicant Tracking Systems) are software used by 98% of employers to filter resumes automatically. These systems scan resumes for specific keywords, formatting, and qualifications before a human ever sees them. Without ATS-optimized formatting and proper keyword placement, even highly qualified candidates get rejected. Our AI ensures your resume passes these automated filters."
      }
    },
    {
      "@type": "Question", 
      name: "How does Useresumate optimize resumes for Applicant Tracking Systems?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our AI analyzes job descriptions to extract critical keywords and skills, then strategically integrates them into your resume using natural language patterns that ATS algorithms prefer. We format your resume with clean, ATS-friendly layouts, optimize bullet points with action verbs and metrics, and ensure proper section structure that automated systems can easily parse."
      }
    },
    {
      "@type": "Question",
      name: "Can I create multiple tailored resumes for different jobs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! This is our core strength. Upload your base resume once, then generate optimized versions for different job applications. Each version is tailored to specific job descriptions while maintaining your authentic experience. Free users get 3 optimizations per month, while Pro users get unlimited optimizations."
      }
    }
  ]
}

export default function HomePage() {
  const { isSignedIn } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      
      <div className="antialiased text-foreground bg-background font-sans">
        {/* Background gradient */}
        <div className="absolute top-0 left-0 w-full h-[880px] -z-10 gradient-blur"></div>

      {/* Header */}
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
                href="#how-it-works"
                className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans"
              >
                How It Works
              </a>
              <a href="#features" className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans">
                Features
              </a>
              <a href="#pricing" className="px-4 py-2 text-sm font-medium text-foreground/90 dark:text-white/90 hover:text-foreground dark:hover:text-white font-sans">
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
                  <a
                    href="#how-it-works"
                    onClick={toggleMobileMenu}
                    className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle dark:hover:bg-white/5 rounded-xl border border-border/80 dark:border-white/20 transition-all duration-200"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <Upload className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-foreground dark:text-white font-sans">How It Works</div>
                      <div className="text-sm text-foreground/60 dark:text-white/60">Simple 3-step process</div>
                    </div>
                  </a>

                  <a
                    href="#features"
                    onClick={toggleMobileMenu}
                    className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle dark:hover:bg-white/5 rounded-xl border border-border/80 dark:border-white/20 transition-all duration-200"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <Target className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-foreground dark:text-white font-sans">Features</div>
                      <div className="text-sm text-foreground/60 dark:text-white/60">Powerful AI tools</div>
                    </div>
                  </a>

                  <a
                    href="#pricing"
                    onClick={toggleMobileMenu}
                    className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle dark:hover:bg-white/5 rounded-xl border border-border/80 dark:border-white/20 transition-all duration-200"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <Star className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-foreground dark:text-white font-sans">Pricing</div>
                      <div className="text-sm text-foreground/60 dark:text-white/60">Flexible plans</div>
                    </div>
                  </a>

                  <a
                    href="#faq"
                    onClick={toggleMobileMenu}
                    className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle dark:hover:bg-white/5 rounded-xl border border-border/80 dark:border-white/20 transition-all duration-200"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Check className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-foreground dark:text-white font-sans">FAQ</div>
                      <div className="text-sm text-foreground/60 dark:text-white/60">Common questions</div>
                    </div>
                  </a>

                  {/* Resources Section */}
                  <div className="pt-4 pb-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50 dark:text-white/50 px-4">Resources</div>
                  </div>
                  {RESOURCES_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={toggleMobileMenu}
                      className="group flex items-center gap-4 px-4 py-4 text-lg font-medium hover:bg-surface-subtle dark:hover:bg-white/5 rounded-xl border border-border/80 dark:border-white/20 transition-all duration-200"
                    >
                      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-sky-500/10 group-hover:bg-sky-500/20 transition-colors">
                        <item.icon className="h-5 w-5 text-sky-400" />
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

          {/* Hero */}
          <section className="relative z-10 max-w-5xl text-center mx-auto pt-14 pb-12 sm:pt-20 md:pt-28">
            {/* Capability badges */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-4 py-2 text-sm font-medium text-foreground/80 dark:text-white/80 font-sans">
                AI-Powered
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-4 py-2 text-sm font-medium text-foreground/80 dark:text-white/80 font-sans">
                ATS-Optimized
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-4 py-2 text-sm font-medium text-foreground/80 dark:text-white/80 font-sans">
                Unlimited Versions
              </span>
            </div>

            <h1 className="text-4xl tracking-tight sm:text-6xl md:text-7xl mx-auto font-space-grotesk font-semibold">
             Create ATS-Friendly Resume Versions for Multiple Jobs
            </h1>

            <p className="max-w-2xl text-base sm:text-lg font-normal text-foreground/70 dark:text-white/70 mt-6 mx-auto font-sans">
              Transform your job search with AI-powered resume tailoring. Generate multiple ATS-optimized resume versions for different applications, increase interview rates by 3-5x with smart keyword optimization and job-specific customization.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row mt-8 items-center justify-center">
              <Link
                href={isSignedIn ? "/dashboard" : "/auth/signup"}
                className="inline-flex items-center gap-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] text-base font-medium text-black bg-emerald-500 rounded-full py-3 px-6 hover:bg-emerald-400 transition-colors font-sans"
              >
                {isSignedIn ? "Open Dashboard" : "Get Started for Free"}
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/20 bg-surface-subtle dark:bg-white/5 px-6 py-3 text-base font-medium text-foreground/90 dark:text-white/90 backdrop-blur hover:bg-surface-muted dark:hover:bg-white/10 font-sans"
              >
                Learn More
              </a>
            </div>
          </section>
        </div>
      </header>

      {/* ATS Compatibility */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 mt-16 sm:mt-24">
        <p className="mb-8 text-center text-sm font-medium text-foreground/50 dark:text-white/50 font-sans">
          OPTIMIZED FOR MAJOR APPLICANT TRACKING SYSTEMS
        </p>
        <div className="grid grid-cols-2 items-center justify-items-center gap-y-8 gap-x-4 sm:grid-cols-3 md:grid-cols-6">
          <div className="h-7 w-auto text-foreground/40 dark:text-white/40 flex items-center justify-center text-base font-semibold font-sans">Workday</div>
          <div className="h-6 w-auto text-foreground/40 dark:text-white/40 flex items-center justify-center text-base font-semibold font-sans">Greenhouse</div>
          <div className="h-7 w-auto text-foreground/40 dark:text-white/40 flex items-center justify-center text-base font-semibold font-sans">Lever</div>
          <div className="h-6 w-auto text-foreground/40 dark:text-white/40 flex items-center justify-center text-base font-semibold font-sans">Taleo</div>
          <div className="h-6 w-auto text-foreground/40 dark:text-white/40 flex items-center justify-center text-base font-semibold font-sans">iCIMS</div>
          <div className="h-7 w-auto text-foreground/40 dark:text-white/40 flex items-center justify-center text-base font-semibold font-sans">BambooHR</div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative overflow-hidden py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">
                From generic to job-specific in three simple steps.
              </h2>
              <p className="mt-4 text-base text-foreground/70 dark:text-white/70 font-sans">
                Stop sending the same resume everywhere. Our platform makes it effortless to create a perfectly tailored
                application for every opportunity, boosting your visibility to recruiters and hiring managers.
              </p>
              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10">
                    <Upload className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">1. Upload Your Resume</h3>
                    <p className="mt-1 text-sm text-foreground/60 dark:text-white/60 font-sans">
                      Start with your existing resume. We accept PDF and DOCX formats.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10">
                    <Target className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">2. Add Job URLs</h3>
                    <p className="mt-1 text-sm text-foreground/60 dark:text-white/60 font-sans">
                      Paste links to the jobs you're targeting. Our AI analyzes every detail.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10">
                    <Download className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">3. Generate & Download</h3>
                    <p className="mt-1 text-sm text-foreground/60 dark:text-white/60 font-sans">
                      Get multiple, optimized resume versions ready to impress.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-border dark:border-white/10 border rounded-2xl overflow-hidden">
                <Image 
                  src="/images/features/hero-ui.webp" 
                  alt="AI Resume Platform UI" 
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">
              ATS-Friendly Resume Features for Multiple Job Applications
            </h2>
            <p className="mt-3 text-base text-foreground/70 dark:text-white/70 font-sans">
              Powerful AI features designed to get your resume past Applicant Tracking Systems and land more interviews. Optimize for Workday, Taleo, Greenhouse and other major ATS platforms.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 md:col-span-2 md:row-span-2 p-6 flex flex-col">
            <div className="relative flex-1">
              <h3 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
                AI-Powered Optimization
              </h3>
              <p className="mt-2 text-sm sm:text-base text-foreground/70 dark:text-white/70 font-sans">
                Our AI doesn't just stuff keywords. It intelligently rewrites your experience to match the core
                competencies and skills required by the job description, using language that recruiters love.
              </p>
            </div>
            <div className="mt-6 rounded-lg overflow-hidden border border-border dark:border-white/10">
              <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
                <Image 
                  src="/images/features/instant-resume.webp" 
                  alt="AI-Powered Optimization" 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6">
            <h3 className="text-xl font-medium tracking-tight flex items-center gap-2 font-sans">
              ATS-Friendly Templates
            </h3>
            <p className="mt-2 text-sm text-foreground/70 dark:text-white/70 font-sans">
              Choose from a library of professionally designed templates, all proven to be compatible with modern
              Applicant Tracking Systems.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-border dark:border-white/10">
              <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <Image 
                  src="/images/features/feature-templates.webp" 
                  alt="Templates" 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6">
            <h3 className="text-xl font-medium tracking-tight flex items-center gap-2 font-sans">
              Instant Resume Score
            </h3>
            <p className="mt-2 text-sm text-foreground/70 dark:text-white/70 font-sans">
              Get a real-time score on how well your resume matches a job. Track your improvements and know when it's
              ready.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-border dark:border-white/10">
              <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                <Image 
                  src="/images/features/feature-analysis.webp" 
                  alt="Instant Resume Score" 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">
              Unlimited Job Targeting
            </h3>
            <p className="mt-2 text-sm text-foreground/70 dark:text-white/70 font-sans">
              Generate as many tailored resume versions as you need. Our platform keeps them organized for you.
            </p>
          </div>

          <div className="relative overflow-hidden bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/10 border rounded-2xl p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">
              Impactful Bullet Points
            </h3>
            <p className="mt-2 text-sm text-foreground/70 dark:text-white/70 font-sans">
              Turn bland descriptions into powerful, achievement-oriented statements with AI suggestions.
            </p>
          </div>

          <div className="relative overflow-hidden bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/10 border rounded-2xl p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">
              Cover Letter Generator
            </h3>
            <p className="mt-2 text-sm text-foreground/70 dark:text-white/70 font-sans">
              Create compelling cover letters that complement your resume and target the specific role.
            </p>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">
              Why job seekers choose Useresumate
            </h2>
            <p className="mt-4 text-base text-foreground/70 dark:text-white/70 font-sans">
              Purpose-built features to help you stand out in today's competitive job market.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative overflow-hidden p-6 bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 dark:bg-white/10 border border-border/80 dark:border-white/20">
                  <Check className="h-5 w-5 text-foreground/70 dark:text-white/70" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight font-sans">Pass ATS Filters</h3>
              </div>
              <p className="text-sm text-foreground/70 dark:text-white/70 font-sans">
                98% of Fortune 500 companies use ATS. Our AI formats your resume to get through automated screening before human eyes ever see it.
              </p>
            </div>

            <div className="relative overflow-hidden p-6 bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 dark:bg-white/10 border border-border/80 dark:border-white/20">
                  <RefreshCw className="h-5 w-5 text-foreground/70 dark:text-white/70" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight font-sans">Save Hours Per Application</h3>
              </div>
              <p className="text-sm text-foreground/70 dark:text-white/70 font-sans">
                Generate tailored resumes in seconds instead of manually editing for each job. Focus your time on interview prep, not resume tweaking.
              </p>
            </div>

            <div className="relative overflow-hidden p-6 bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 dark:bg-white/10 border border-border/80 dark:border-white/20">
                  <Target className="h-5 w-5 text-foreground/70 dark:text-white/70" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight font-sans">Match Job Requirements</h3>
              </div>
              <p className="text-sm text-foreground/70 dark:text-white/70 font-sans">
                AI analyzes job descriptions and highlights relevant skills and keywords automatically, so your experience aligns with what employers want.
              </p>
            </div>

            <div className="relative overflow-hidden p-6 bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 dark:bg-white/10 border border-border/80 dark:border-white/20">
                  <Upload className="h-5 w-5 text-foreground/70 dark:text-white/70" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight font-sans">Multiple Versions, One Profile</h3>
              </div>
              <p className="text-sm text-foreground/70 dark:text-white/70 font-sans">
                Maintain unlimited resume variations for different roles without starting from scratch. Switch between versions effortlessly.
              </p>
            </div>

            <div className="relative overflow-hidden p-6 bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 dark:bg-white/10 border border-border/80 dark:border-white/20">
                  <Star className="h-5 w-5 text-foreground/70 dark:text-white/70" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight font-sans">Real-Time ATS Scoring</h3>
              </div>
              <p className="text-sm text-foreground/70 dark:text-white/70 font-sans">
                See your compatibility score before applying and improve weak areas. Know exactly how well your resume matches each position.
              </p>
            </div>

            <div className="relative overflow-hidden p-6 bg-surface-subtle dark:bg-white/5 border-border/80 dark:border-white/20 border rounded-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 dark:bg-white/10 border border-border/80 dark:border-white/20">
                  <Download className="h-5 w-5 text-foreground/70 dark:text-white/70" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight font-sans">Clean, Professional Format</h3>
              </div>
              <p className="text-sm text-foreground/70 dark:text-white/70 font-sans">
                Templates designed for both human recruiters and automated systems. Export to PDF, Word, or plain text for any application portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 px-4">
        <div className="relative max-w-7xl mx-auto">
          <div className="relative max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl text-foreground dark:text-white tracking-tight font-space-grotesk font-semibold">
              Simple, affordable pricing.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-foreground/70 dark:text-white/70 max-w-2xl mx-auto font-sans">
              Invest in your career without breaking the bank. Start for free and upgrade when you're ready for
              unlimited power.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free */}
            <article className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-8">
              <div className="flex-1">
                <h3 className="text-xl text-foreground dark:text-white font-medium tracking-tight font-sans">Free</h3>
                <p className="mt-4 text-sm text-foreground/70 dark:text-white/70 font-sans">Perfect for getting started with AI resume optimization.</p>
                <div className="mt-6 flex items-end gap-2">
                  <p className="text-4xl sm:text-5xl text-foreground dark:text-white tracking-tight font-space-grotesk font-semibold">$0</p>
                </div>
              </div>
              <ul className="mt-8 space-y-4 text-sm">
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">3 resume optimizations / month</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Basic job analysis</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">ATS compatibility check</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Export to PDF/Word</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Community support</span></li>
              </ul>
              <Link href={isSignedIn ? "/dashboard" : "/auth/signup"} className="mt-8 inline-flex items-center justify-center h-11 w-full rounded-full bg-surface-muted dark:bg-white/10 border border-border/80 dark:border-white/20 text-sm font-medium hover:bg-surface-strong dark:hover:bg-white/20 transition font-sans">{isSignedIn ? "Open Dashboard" : "Get Started"}</Link>
            </article>

            {/* Pro */}
            <article className="relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-surface-subtle dark:bg-white/5 p-8 ring-1 ring-emerald-500">
              <div className="absolute top-0 right-0 m-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 font-sans">Most Popular</div>
              <div className="flex-1">
                <h3 className="text-xl text-foreground dark:text-white font-medium tracking-tight font-sans">Pro</h3>
                <p className="mt-4 text-sm text-foreground/70 dark:text-white/70 font-sans">Ideal for active job seekers and career changers.</p>
                <div className="mt-6 flex items-end gap-2">
                  <p className="text-4xl sm:text-5xl text-foreground dark:text-white tracking-tight font-space-grotesk font-semibold">$19</p>
                  <span className="text-foreground/70 dark:text-white/70 text-sm mb-2 font-sans">/ month</span>
                </div>
              </div>
              <ul className="mt-8 space-y-4 text-sm">
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Unlimited resume optimizations</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Advanced job analysis</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">ATS compatibility check</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans flex items-center gap-2">AI cover letter generator <span className="text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 whitespace-nowrap">Coming Soon</span></span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans flex items-center gap-2">Premium templates <span className="text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 whitespace-nowrap">Coming Soon</span></span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Resume version management</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Keyword optimization</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Priority email support</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-foreground/90 dark:text-white/90 font-sans">Export to PDF/Word/TXT</span></li>
              </ul>
              <ProCheckoutButton className="mt-8 inline-flex items-center justify-center h-11 w-full rounded-full bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition font-sans disabled:opacity-50 disabled:cursor-not-allowed" />
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative overflow-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">
              Questions about AI resume optimization
            </h2>
            <p className="mt-4 text-base text-foreground/70 dark:text-white/70 font-sans">Expert answers about creating ATS-friendly resumes and landing more interviews with AI-powered tailoring.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {[
              {
                question: "What is an ATS and why does my resume need to be ATS-friendly?",
                answer:
                  "ATS (Applicant Tracking Systems) are software used by 98% of employers to filter resumes automatically. These systems scan resumes for specific keywords, formatting, and qualifications before a human ever sees them. Without ATS-optimized formatting and proper keyword placement, even highly qualified candidates get rejected. Our AI ensures your resume passes these automated filters.",
              },
              {
                question: "How does Useresumate optimize resumes for Applicant Tracking Systems?",
                answer:
                  "Our AI analyzes job descriptions to extract critical keywords and skills, then strategically integrates them into your resume using natural language patterns that ATS algorithms prefer. We format your resume with clean, ATS-friendly layouts, optimize bullet points with action verbs and metrics, and ensure proper section structure that automated systems can easily parse.",
              },
              {
                question: "Can I create multiple tailored resumes for different jobs?",
                answer:
                  "Yes! This is our core strength. Upload your base resume once, then generate optimized versions for different job applications. Each version is tailored to specific job descriptions while maintaining your authentic experience. Free users get 3 optimizations per month, while Pro users get unlimited optimizations.",
              },
              {
                question: "How many job applications can I optimize per month?",
                answer:
                  "With our free plan, you can optimize 3 resumes per month. Pro users get unlimited resume optimizations and can create multiple tailored versions for different jobs simultaneously.",
              },
              {
                question: "What file formats work best for ATS optimization?",
                answer:
                  "We recommend both PDF and DOCX formats for maximum ATS compatibility. AI-generated PDFs from our platform are specifically formatted to pass ATS scanners, while DOCX files allow for easy editing. Both formats maintain proper structure and keyword placement that automated systems can read accurately.",
              },
              {
                question: "How much can AI optimization increase my interview rate?",
                answer:
                  "While results vary by industry and qualifications, our users report dramatic increases in interview responses - many see 3-5x higher response rates after AI optimization. Tailored resumes that match job descriptions perfectly significantly outperform generic, one-size-fits-all applications.",
              },
              {
                question: "Is Useresumate better than Jobscan or Rezi?",
                answer:
                  "Unlike simple ATS scanners like Jobscan or basic builders like Rezi, Useresumate actively rewrites your content using AI, creates unlimited tailored versions, and optimizes for job specifics. We combine AI content generation, ATS formatting, and multi-application optimization in one platform, typically at better pricing.",
              },
              {
                question: "Can I try the AI resume optimizer for free?",
                answer:
                  "Yes! Our free plan includes 3 resume optimizations per month with full AI analysis and ATS scoring. You can experience our AI-powered tailoring, keyword optimization, and ATS compatibility checking without commitment. No credit card required to start optimizing your resume.",
              },
              {
                question: "How does the AI work for different industries and job types?",
                answer:
                  "Our AI leverages advanced language models with sophisticated prompts designed for resume optimization across all industries—tech, healthcare, finance, education, creative fields, and more. It adapts language style, highlights industry-specific keywords, and tailors achievements relevant to each sector's expectations and recruitment patterns.",
              },
              {
                question: "Can I check my ATS score before applying to jobs?",
                answer:
                  "Absolutely! Each optimized resume includes a match score showing how well your resume aligns with the job requirements. Our analysis checks keyword density, content relevance, and provides specific recommendations for improvement before you apply.",
              },
              {
                question: "What kind of results do users see with tailored resumes?",
                answer:
                  "Users report significant improvements in interview response rates when using tailored resumes. Optimized resumes that match job requirements consistently outperform generic versions by highlighting the skills and experiences that employers are actively seeking.",
              },
              {
                question: "How long does it take to optimize a resume for each job?",
                answer:
                  "Our AI generates optimized resumes in seconds - usually under 30 seconds per job application. This eliminates hours of manual editing and research. You can create multiple tailored resumes for different positions in minutes, compared to hours spent doing it manually.",
              },
              {
                question: "Does your AI include a cover letter generator?",
                answer:
                  "Cover letter generation is coming soon! We're developing an AI-powered cover letter feature that will complement your tailored resumes, automatically customizing cover letters for each job application using the same optimization approach that makes our resumes effective.",
              },
              {
                question: "Is my personal and resume data kept secure and private?",
                answer:
                  "Absolutely. All data is encrypted with enterprise-grade security. Resumes and personal information are never used for AI training - we use general patterns and insights, not your specific data. You maintain full control with options to export or delete your data at any time. We comply with GDPR and data protection standards.",
              },
              {
                question: "What if I need help or have questions about using the AI?",
                answer:
                  "Pro users receive priority email support with faster response times. Our comprehensive help center covers everything from basic setup to advanced optimization strategies. Most users get started successfully within minutes of creating their account.",
              },
            ].map((faq, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl border border-border/80 dark:border-white/10 bg-surface-subtle dark:bg-white/5">
                <button
                  className="w-full p-5 text-left flex items-center justify-between"
                  onClick={() => toggleFaq(index)}
                >
                  <h3 className="text-base font-medium pr-4 font-sans">{faq.question}</h3>
                  <span
                    className={`flex-shrink-0 w-5 h-5 text-foreground/60 dark:text-white/60 transition-transform duration-300 ${openFaq === index ? "rotate-45" : ""}`}
                  >
                    <Plus className="w-5 h-5" />
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? "max-h-96" : "max-h-0"}`}
                >
                  <p className="px-5 pb-5 pt-0 text-sm text-foreground/70 dark:text-white/70 font-sans">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-foreground/50 dark:text-white/50 font-sans">© {new Date().getFullYear()} Useresumate. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <Link href="/terms" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white font-sans">Terms</Link>
                <Link href="/privacy" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white font-sans">Privacy</Link>
                <Link href="/support" className="text-sm text-foreground/75 dark:text-white/75 hover:text-foreground dark:hover:text-white font-sans">Support</Link>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://www.linkedin.com/company/useresumate/" target="_blank" rel="noopener noreferrer" aria-label="Follow us on LinkedIn" className="text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}
