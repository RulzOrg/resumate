"use client"

import React from "react"
import { Target, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ScoreHeroProps {
    score: {
        overall: number
        dimensions?: {
            skills: number
            responsibilities: number
            domain: number
            seniority: number
        }
        missingMustHaves?: string[]
    } | null
    isLoading?: boolean
    error?: string | null
}

export function ScoreHero({ score, isLoading, error }: ScoreHeroProps) {
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 animate-pulse">
                <div className="h-24 bg-surface-muted dark:bg-white/10 rounded-xl w-full" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-sm">
                <AlertTriangle className="h-5 w-5 mb-2" />
                {error}
            </div>
        )
    }

    if (!score) {
        return (
            <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 text-center text-foreground/60 dark:text-white/60 text-sm">
                No score available. Analyze the job to see your match.
            </div>
        )
    }

    const getScoreColor = (val: number) => {
        if (val >= 80) return "text-emerald-500"
        if (val >= 60) return "text-yellow-500"
        return "text-red-500"
    }

    const getProgressColor = (val: number) => {
        if (val >= 80) return "bg-emerald-500"
        if (val >= 60) return "bg-yellow-500"
        return "bg-red-500"
    }

    return (
        <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Main Score */}
                <div className="flex flex-col items-center justify-center text-center md:border-r border-border dark:border-white/10 pr-0 md:pr-8">
                    <div className="relative flex items-center justify-center">
                        <svg className="h-32 w-32 transform -rotate-90">
                            <circle
                                className="text-surface-muted dark:text-white/10"
                                strokeWidth="8"
                                stroke="currentColor"
                                fill="transparent"
                                r="58"
                                cx="64"
                                cy="64"
                            />
                            <circle
                                className={getScoreColor(score.overall)}
                                strokeWidth="8"
                                strokeDasharray={365}
                                strokeDashoffset={365 - (365 * score.overall) / 100}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="58"
                                cx="64"
                                cy="64"
                                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-4xl font-bold font-space-grotesk", getScoreColor(score.overall))}>
                                {score.overall}%
                            </span>
                            <span className="text-xs font-medium text-foreground/60 dark:text-white/60 uppercase tracking-wider mt-1">
                                Match
                            </span>
                        </div>
                    </div>
                </div>

                {/* Dimensions */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-3">Score Breakdown</h3>
                    {score.dimensions && (
                        <div className="space-y-3">
                            {[
                                { label: "Skills", value: score.dimensions.skills },
                                { label: "Experience", value: score.dimensions.seniority },
                                { label: "Domain", value: score.dimensions.domain },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-foreground/70 dark:text-white/70">{item.label}</span>
                                        <span className="font-medium">{item.value}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-surface-muted dark:bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500", getProgressColor(item.value))}
                                            style={{ width: `${item.value}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Critical Gaps */}
                <div className="md:pl-4">
                    <h3 className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Critical Gaps
                    </h3>
                    {score.missingMustHaves && score.missingMustHaves.length > 0 ? (
                        <div className="space-y-2">
                            {score.missingMustHaves.slice(0, 3).map((gap, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-foreground/70 dark:text-white/70 bg-surface-muted dark:bg-white/5 p-2 rounded-lg border border-border dark:border-white/5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span>{gap}</span>
                                </div>
                            ))}
                            {score.missingMustHaves.length > 3 && (
                                <p className="text-xs text-foreground/50 dark:text-white/50 pl-1">
                                    + {score.missingMustHaves.length - 3} more missing requirements
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>All must-haves matched!</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
