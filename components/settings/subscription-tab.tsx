"use client"

import { useState } from 'react'
import { Wallet, Ban, Save, Loader2, AlertCircle } from 'lucide-react'
import type { User } from '@/lib/db'
import { 
  getPlanDisplayName, 
  getStatusBadgeColor, 
  formatBillingDate,
  getUsagePercentage,
  getUsageColor
} from '@/lib/settings-utils'
import { getPricingTier } from '@/lib/pricing'

interface SubscriptionTabProps {
  user: User
  usage: {
    jobs_saved: number
    cvs_generated: number
    ai_credits: number
    period_start: string
  }
  billingProvider: 'polar' | 'stripe'
}

export function SubscriptionTab({ user, usage, billingProvider }: SubscriptionTabProps) {
  const [billingEmail, setBillingEmail] = useState(user.billing_email || '')
  const [company, setCompany] = useState(user.company || '')
  const [saving, setSaving] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const plan = getPricingTier(user.subscription_plan)
  const statusColor = getStatusBadgeColor(user.subscription_status)

  const handleManagePayment = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to access billing portal')
      }
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No billing portal URL received')
      }
    } catch (error) {
      // Log technical error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Billing portal error:', error)
      }
      
      // Set user-friendly error message
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Unable to open billing portal. Please try again later.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveBilling = async () => {
    setSaving(true)
    try {
      // TODO: Implement billing details save
      alert('Billing details saved!')
    } catch (error) {
      alert('Failed to save billing details')
    } finally {
      setSaving(false)
    }
  }

  // Calculate usage percentages
  const aiCreditsLimit = 5000 // Fallback for AI credits (not yet in plan limits)
  const jobsPercentage = getUsagePercentage(usage.jobs_saved, plan?.limits.jobAnalyses || 0)
  const cvsPercentage = getUsagePercentage(usage.cvs_generated, plan?.limits.resumeOptimizations || 0)
  const creditsPercentage = getUsagePercentage(usage.ai_credits, aiCreditsLimit)

  return (
    <div className="space-y-6">
      {/* Error Notification */}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-200 font-geist">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-300 transition"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Plan Section */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Plan</h3>
        </div>
        <div className="p-4 grid gap-4 sm:grid-cols-2">
          {/* Current Plan Card */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 font-geist">Current plan</p>
                <p className="mt-1 text-lg tracking-tight font-space-grotesk font-semibold">
                  {getPlanDisplayName(user.subscription_plan)}
                </p>
              </div>
              <span className={`text-xs rounded-full border px-2 py-0.5 ${statusColor}`}>
                {user.subscription_status === 'free' ? 'Free' : 'Active'}
              </span>
            </div>
            <p className="mt-3 text-sm text-white/70 font-geist">
              ${plan?.price || 0}/{plan?.interval || 'month'} • Billed {plan?.interval}ly
            </p>
            {user.subscription_period_end && (
              <p className="mt-1 text-xs text-white/50 font-geist">
                Next billing on {formatBillingDate(user.subscription_period_end)}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleManagePayment}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
                {isLoading ? 'Opening...' : 'Manage payment'}
              </button>
              {user.subscription_status !== 'free' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm hover:bg-red-500/20 transition"
                >
                  <Ban className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Usage Card */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/60 font-geist">Usage (this cycle)</p>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80 font-geist">Jobs saved</span>
                  <span className="text-sm text-white/70 font-geist">
                    {usage.jobs_saved} / {plan?.limits.jobAnalyses === 'unlimited' ? '∞' : plan?.limits.jobAnalyses}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-2">
                  <div
                    className={`h-full ${getUsageColor(jobsPercentage)}`}
                    style={{ width: `${jobsPercentage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80 font-geist">CVs generated</span>
                  <span className="text-sm text-white/70 font-geist">
                    {usage.cvs_generated} / {plan?.limits.resumeOptimizations === 'unlimited' ? '∞' : plan?.limits.resumeOptimizations}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-2">
                  <div
                    className={`h-full ${getUsageColor(cvsPercentage)}`}
                    style={{ width: `${cvsPercentage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80 font-geist">AI credits</span>
                  <span className="text-sm text-white/70 font-geist">
                    {usage.ai_credits.toLocaleString()} / {aiCreditsLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-2">
                  <div
                    className={`h-full ${getUsageColor(creditsPercentage)}`}
                    style={{ width: `${creditsPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-white/50 font-geist">
              Usage resets each billing cycle.
            </p>
          </div>
        </div>
      </div>

      {/* Billing Details */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Billing details</h3>
        </div>
        <div className="p-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-white/70 mb-1.5 font-geist">Billing email</label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="billing@company.com"
              className="w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1.5 font-geist">Company (optional)</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company, Inc."
              className="w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-end">
            <button
              onClick={handleSaveBilling}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save billing'}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold font-geist mb-2">Cancel Subscription?</h3>
            <p className="text-sm text-white/60 font-geist mb-4">
              You'll be redirected to the billing portal to manage your subscription. You can cancel or make changes there.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleManagePayment}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Opening...' : 'Open Billing Portal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
