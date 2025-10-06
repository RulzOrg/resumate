"use client"

import { useState, useEffect } from 'react'
import { KeyRound, Monitor, Smartphone, Tablet, LogOut, Loader2 } from 'lucide-react'
import type { User } from '@/lib/db'
import { validatePassword } from '@/lib/settings-utils'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'

interface SecurityTabProps {
  user: User
}

interface Session {
  id: string
  status: string
  lastActiveAt: number
  expireAt: number
  clientId: string
  userAgent: {
    browser: string
    os: string
    device: string
  }
  ipAddress: string
  city: string | null
  country: string | null
}

export function SecurityTab({ user }: SecurityTabProps) {
  const { sessionId } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revokingSession, setRevokingSession] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true)
      const response = await fetch('/api/user/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleRevokeSession = async (sessionIdToRevoke: string) => {
    if (!confirm('Are you sure you want to sign out this session?')) {
      return
    }

    try {
      setRevokingSession(sessionIdToRevoke)
      const response = await fetch(`/api/user/sessions/${sessionIdToRevoke}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove session from state
        setSessions(prev => prev.filter(s => s.id !== sessionIdToRevoke))
        toast.success('Session signed out successfully')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to revoke session')
      }
    } catch (error) {
      console.error('Failed to revoke session:', error)
      toast.error('Failed to revoke session')
    } finally {
      setRevokingSession(null)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm('Are you sure you want to sign out of all other sessions?')) {
      return
    }

    try {
      setRevokingAll(true)
      const response = await fetch('/api/user/sessions/revoke-all', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh sessions list
        await fetchSessions()
        toast.success(`Successfully signed out ${data.revokedCount} session(s)`)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to revoke sessions')
      }
    } catch (error) {
      console.error('Failed to revoke sessions:', error)
      toast.error('Failed to revoke sessions')
    } finally {
      setRevokingAll(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setSaving(true)
    try {
      // TODO: Implement Clerk password update
      toast.success('Password change would be handled by Clerk')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password change failed:', error)
      toast.error(`Failed to update password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle2FA = () => {
    // TODO: Implement Clerk 2FA toggle
    setTwoFAEnabled(!twoFAEnabled)
    toast.info('2FA toggle would be handled by Clerk MFA API')
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
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-white/60 text-sm font-geist">
              No active sessions found
            </div>
          ) : (
            <>
              {sessions.map((session) => {
                const isCurrentSession = session.id === sessionId
                const lastActive = new Date(session.lastActiveAt)
                const now = new Date()
                const diffMs = now.getTime() - lastActive.getTime()
                const diffMins = Math.floor(diffMs / 60000)
                const diffHours = Math.floor(diffMins / 60)
                const diffDays = Math.floor(diffHours / 24)

                let timeText = 'Active now'
                if (diffMins < 5) {
                  timeText = 'Active now'
                } else if (diffMins < 60) {
                  timeText = `${diffMins} minutes ago`
                } else if (diffHours < 24) {
                  timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
                } else {
                  timeText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
                }

                const DeviceIcon = 
                  session.userAgent.device === 'Mobile' ? Smartphone :
                  session.userAgent.device === 'Tablet' ? Tablet :
                  Monitor

                const location = [session.city, session.country]
                  .filter(Boolean)
                  .join(', ')

                return (
                  <div key={session.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                        <DeviceIcon className="w-[18px] h-[18px] text-white/70" />
                      </div>
                      <div>
                        <p className="text-sm font-geist">
                          {session.userAgent.browser} on {session.userAgent.os}
                          {isCurrentSession && (
                            <span className="ml-2 text-xs text-emerald-400">(Current)</span>
                          )}
                        </p>
                        <p className="text-xs text-white/60 font-geist">
                          {timeText}
                          {location && ` • ${location}`}
                        </p>
                      </div>
                    </div>
                    {!isCurrentSession && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSession === session.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {revokingSession === session.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Signing out...
                          </>
                        ) : (
                          'Sign out'
                        )}
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Sign Out All - only show if there are other sessions */}
              {sessions.filter(s => s.id !== sessionId).length > 0 && (
                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={handleRevokeAllOtherSessions}
                    disabled={revokingAll}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {revokingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4" />
                        Sign out of all other sessions
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
