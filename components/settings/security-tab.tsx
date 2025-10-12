"use client"

import { useState, useEffect } from 'react'
import { KeyRound, Monitor, Smartphone, Tablet, LogOut, Loader2 } from 'lucide-react'
import type { User } from '@/lib/db'
import { validatePassword } from '@/lib/settings-utils'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchSessions(controller.signal)
    return () => controller.abort()
  }, [])

  const fetchSessions = async (signal?: AbortSignal) => {
    try {
      setLoadingSessions(true)
      const response = await fetch('/api/user/sessions', { signal })
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`)
      }
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Ignore abort errors (component unmounted)
        return
      }
      toast.error('Failed to load sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleRevokeSession = async (sessionIdToRevoke: string) => {
    setSessionToRevoke(sessionIdToRevoke)
  }

  const confirmRevokeSession = async () => {
    if (!sessionToRevoke) return

    try {
      setRevokingSession(sessionToRevoke)
      const response = await fetch(`/api/user/sessions/${sessionToRevoke}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove session from state
        setSessions(prev => prev.filter(s => s.id !== sessionToRevoke))
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
      setSessionToRevoke(null)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    setShowRevokeAllDialog(true)
  }

  const confirmRevokeAllSessions = async () => {
    try {
      setRevokingAll(true)
      setShowRevokeAllDialog(false)
      
      const response = await fetch('/api/user/sessions/revoke-all', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        // Remove all other sessions from state (same pattern as handleRevokeSession)
        setSessions(prev => prev.filter(s => s.id === sessionId))
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
      <div className="rounded-xl border border-border bg-secondary">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Change password</h3>
        </div>
        <div className="p-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1.5 font-geist">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-input border border-input text-foreground placeholder-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-geist">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg bg-input border border-input text-foreground placeholder-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-geist">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full rounded-lg bg-input border border-input text-foreground placeholder-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
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
      <div className="rounded-xl border border-border bg-secondary">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">
            Two-factor authentication
          </h3>
        </div>
        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-geist">Protect your account with an extra layer of security</p>
            <p className="text-xs text-muted-foreground font-geist mt-0.5">
              Use an authenticator app to generate one-time codes.
            </p>
          </div>
          <button
            onClick={handleToggle2FA}
            aria-pressed={twoFAEnabled}
            className="group inline-flex items-center rounded-full border border-white/15 bg-white/5 px-1.5 py-1 transition"
          >
            <span className="px-2 text-xs text-muted-foreground font-geist">
              {twoFAEnabled ? 'On' : 'Off'}
            </span>
            <span className="inline-flex h-6 w-10 items-center rounded-full border border-border bg-white/10 relative">
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
      <div className="rounded-xl border border-border bg-secondary">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Sessions</h3>
        </div>
        <div className="p-4 space-y-3">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm font-geist">
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
                      <div className="h-9 w-9 rounded-full border border-border bg-secondary flex items-center justify-center">
                        <DeviceIcon className="w-[18px] h-[18px] text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-geist">
                          {session.userAgent.browser} on {session.userAgent.os}
                          {isCurrentSession && (
                            <span className="ml-2 text-xs text-emerald-400">(Current)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-geist">
                          {timeText}
                          {location && ` • ${location}`}
                        </p>
                      </div>
                    </div>
                    {!isCurrentSession && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSession === session.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Revoke Single Session Confirmation Dialog */}
      <AlertDialog open={!!sessionToRevoke} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <AlertDialogContent className="bg-black border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-geist">
              Sign out session?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-geist">
              This will immediately sign out this session. You'll need to sign in again on that device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={!!revokingSession}
              className="border-border bg-secondary text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokeSession}
              disabled={!!revokingSession}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {revokingSession ? 'Signing out...' : 'Sign out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Sessions Confirmation Dialog */}
      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent className="bg-black border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-geist">
              Sign out of all other sessions?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-geist">
              This will sign you out of all sessions except your current one. You'll need to sign in again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={revokingAll}
              className="border-border bg-secondary text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokeAllSessions}
              disabled={revokingAll}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {revokingAll ? 'Signing out...' : 'Sign out all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
