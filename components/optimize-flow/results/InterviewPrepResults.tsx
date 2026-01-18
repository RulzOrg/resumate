"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  MessageSquare,
  Lightbulb,
  Brain,
  Users,
  Zap,
  Copy,
  Check,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InterviewPrepResult, InterviewQuestion } from "@/lib/types/optimize-flow"

interface InterviewPrepResultsProps {
  result: InterviewPrepResult
  jobTitle: string
  companyName?: string
  onFinish: () => void
}

function getDifficultyColor(difficulty: InterviewQuestion["difficulty"]) {
  switch (difficulty) {
    case "hard":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    case "very_hard":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
    case "expert":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
  }
}

function getDifficultyLabel(difficulty: InterviewQuestion["difficulty"]) {
  switch (difficulty) {
    case "hard":
      return "Hard"
    case "very_hard":
      return "Very Hard"
    case "expert":
      return "Expert"
  }
}

function getCategoryIcon(category: InterviewQuestion["category"]) {
  switch (category) {
    case "Technical":
      return <Zap className="w-4 h-4" />
    case "Behavioral":
      return <MessageSquare className="w-4 h-4" />
    case "Situational":
      return <Lightbulb className="w-4 h-4" />
    case "System Design":
      return <Brain className="w-4 h-4" />
    case "Leadership":
      return <Users className="w-4 h-4" />
  }
}

function getCategoryColor(category: InterviewQuestion["category"]) {
  switch (category) {
    case "Technical":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    case "Behavioral":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    case "Situational":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    case "System Design":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "Leadership":
      return "bg-pink-500/10 text-pink-600 dark:text-pink-400"
  }
}

export function InterviewPrepResults({
  result,
  jobTitle,
  companyName,
  onFinish,
}: InterviewPrepResultsProps) {
  const { questions } = result
  const [expandedIndex, setExpandedIndex] = useState<number>(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopyAnswer = async (answer: string, index: number) => {
    try {
      await navigator.clipboard.writeText(answer)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-border dark:border-white/10">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-emerald-500" />
        </div>
        <h2 className="text-xl font-semibold font-space-grotesk mb-1">
          Interview Preparation Complete
        </h2>
        <p className="text-sm text-foreground/60 dark:text-white/60">
          3 challenging questions for{" "}
          <span className="font-medium text-foreground dark:text-white">{jobTitle}</span>
          {companyName && (
            <>
              {" "}at{" "}
              <span className="font-medium text-foreground dark:text-white">{companyName}</span>
            </>
          )}
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, index) => (
          <div
            key={index}
            className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden"
          >
            {/* Question Header */}
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
              className="w-full px-5 py-4 flex items-start gap-4 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-medium">
                {index + 1}
              </div>
              <div className="flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                      getCategoryColor(q.category)
                    )}
                  >
                    {getCategoryIcon(q.category)}
                    {q.category}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      getDifficultyColor(q.difficulty)
                    )}
                  >
                    {getDifficultyLabel(q.difficulty)}
                  </span>
                </div>
                <h3 className="font-medium text-sm leading-relaxed">{q.question}</h3>
              </div>
              <div className="shrink-0 mt-1">
                {expandedIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-foreground/40" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-foreground/40" />
                )}
              </div>
            </button>

            {/* Answer Section (Expanded) */}
            {expandedIndex === index && (
              <div className="px-5 pb-5 space-y-4 border-t border-border dark:border-white/10">
                {/* Perfect Answer */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-foreground/50 dark:text-white/50 uppercase tracking-wider">
                      Perfect Answer (STAR Format)
                    </h4>
                    <button
                      onClick={() => handleCopyAnswer(q.perfectAnswer, index)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-sm text-foreground/80 dark:text-white/80 leading-relaxed whitespace-pre-line">
                      {q.perfectAnswer}
                    </p>
                  </div>
                </div>

                {/* Key Points */}
                <div>
                  <h4 className="text-xs font-medium text-foreground/50 dark:text-white/50 uppercase tracking-wider mb-2">
                    Key Points to Hit
                  </h4>
                  <ul className="space-y-2">
                    {q.keyPoints.map((point, pointIndex) => (
                      <li
                        key={pointIndex}
                        className="flex items-start gap-2 text-sm text-foreground/70 dark:text-white/70"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Related Experience */}
                <div>
                  <h4 className="text-xs font-medium text-foreground/50 dark:text-white/50 uppercase tracking-wider mb-2">
                    Based on Your Experience
                  </h4>
                  <div className="flex items-start gap-2 text-sm text-foreground/70 dark:text-white/70">
                    <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{q.relatedExperience}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips Section */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Interview Tips</h4>
            <ul className="text-xs text-foreground/70 dark:text-white/70 space-y-1">
              <li>1. Practice your answers out loud, not just in your head</li>
              <li>2. Use specific examples with metrics when possible</li>
              <li>3. Keep answers to 2-3 minutes max</li>
              <li>4. Prepare questions to ask the interviewer</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Finish Button */}
      <div className="flex flex-col items-center gap-3 pt-4 border-t border-border dark:border-white/10">
        <p className="text-xs text-foreground/40 dark:text-white/40 text-center">
          Your resume has been optimized and is ready for submission.
        </p>
        <Button
          onClick={onFinish}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-8"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Complete Optimization
        </Button>
      </div>
    </div>
  )
}
