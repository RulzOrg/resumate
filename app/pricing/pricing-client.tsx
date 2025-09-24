"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Zap, Star, Check, Minus, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PricingCard } from "@/components/pricing/pricing-card"
import { PricingTier } from "@/lib/pricing"

interface PricingClientProps {
  currentPlan?: string
  pricingTiers: PricingTier[]
  annualPricingTiers: PricingTier[]
}

export function PricingClient({ currentPlan, pricingTiers, annualPricingTiers }: PricingClientProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>("monthly")

  const currentTiers = useMemo(() => (
    billingCycle === 'annual' ? [pricingTiers[0], ...annualPricingTiers] : pricingTiers
  ), [billingCycle, pricingTiers, annualPricingTiers])

  const toggleTransform = billingCycle === 'monthly' ? 'translateX(0%)' : 'translateX(100%)'

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
                <Zap className="h-4 w-4" />
              </span>
              <span className="text-base font-medium tracking-tighter">ResuMate AI</span>
            </Link>

            <div className="hidden gap-1 md:flex bg-white/5 border-white/10 border rounded-full p-1 backdrop-blur items-center">
              <Link href="/#features" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white">Features</Link>
              <Link href="/pricing" className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-full">Pricing</Link>
              <Link href="/#" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white">Testimonials</Link>
              <Link href="#faq" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white">FAQ</Link>
            </div>

            <Link
              href="/auth/signup"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full ml-2 py-2 px-4 hover:bg-emerald-400 transition-colors"
            >
              Get Started
            </Link>

            <button className="md:hidden inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium backdrop-blur">
              <Menu className="h-5 w-5" />
              Menu
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section id="pricing" className="py-16 sm:py-24 px-4">
        <div className="relative max-w-7xl mx-auto">
          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl text-white tracking-tight font-space-grotesk font-semibold">
              Find the plan that's right for you.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
              Invest in your career without breaking the bank. Start for free and upgrade when you're ready for unlimited power.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex justify-center mt-10">
            <div className="relative flex items-center p-1 bg-white/5 border border-white/10 rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 text-sm font-medium rounded-full z-10 transition-colors duration-300 ${billingCycle === 'monthly' ? 'text-white' : 'text-white/60'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 text-sm font-medium rounded-full z-10 transition-colors duration-300 ${billingCycle === 'annual' ? 'text-white' : 'text-white/60'}`}
              >
                Yearly
              </button>
              <div
                className="absolute h-10 w-1/2 bg-white/10 rounded-full transition-transform duration-300 ease-in-out"
                style={{ transform: toggleTransform }}
              ></div>
              <span className="absolute top-1/2 -translate-y-1/2 right-4 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5">
                Save 17%
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="relative max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentTiers.map((tier, index) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                billingCycle={billingCycle}
                currentPlan={currentPlan}
                popular={tier.popular || index === 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">Compare all features</h2>
            <p className="mt-4 text-base text-white/70">See exactly what you'll get with each plan.</p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <div className="min-w-full w-max md:w-full">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 pb-4 border-b border-white/10">
                <div className="text-base font-medium text-white/90">Features</div>
                <div className="text-center text-base font-medium text-white/90">Free</div>
                <div className="text-center text-base font-medium text-white/90">Pro</div>
                <div className="text-center text-base font-medium text-white/90">Enterprise</div>
              </div>

              {/* Feature Rows */}
              <div className="divide-y divide-white/10">
                <div className="grid grid-cols-4 gap-4 py-5 items-center">
                  <div className="text-sm text-white/80">AI Resume Generations</div>
                  <div className="text-center text-sm text-white/90">3 Total</div>
                  <div className="text-center text-sm text-white/90">Unlimited</div>
                  <div className="text-center text-sm text-white/90">Unlimited</div>
                </div>
                <div className="grid grid-cols-4 gap-4 py-5 items-center">
                  <div className="text-sm text-white/80">AI Cover Letter Generator</div>
                  <div className="text-center"><Minus className="h-5 w-5 text-white/40 mx-auto" /></div>
                  <div className="text-center"><Check className="h-5 w-5 text-emerald-400 mx-auto" /></div>
                  <div className="text-center"><Check className="h-5 w-5 text-emerald-400 mx-auto" /></div>
                </div>
                <div className="grid grid-cols-4 gap-4 py-5 items-center">
                  <div className="text-sm text-white/80">Advanced Job Analysis</div>
                  <div className="text-center"><Minus className="h-5 w-5 text-white/40 mx-auto" /></div>
                  <div className="text-center"><Check className="h-5 w-5 text-emerald-400 mx-auto" /></div>
                  <div className="text-center"><Check className="h-5 w-5 text-emerald-400 mx-auto" /></div>
                </div>
                <div className="grid grid-cols-4 gap-4 py-5 items-center">
                  <div className="text-sm text-white/80">Premium Templates</div>
                  <div className="text-center"><Minus className="h-5 w-5 text-white/40 mx-auto" /></div>
                  <div className="text-center"><Check className="h-5 w-5 text-emerald-400 mx-auto" /></div>
                  <div className="text-center"><Check className="h-5 w-5 text-emerald-400 mx-auto" /></div>
                </div>
                <div className="grid grid-cols-4 gap-4 py-5 items-center">
                  <div className="text-sm text-white/80">Team Management</div>
                  <div className="text-center"><Minus className="h-5 w-5 text-white/40 mx-auto" /></div>
                  <div className="text-center"><Minus className="h-5 w-5 text-white/40 mx-auto" /></div>
                  <div className="text-center"><Check className="h-5 w-5 text-emerald-400 mx-auto" /></div>
                </div>
                <div className="grid grid-cols-4 gap-4 py-5 items-center">
                  <div className="text-sm text-white/80">Support</div>
                  <div className="text-center text-sm text-white/90">Community</div>
                  <div className="text-center text-sm text-white/90">Priority Email</div>
                  <div className="text-center text-sm text-white/90">Dedicated Manager</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">From hundreds of applications to multiple offers.</h2>
            <p className="mt-4 text-base text-white/70">Hear from job seekers who transformed their job search with ResuMate AI.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative overflow-hidden p-6 bg-white/5 border-white/10 border rounded-2xl backdrop-blur-xl">
              <p className="text-base text-white/80">"I was applying for months with no luck. After using ResuMate AI, I got three interview requests in the first week. The AI's ability to match my skills to the job description was a game-changer."</p>
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                <img src="/images/testimonial-1.jpg" alt="Alex Johnson avatar" className="h-10 w-10 object-cover rounded-full" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">Alex Johnson</p>
                  <p className="text-xs text-white/60">Software Engineer</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden p-6 bg-white/5 border-white/10 border rounded-2xl backdrop-blur-xl">
              <p className="text-base text-white/80">"As a creative, it's hard to quantify my impact. This tool helped me rephrase my experience with powerful action verbs and metrics. I finally got past the ATS and landed my dream role at a top agency."</p>
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                <img src="/images/testimonial-2.jpg" alt="Maria Garcia avatar" className="h-10 w-10 object-cover rounded-full" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">Maria Garcia</p>
                  <p className="text-xs text-white/60">Senior UX Designer</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden p-6 bg-white/5 border-white/10 border rounded-2xl backdrop-blur-xl">
              <p className="text-base text-white/80">"The time savings alone are worth it. Instead of spending hours tweaking my resume for each application, I can generate a perfectly tailored version in seconds. My interview rate has skyrocketed."</p>
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                <img src="/images/testimonial-3.jpg" alt="David Chen avatar" className="h-10 w-10 object-cover rounded-full" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">David Chen</p>
                  <p className="text-xs text-white/60">Marketing Director</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative overflow-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold">Frequently asked questions</h2>
            <p className="mt-4 text-base text-white/70">Everything you need to know about our plans and billing.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "What's the difference between the Free and Pro plans?",
                a: "The Free plan is a great way to start, offering 3 total resume generations. The Pro plan unlocks unlimited generations, advanced job analysis, AI cover letter creation, premium templates, and priority support, giving you a significant advantage in your job search.",
              },
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Yes, you can easily change your plan at any time from your account settings. When you upgrade, you'll be charged a prorated amount for the remainder of the current billing cycle. Downgrades take effect at the end of your current cycle.",
              },
              {
                q: "How do I cancel my subscription?",
                a: "You can cancel your subscription at any time with a single click in your account dashboard. There are no cancellation fees. You will retain access to Pro features until the end of your current billing period.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, including Visa, Mastercard, and American Express. All payments are processed securely through Stripe.",
              },
            ].map((item, idx) => (
              <details key={idx} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <summary className="w-full p-5 text-left flex items-center justify-between cursor-pointer list-none">
                  <h3 className="text-base font-medium pr-4">{item.q}</h3>
                  <span className="flex-shrink-0 w-5 h-5 text-white/60 transition-transform duration-300 group-open:rotate-45">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                  </span>
                </summary>
                <div className="overflow-hidden transition-all duration-300 ease-in-out">
                  <p className="px-5 pb-5 pt-0 text-sm text-white/70">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-white/50">© {new Date().getFullYear()} ResuMate AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/60 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}


