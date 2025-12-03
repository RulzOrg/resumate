"use client"

import React, { useState } from "react"
import { CheckCircle2, AlertTriangle, X, HelpCircle, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CategorizedSkills {
    hard: string[]
    soft: string[]
    other: string[]
}

interface SkillsAnalysisProps {
    keywords: string[]
    categorizedSkills: CategorizedSkills | null
    resumeText: string
    onRemoveKeyword: (keyword: string) => void
    isAnalyzing?: boolean
}

export function SkillsAnalysis({
    keywords,
    categorizedSkills,
    resumeText,
    onRemoveKeyword,
    isAnalyzing
}: SkillsAnalysisProps) {
    const [activeTab, setActiveTab] = useState("all")

    // Helper to check coverage
    const isCovered = (keyword: string) => {
        if (!resumeText) return false
        return resumeText.toLowerCase().includes(keyword.toLowerCase())
    }

    // Helper to render a skill chip
    const SkillChip = ({ skill, type }: { skill: string; type?: "hard" | "soft" | "other" }) => {
        const covered = isCovered(skill)

        let bgClass = "bg-surface-muted dark:bg-white/10 border-border dark:border-white/10"
        let textClass = "text-foreground/80 dark:text-white/80"

        if (type === "hard") {
            bgClass = "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30"
            textClass = "text-blue-700 dark:text-blue-400"
        } else if (type === "soft") {
            bgClass = "bg-green-500/10 dark:bg-green-500/20 border-green-500/20 dark:border-green-500/30"
            textClass = "text-green-700 dark:text-green-400"
        }

        return (
            <div className={cn(
                "group flex items-center gap-2 rounded-lg border px-3 py-2 transition-all hover:shadow-sm",
                bgClass,
                covered ? "opacity-100" : "opacity-80 border-dashed"
            )}>
                <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full",
                    covered ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                    {covered ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                </div>

                <span className={cn("text-sm font-medium", textClass)}>
                    {skill.replace(/^\w/, (c) => c.toUpperCase())}
                </span>

                <button
                    onClick={() => onRemoveKeyword(skill)}
                    disabled={isAnalyzing}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full"
                    title="Remove keyword"
                >
                    <X className="h-3 w-3 text-foreground/50 dark:text-white/50" />
                </button>
            </div>
        )
    }

    const allSkills = keywords
    const hardSkills = categorizedSkills?.hard || []
    const softSkills = categorizedSkills?.soft || []
    const otherSkills = categorizedSkills?.other || []

    // If no categorization, treat all as "other" or just generic
    const hasCategories = !!categorizedSkills

    return (
        <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-medium tracking-tight font-space-grotesk">Skills Analysis</h2>
                    <p className="text-sm text-foreground/60 dark:text-white/60 mt-1">
                        Compare your resume against job requirements.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/60 dark:text-white/60 bg-surface-muted dark:bg-white/5 px-3 py-1.5 rounded-full border border-border dark:border-white/10">
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Matched
                    </span>
                    <span className="w-px h-3 bg-border dark:bg-white/20 mx-1" />
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Missing
                    </span>
                </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 bg-surface-muted dark:bg-black/20 p-1 border border-border dark:border-white/5">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">All Skills ({allSkills.length})</TabsTrigger>
                    {hasCategories && (
                        <>
                            <TabsTrigger value="hard" className="text-xs sm:text-sm">Hard Skills ({hardSkills.length})</TabsTrigger>
                            <TabsTrigger value="soft" className="text-xs sm:text-sm">Soft Skills ({softSkills.length})</TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent value="all" className="mt-0">
                    {allSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {allSkills.map((skill) => (
                                <SkillChip
                                    key={skill}
                                    skill={skill}
                                    type={
                                        hardSkills.includes(skill) ? "hard" :
                                            softSkills.includes(skill) ? "soft" :
                                                "other"
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState />
                    )}
                </TabsContent>

                {hasCategories && (
                    <>
                        <TabsContent value="hard" className="mt-0">
                            {hardSkills.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                    {hardSkills.map((skill) => <SkillChip key={skill} skill={skill} type="hard" />)}
                                </div>
                            ) : <EmptyState message="No hard skills detected." />}
                        </TabsContent>
                        <TabsContent value="soft" className="mt-0">
                            {softSkills.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                    {softSkills.map((skill) => <SkillChip key={skill} skill={skill} type="soft" />)}
                                </div>
                            ) : <EmptyState message="No soft skills detected." />}
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    )
}

function EmptyState({ message = "No skills found. Try analyzing the job description again." }: { message?: string }) {
    return (
        <div className="text-center py-12 border-2 border-dashed border-border dark:border-white/10 rounded-xl">
            <p className="text-sm text-foreground/50 dark:text-white/50">{message}</p>
        </div>
    )
}
