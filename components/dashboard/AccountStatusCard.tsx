"use client"

import { BillingButton } from "./billing-button"
import { format } from "date-fns"
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AccountStatusCardProps {
  plan: string
  status: string
  periodEnd?: string
  jobAnalyses: number
  optimizedResumes: number
  usageLimits?: {
    resumeOptimizations: { used: number; limit: number | 'unlimited'; canUse: boolean }
    jobAnalyses: { used: number; limit: number | 'unlimited'; canUse: boolean }
  }
}

export function AccountStatusCard({ plan, status, periodEnd, jobAnalyses, optimizedResumes, usageLimits }: AccountStatusCardProps) {
  const isFree = plan === "free"
  const nextRenewal = periodEnd ? format(new Date(periodEnd), "MMM d, yyyy") : null

  // Helper function to format limits
  const formatLimit = (limit: number | 'unlimited') => limit === 'unlimited' ? '∞' : limit

  // Helper function to calculate usage percentage
  const getUsagePercentage = (used: number, limit: number | 'unlimited') => {
    if (limit === 'unlimited') {
      // For unlimited plans, show a small indicator based on usage (max 20%)
      return Math.min(used * 2, 20)
    }
    return Math.min((used / Math.max(1, limit)) * 100, 100)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-subtle p-6">
      <h3 className="text-base font-medium text-foreground/90">Account Status</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {plan === "pro" ? "Pro Plan" : plan === "enterprise" ? "Enterprise Plan" : "Free Plan"}
        {status ? <span className="ml-2 text-muted-foreground/60">({status})</span> : null}
      </p>
      {nextRenewal && plan !== "free" ? (
        <p className="text-xs text-muted-foreground/70 mt-1">Renews on {nextRenewal}</p>
      ) : null}

      {/* Job Analyses Usage */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            Job Analyses
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p>Track how many job descriptions you've analyzed. Each analysis identifies key skills and requirements.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          <span>
            {jobAnalyses} of {usageLimits ? formatLimit(usageLimits.jobAnalyses.limit) : (isFree ? '5' : '∞')}
          </span>
        </div>
        <div className="w-full bg-surface-muted rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{
              width: `${usageLimits ? getUsagePercentage(jobAnalyses, usageLimits.jobAnalyses.limit) : getUsagePercentage(jobAnalyses, isFree ? 5 : 'unlimited')}%`
            }}
          />
        </div>
        {jobAnalyses === 0 && (
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Paste a job description to run your first analysis
          </p>
        )}
      </div>

      {/* Resume Optimizations Usage */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            Resume Optimizations
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p>AI-tailored resumes created for specific job applications.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          <span>
            {optimizedResumes} of {usageLimits ? formatLimit(usageLimits.resumeOptimizations.limit) : (isFree ? '3' : '∞')}
          </span>
        </div>
        <div className="w-full bg-surface-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full"
            style={{
              width: `${usageLimits ? getUsagePercentage(optimizedResumes, usageLimits.resumeOptimizations.limit) : getUsagePercentage(optimizedResumes, isFree ? 3 : 'unlimited')}%`
            }}
          />
        </div>
        {optimizedResumes === 0 && (
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Optimize your first resume to get started
          </p>
        )}
      </div>

      <div className="mt-4">
        <BillingButton subscriptionStatus={status} subscriptionPlan={plan} />
      </div>
      {isFree ? (
        <p className="text-[11px] text-muted-foreground/70 mt-2">Upgrade to Pro for higher limits and priority AI.</p>
      ) : null}
    </div>
  )
}


