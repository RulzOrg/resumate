"use client"

import { useState } from 'react'
import { KeyRound, Monitor, Smartphone, LogOut } from 'lucide-react'
import type { User } from '@/lib/db'
import { validatePassword } from '@/lib/settings-utils'

interface SecurityTabProps {
  user: User
}

export function SecurityTab({ user }: SecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setSaving(true)
    try {
      // TODO: Implement Clerk password update
      alert('Password change would be handled by Clerk')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      alert('Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle2FA = () => {
    // TODO: Implement Clerk 2FA toggle
    setTwoFAEnabled(!twoFAEnabled)
    alert('2FA toggle would be handled by Clerk MFA API')
  }

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Change password</h3>
        </div>
        <div className="p-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs text-white/70 mb-1.5 font-geist">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1.5 font-geist">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1.5 font-geist">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-end">
            <button
              onClick={handlePasswordChange}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4" />
              {saving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">
            Two-factor authentication
          </h3>
        </div>
        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-geist">Protect your account with an extra layer of security</p>
            <p className="text-xs text-white/60 font-geist mt-0.5">
              Use an authenticator app to generate one-time codes.
            </p>
          </div>
          <button
            onClick={handleToggle2FA}
            aria-pressed={twoFAEnabled}
            className="group inline-flex items-center rounded-full border border-white/15 bg-white/5 px-1.5 py-1 transition"
          >
            <span className="px-2 text-xs text-white/70 font-geist">
              {twoFAEnabled ? 'On' : 'Off'}
            </span>
            <span className="inline-flex h-6 w-10 items-center rounded-full border border-white/10 bg-white/10 relative">
              <span
                className={`h-5 w-5 rounded-full bg-white transition-transform ${
                  twoFAEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Sessions</h3>
        </div>
        <div className="p-4 space-y-3">
          {/* Current Session */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                <Monitor className="w-[18px] h-[18px] text-white/70" />
              </div>
              <div>
                <p className="text-sm font-geist">Chrome on macOS</p>
                <p className="text-xs text-white/60 font-geist">Active now</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition">
              Sign out
            </button>
          </div>

          {/* Other Session */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                <Smartphone className="w-[18px] h-[18px] text-white/70" />
              </div>
              <div>
                <p className="text-sm font-geist">Safari on iOS</p>
                <p className="text-xs text-white/60 font-geist">Last active 2 days ago</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition">
              Sign out
            </button>
          </div>

          {/* Sign Out All */}
          <div className="pt-2 flex items-center justify-end">
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition">
              <LogOut className="w-4 h-4" />
              Sign out of all other sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
