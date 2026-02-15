"use client"

import React, { useState } from "react"
import { Briefcase, Grid, MapPin, Building2, ChevronDown, ChevronUp, Heart, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface JobDetailsCardProps {
    jobTitle: string
    companyName: string
    location?: string
    seniority?: string
    category?: string
    culture: string[]
    benefits: string[]
}

export function JobDetailsCard({
    jobTitle,
    companyName,
    location,
    seniority,
    category,
    culture,
    benefits
}: JobDetailsCardProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <div className="rounded-2xl border border-border bg-surface-subtle overflow-hidden">
            <div className="p-6 border-b border-border">
                <h3 className="text-base font-medium text-foreground/90 mb-4">Job Summary</h3>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <div className="text-sm font-medium">{jobTitle || "Target Role"}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Building2 className="h-3 w-3" />
                                {companyName || "Company"}
                                {location && (
                                    <>
                                        <span className="mx-1">•</span>
                                        <MapPin className="h-3 w-3" />
                                        {location}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0">
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <div className="text-sm font-medium">Seniority</div>
                            <div className="text-xs text-muted-foreground">{seniority || "Not specified"}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0">
                            <Grid className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <div className="text-sm font-medium">Category</div>
                            <div className="text-xs text-muted-foreground">{category || "General"}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collapsible Details */}
            <div className="bg-surface-muted/30 dark:bg-black/20">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between p-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <span>Culture & Benefits</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {isExpanded && (
                    <div className="px-4 pb-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                        {culture.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-foreground/80 mb-2">
                                    <Heart className="h-3 w-3 text-rose-400" />
                                    Culture Values
                                </div>
                                <ul className="space-y-1.5">
                                    {culture.map((c, i) => (
                                        <li key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-border">
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {benefits.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-foreground/80 mb-2">
                                    <Trophy className="h-3 w-3 text-amber-400" />
                                    Key Benefits
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {benefits.map((b, i) => (
                                        <span key={i} className="inline-flex px-2 py-1 rounded-md bg-surface-subtle border border-border text-[10px] text-muted-foreground">
                                            {b}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {culture.length === 0 && benefits.length === 0 && (
                            <div className="text-xs text-muted-foreground/60 text-center py-2">
                                No additional details extracted.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
