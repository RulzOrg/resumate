"use client"

import { BillingButton } from "./billing-button"
import { format } from "date-fns"

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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-base font-medium text-white/90">Account Status</h3>
      <p className="text-sm text-white/60 mt-1">
        {plan === "pro" ? "Pro Plan" : plan === "enterprise" ? "Enterprise Plan" : "Free Plan"}
        {status ? <span className="ml-2 text-white/40">({status})</span> : null}
      </p>
      {nextRenewal && plan !== "free" ? (
        <p className="text-xs text-white/50 mt-1">Renews on {nextRenewal}</p>
      ) : null}

      {/* Job Analyses Usage */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-white/70 mb-1">
          <span>Job Analyses</span>
          <span>
            {jobAnalyses} of {usageLimits ? formatLimit(usageLimits.jobAnalyses.limit) : (isFree ? '5' : '∞')}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full" 
            style={{ 
              width: `${usageLimits ? getUsagePercentage(jobAnalyses, usageLimits.jobAnalyses.limit) : getUsagePercentage(jobAnalyses, isFree ? 5 : 'unlimited')}%` 
            }}
          />
        </div>
      </div>

      {/* Resume Optimizations Usage */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-white/70 mb-1">
          <span>Resume Optimizations</span>
          <span>
            {optimizedResumes} of {usageLimits ? formatLimit(usageLimits.resumeOptimizations.limit) : (isFree ? '3' : '∞')}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full" 
            style={{ 
              width: `${usageLimits ? getUsagePercentage(optimizedResumes, usageLimits.resumeOptimizations.limit) : getUsagePercentage(optimizedResumes, isFree ? 3 : 'unlimited')}%` 
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <BillingButton subscriptionStatus={status} subscriptionPlan={plan} />
      </div>
      {isFree ? (
        <p className="text-[11px] text-white/50 mt-2">Upgrade to Pro for higher limits and priority AI.</p>
      ) : null}
    </div>
  )
}


