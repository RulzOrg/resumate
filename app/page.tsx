"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { RefreshCw, Upload, Target, Download, Check, Star, Plus, Menu } from "lucide-react"

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="antialiased text-white bg-black font-sans">
      {/* Background gradient */}
      <div className="absolute top-0 left-0 w-full h-[880px] -z-10 gradient-blur"></div>

      {/* Header */}
      <header className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <nav className="mt-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                <RefreshCw className="h-4 w-4" />
              </span>
              <span className="text-base font-medium tracking-tighter font-sans">ResuMate AI</span>
            </Link>

            <div className="hidden gap-1 md:flex bg-white/5 border-white/10 border rounded-full p-1 backdrop-blur items-center">
              <a
                href="#how-it-works"
                className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans"
              >
                How It Works
              </a>
              <a href="#features" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans">
                Features
              </a>
              <a href="#pricing" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans">
                Pricing
              </a>
              <a href="#faq" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans">
                FAQ
              </a>
            </div>

            <Link
              href="/auth/signup"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full ml-2 py-2 px-4 hover:bg-emerald-400 transition-colors font-sans"
            >
              Optimize My Resume
            </Link>

            <button className="md:hidden inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium backdrop-blur font-sans">
              <Menu className="h-5 w-5" />
              Menu
            </button>
          </nav>

          {/* Hero */}
          <section className="relative z-10 max-w-5xl text-center mx-auto pt-14 pb-12 sm:pt-20 md:pt-28">
            {/* Social proof */}
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="flex -space-x-3">
                <img
                  src="/images/user-1.jpg"
                  alt="User 1"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="/images/user-2.jpg"
                  alt="User 2"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="/images/user-3.jpg"
                  alt="User 3"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="/images/user-4.jpg"
                  alt="User 4"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="/images/user-5.jpg"
                  alt="User 5"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-white fill-current" />
                  ))}
                </div>
                <p className="mt-1 text-xs font-medium text-white/70 font-sans">Join 1,000+ successful job seekers</p>
              </div>
            </div>

            <h1 className="text-4xl tracking-tight sm:text-6xl md:text-7xl mx-auto font-space-grotesk font-semibold">
              <span
                className="text-white font-space-grotesk font-semibold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Tailor-fit
              </span>{" "}
              your resume for any job, instantly.
            </h1>

            <p className="max-w-2xl text-base sm:text-lg font-normal text-white/70 mt-6 mx-auto font-sans">
              Our AI-powered platform analyzes job descriptions to rewrite your resume, dramatically increasing your
              chances of landing an interview.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row mt-8 items-center justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] text-base font-medium text-black bg-emerald-500 rounded-full py-3 px-6 hover:bg-emerald-400 transition-colors font-sans"
              >
                Get Started for Free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-base font-medium text-white/90 backdrop-blur hover:bg-white/10 font-sans"
              >
                Learn More
              </a>
            </div>
          </section>
        </div>
      </header>

      {/* Trusted by */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 mt-16 sm:mt-24">
        <p className="mb-8 text-center text-sm font-medium text-white/50 font-sans">
          OUR USERS GET NOTICED BY TOP COMPANIES
        </p>
        <div className="grid grid-cols-2 items-center justify-items-center gap-y-8 gap-x-4 sm:grid-cols-3 md:grid-cols-6">
          <div className="h-7 w-auto text-white/40 flex items-center justify-center text-lg font-bold">Google</div>
          <div className="h-6 w-auto text-white/40 flex items-center justify-center text-lg font-bold">Meta</div>
          <div className="h-7 w-auto text-white/40 flex items-center justify-center text-lg font-bold">Amazon</div>
          <div className="h-6 w-auto text-white/40 flex items-center justify-center text-lg font-bold">Netflix</div>
          <div className="h-6 w-auto text-white/40 flex items-center justify-center text-lg font-bold">Microsoft</div>
          <div className="h-7 w-auto text-white/40 flex items-center justify-center text-lg font-bold">Apple</div>
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
              <p className="mt-4 text-base text-white/70 font-sans">
                Stop sending the same resume everywhere. Our platform makes it effortless to create a perfectly tailored
                application for every opportunity, boosting your visibility to recruiters and hiring managers.
              </p>
              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <Upload className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">1. Upload Your Resume</h3>
                    <p className="mt-1 text-sm text-white/60 font-sans">
                      Start with your existing resume. We accept PDF and DOCX formats.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <Target className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">2. Add Job URLs</h3>
                    <p className="mt-1 text-sm text-white/60 font-sans">
                      Paste links to the jobs you're targeting. Our AI analyzes every detail.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <Download className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">3. Generate & Download</h3>
                    <p className="mt-1 text-sm text-white/60 font-sans">
                      Get multiple, optimized resume versions ready to impress.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-white/10 border rounded-2xl overflow-hidden">
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
              Beat the bots and impress recruiters.
            </h2>
            <p className="mt-3 text-base text-white/70 font-sans">
              Powerful features designed to get your resume past Applicant Tracking Systems (ATS) and into human hands.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:col-span-2 md:row-span-2 p-6 flex flex-col">
            <div className="relative flex-1">
              <h3 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
                AI-Powered Optimization
              </h3>
              <p className="mt-2 text-sm sm:text-base text-white/70 font-sans">
                Our AI doesn't just stuff keywords. It intelligently rewrites your experience to match the core
                competencies and skills required by the job description, using language that recruiters love.
              </p>
            </div>
            <div className="mt-6 rounded-lg overflow-hidden border border-white/10">
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

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-medium tracking-tight flex items-center gap-2 font-sans">
              ATS-Friendly Templates
            </h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Choose from a library of professionally designed templates, all proven to be compatible with modern
              Applicant Tracking Systems.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
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

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-medium tracking-tight flex items-center gap-2 font-sans">
              Instant Resume Score
            </h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Get a real-time score on how well your resume matches a job. Track your improvements and know when it's
              ready.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
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

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">
              Unlimited Job Targeting
            </h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Generate as many tailored resume versions as you need. Our platform keeps them organized for you.
            </p>
          </div>

          <div className="relative overflow-hidden bg-white/5 border-white/10 border rounded-2xl p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">
              Impactful Bullet Points
            </h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Turn bland descriptions into powerful, achievement-oriented statements with AI suggestions.
            </p>
          </div>

          <div className="relative overflow-hidden bg-white/5 border-white/10 border rounded-2xl p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">
              Cover Letter Generator
            </h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Create compelling cover letters that complement your resume and target the specific role.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">
              From hundreds of applications to multiple offers.
            </h2>
            <p className="mt-4 text-base text-white/70 font-sans">
              Hear from job seekers who transformed their job search with ResuMate AI.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative overflow-hidden p-6 bg-white/5 border-white/10 border rounded-2xl backdrop-blur-xl">
              <p className="text-base text-white/80 font-sans">
                "I was applying for months with no luck. After using ResuMate AI, I got three interview requests in the
                first week. The AI's ability to match my skills to the job description was a game-changer."
              </p>
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                <img
                  src="/images/testimonial-1.jpg"
                  alt="Alex Johnson avatar"
                  className="h-10 w-10 object-cover rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold tracking-tight font-sans">Alex Johnson</p>
                  <p className="text-xs text-white/60 font-sans">Software Engineer</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden p-6 bg-white/5 border-white/10 border rounded-2xl backdrop-blur-xl">
              <p className="text-base text-white/80 font-sans">
                "As a creative, it's hard to quantify my impact. This tool helped me rephrase my experience with
                powerful action verbs and metrics. I finally got past the ATS and landed my dream role at a top agency."
              </p>
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                <img
                  src="/images/testimonial-2.jpg"
                  alt="Maria Garcia avatar"
                  className="h-10 w-10 object-cover rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold tracking-tight font-sans">Maria Garcia</p>
                  <p className="text-xs text-white/60 font-sans">Senior UX Designer</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden p-6 bg-white/5 border-white/10 border rounded-2xl backdrop-blur-xl">
              <p className="text-base text-white/80 font-sans">
                "The time savings alone are worth it. Instead of spending hours tweaking my resume for each application,
                I can generate a perfectly tailored version in seconds. My interview rate has skyrocketed."
              </p>
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                <img
                  src="/images/testimonial-3.jpg"
                  alt="David Chen avatar"
                  className="h-10 w-10 object-cover rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold tracking-tight font-sans">David Chen</p>
                  <p className="text-xs text-white/60 font-sans">Marketing Director</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 px-4">
        <div className="relative max-w-7xl mx-auto">
          <div className="relative max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl text-white tracking-tight font-space-grotesk font-semibold">
              Simple, affordable pricing.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl mx-auto font-sans">
              Invest in your career without breaking the bank. Start for free and upgrade when you're ready for
              unlimited power.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Free */}
            <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="flex-1">
                <h3 className="text-xl text-white font-medium tracking-tight font-sans">Free</h3>
                <p className="mt-4 text-sm text-white/70 font-sans">Perfect for getting started with AI resume optimization.</p>
                <div className="mt-6 flex items-end gap-2">
                  <p className="text-4xl sm:text-5xl text-white tracking-tight font-space-grotesk font-semibold">$0</p>
                </div>
              </div>
              <ul className="mt-8 space-y-4 text-sm">
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">3 resume optimizations / mo</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Basic job analysis</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">ATS compatibility check</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Standard templates</span></li>
              </ul>
              <Link href="/auth/signup" className="mt-8 inline-flex items-center justify-center h-11 w-full rounded-full bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition font-sans">Get Started</Link>
            </article>

            {/* Pro */}
            <article className="relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-white/5 p-8 ring-1 ring-emerald-500">
              <div className="absolute top-0 right-0 m-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 font-sans">Most Popular</div>
              <div className="flex-1">
                <h3 className="text-xl text-white font-medium tracking-tight font-sans">Pro</h3>
                <p className="mt-4 text-sm text-white/70 font-sans">Ideal for active job seekers and career changers.</p>
                <div className="mt-6 flex items-end gap-2">
                  <p className="text-4xl sm:text-5xl text-white tracking-tight font-space-grotesk font-semibold">$19</p>
                  <span className="text-white/70 text-sm mb-2 font-sans">/ month</span>
                </div>
              </div>
              <ul className="mt-8 space-y-4 text-sm">
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Unlimited resume optimizations</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Advanced job analysis</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">AI cover letter generator</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Premium templates</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Priority email support</span></li>
              </ul>
              <Link href="/auth/signup" className="mt-8 inline-flex items-center justify-center h-11 w-full rounded-full bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition font-sans">Choose Pro</Link>
            </article>

            {/* Enterprise */}
            <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="flex-1">
                <h3 className="text-xl text-white font-medium tracking-tight font-sans">Enterprise</h3>
                <p className="mt-4 text-sm text-white/70 font-sans">For professionals and teams who need the best.</p>
                <div className="mt-6 flex items-end gap-2">
                  <p className="text-4xl sm:text-5xl text-white tracking-tight font-space-grotesk font-semibold">$49</p>
                  <span className="text-white/70 text-sm mb-2 font-sans">/ month</span>
                </div>
              </div>
              <ul className="mt-8 space-y-4 text-sm">
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Everything in Pro</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Team collaboration</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">API access</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Advanced analytics</span></li>
                <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><span className="text-white/90 font-sans">Dedicated account manager</span></li>
              </ul>
              <a href="mailto:sales@resumeai.com?subject=Enterprise Plan Inquiry" className="mt-8 inline-flex items-center justify-center h-11 w-full rounded-full bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition font-sans">Contact Sales</a>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative overflow-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base text-white/70 font-sans">Everything you need to know about ResuMate AI.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "How does the AI work?",
                answer:
                  "Our platform uses advanced large language models (LLMs) trained on millions of successful resumes and job descriptions. It analyzes the specific requirements of a job and cross-references them with your experience to rewrite your resume for maximum impact and ATS compatibility.",
              },
              {
                question: "Is my data private and secure?",
                answer:
                  "Absolutely. We take data privacy very seriously. Your resume and personal information are encrypted and are never used for training AI models. You have full control over your data and can delete it at any time.",
              },
              {
                question: "Does this guarantee I will get a job?",
                answer:
                  "While we can't guarantee a job (as that depends on many factors like your interview skills and qualifications), ResuMate AI is designed to significantly increase your chances of getting shortlisted for an interview. Our users report a dramatic increase in response rates from employers.",
              },
              {
                question: "Can I cancel my subscription anytime?",
                answer:
                  "Yes, you can cancel your monthly subscription at any time through your account dashboard. There are no long-term contracts or hidden fees. You will retain access to Pro features until the end of your current billing period.",
              },
            ].map((faq, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <button
                  className="w-full p-5 text-left flex items-center justify-between"
                  onClick={() => toggleFaq(index)}
                >
                  <h3 className="text-base font-medium pr-4 font-sans">{faq.question}</h3>
                  <span
                    className={`flex-shrink-0 w-5 h-5 text-white/60 transition-transform duration-300 ${openFaq === index ? "rotate-45" : ""}`}
                  >
                    <Plus className="w-5 h-5" />
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? "max-h-96" : "max-h-0"}`}
                >
                  <p className="px-5 pb-5 pt-0 text-sm text-white/70 font-sans">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-white/50 font-sans">© 2025 ResuMate AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/60 hover:text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
