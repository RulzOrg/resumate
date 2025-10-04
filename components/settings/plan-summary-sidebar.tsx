"use client"

import { Crown, MessageCircle, Shield } from 'lucide-react'
import type { User } from '@/lib/db'
import { getPlanDisplayName, formatBillingDate } from '@/lib/settings-utils'
import { getPricingTier } from '@/lib/pricing'

interface PlanSummarySidebarProps {
  user: User
}

export function PlanSummarySidebar({ user }: PlanSummarySidebarProps) {
  const plan = getPricingTier(user.subscription_plan)
  const isPro = user.subscription_plan !== 'free'

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-lg font-medium tracking-tight font-geist">Plan summary</h2>
      </div>
      <div className="p-4 space-y-4">
        {/* Plan Info */}
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <Crown className="w-[18px] h-[18px] text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium font-geist">{getPlanDisplayName(user.subscription_plan)} plan</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">
              {isPro
                ? 'Priority AI queue • Unlimited exports • Advanced ATS checks'
                : 'Limited features • Community support'}
            </p>
          </div>
          <span className="text-xs text-emerald-200 font-medium">
            {isPro ? 'Active' : 'Free'}
          </span>
        </div>

        {/* Next Billing */}
        {isPro && user.subscription_period_end && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/60 font-geist">Next billing</p>
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-sm font-geist text-white/80">
                {formatBillingDate(user.subscription_period_end)} • ${plan?.price || 0}
              </p>
              <button
                onClick={() => {
                  window.location.hash = 'subscription'
                  window.dispatchEvent(new HashChangeEvent('hashchange'))
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 transition"
              >
                Manage
              </button>
            </div>
          </div>
        )}

        {/* Support */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/60 font-geist">Support</p>
          <p className="text-sm font-geist text-white/80 mt-1">
            Need help with billing or settings?
          </p>
          <div className="mt-2 flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3 py-1.5 hover:bg-emerald-400 transition">
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => {
                window.location.hash = 'security'
                window.dispatchEvent(new HashChangeEvent('hashchange'))
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition"
            >
              <Shield className="w-4 h-4" />
              Security
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
