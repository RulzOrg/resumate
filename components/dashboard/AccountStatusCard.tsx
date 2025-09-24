"use client"

import { BillingButton } from "./billing-button"
import { format } from "date-fns"

interface AccountStatusCardProps {
  plan: string
  status: string
  periodEnd?: string
  totalGenerations: number
  maxGenerations: number
}

export function AccountStatusCard({ plan, status, periodEnd, totalGenerations, maxGenerations }: AccountStatusCardProps) {
  const usagePercentage = Math.min((totalGenerations / Math.max(1, maxGenerations)) * 100, 100)
  const isFree = plan === "free"
  const nextRenewal = periodEnd ? format(new Date(periodEnd), "MMM d, yyyy") : null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-base font-medium text-white/90">Account Status</h3>
      <p className="text-sm text-white/60 mt-1">
        {plan === "pro" ? "Pro Plan" : "Free Plan"}
        {status ? <span className="ml-2 text-white/40">({status})</span> : null}
      </p>
      {nextRenewal && plan !== "free" ? (
        <p className="text-xs text-white/50 mt-1">Renews on {nextRenewal}</p>
      ) : null}

      <div className="mt-4">
        <div className="flex justify-between text-xs text-white/70 mb-1">
          <span>Generations Used</span>
          <span>
            {totalGenerations} of {maxGenerations}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
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


