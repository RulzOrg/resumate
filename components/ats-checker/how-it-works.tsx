"use client"

import { Upload, Mail, CheckCircle } from "lucide-react"

const STEPS = [
  {
    icon: Upload,
    title: "1. Upload your resume",
    description: "Drop a PDF or DOCX and we'll run instant ATS checks.",
  },
  {
    icon: Mail,
    title: "2. Enter your email",
    description: "We'll send your personalized findings and recommendations.",
  },
  {
    icon: CheckCircle,
    title: "3. Get your ATS report",
    description: "Receive a clear summary with fixes you can apply right away.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold text-foreground">
              Check ATS readiness in three quick steps.
            </h2>
            <p className="mt-4 text-base text-muted-foreground font-sans">
              Verify your resume's basic ATS compatibility and formatting issues
              before applying. Get clear, actionable guidance by email.
            </p>

            <div className="mt-8 space-y-6">
              {STEPS.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-muted border border-border">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground font-sans">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground/80 font-sans">
                    ATS Analysis Ready
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1 font-sans">
                    Get instant feedback on your resume
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-border" />
          </div>
        </div>
      </div>
    </section>
  )
}
