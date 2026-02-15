"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

const FAQS = [
  {
    question: "What will the health check analyze?",
    answer:
      "We assess ATS parsing readiness (tables, columns, graphics), structure and headings, font usage, section ordering, and basic keyword coverage signals. You'll receive a concise report with fixes.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. Your file is processed securely and is not used to train AI models. You can request deletion at any time.",
  },
  {
    question: "Will this guarantee passing every ATS?",
    answer:
      "No tool can guarantee that, since ATS systems vary. Our checks address common parsing pitfalls and provide practical fixes to improve compatibility.",
  },
  {
    question: "How long does it take to get my report?",
    answer:
      "Typically within minutes. We'll email your ATS health check to the address you provide.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="relative overflow-hidden pt-16 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-space-grotesk font-semibold text-foreground">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base text-muted-foreground font-sans">
            Everything you need to know about the Resume Health Check.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-border bg-card"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full p-5 text-left flex items-center justify-between hover:bg-accent transition-colors"
              >
                <h3 className="text-base font-medium pr-4 font-sans text-foreground">
                  {faq.question}
                </h3>
                <span
                  className={cn(
                    "flex-shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-300",
                    openIndex === index && "rotate-180"
                  )}
                >
                  {openIndex === index ? (
                    <Minus className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </span>
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}
              >
                <p className="px-5 pb-5 pt-0 text-sm text-muted-foreground font-sans">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
