"use client"

import { useState, useEffect } from 'react'
import { User, CreditCard, Lock } from 'lucide-react'
import type { User as UserType, UserProfile } from '@/lib/db'
import { AccountTab } from './account-tab'
import { SubscriptionTab } from './subscription-tab'
import { SecurityTab } from './security-tab'

interface SettingsTabsProps {
  user: UserType
  profile: UserProfile | null
  usage: {
    jobs_saved: number
    cvs_generated: number
    ai_credits: number
    period_start: string
  }
  billingProvider: 'polar' | 'stripe'
}

type TabType = 'account' | 'subscription' | 'security'

export function SettingsTabs({ user, profile, usage, billingProvider }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('account')

  // Read hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1) as TabType
    if (['account', 'subscription', 'security'].includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  const switchTab = (tab: TabType) => {
    setActiveTab(tab)
    window.location.hash = tab
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      {/* Tabs */}
      <div className="px-3 sm:px-4 pt-3 border-b border-white/10">
        <nav className="flex flex-wrap gap-1">
          <button
            onClick={() => switchTab('account')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              activeTab === 'account'
                ? 'border border-white/10 bg-white/10 text-white font-medium'
                : 'border border-transparent bg-transparent hover:bg-white/5 text-white/70'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="font-geist">Account</span>
          </button>
          <button
            onClick={() => switchTab('subscription')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              activeTab === 'subscription'
                ? 'border border-white/10 bg-white/10 text-white font-medium'
                : 'border border-transparent bg-transparent hover:bg-white/5 text-white/70'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="font-geist">Subscription</span>
          </button>
          <button
            onClick={() => switchTab('security')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              activeTab === 'security'
                ? 'border border-white/10 bg-white/10 text-white font-medium'
                : 'border border-transparent bg-transparent hover:bg-white/5 text-white/70'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span className="font-geist">Security</span>
          </button>
        </nav>
      </div>

      {/* Panels */}
      <div className="p-4 space-y-6">
        {activeTab === 'account' && <AccountTab user={user} profile={profile} />}
        {activeTab === 'subscription' && (
          <SubscriptionTab user={user} usage={usage} billingProvider={billingProvider} />
        )}
        {activeTab === 'security' && <SecurityTab user={user} />}
      </div>
    </div>
  )
}
