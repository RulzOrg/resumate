"use client"

import { useState, useEffect } from 'react'
import { Upload, Trash2, Save, AlertTriangle, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react'
import type { User, UserProfile } from '@/lib/db'
import { TIMEZONES, JOB_FOCUS_OPTIONS, isValidEmail } from '@/lib/settings-utils'

interface AccountTabProps {
  user: User
  profile: UserProfile | null
}

interface EmailVerificationStatus {
  currentEmail: string
  pendingEmail: string | null
  status: 'verified' | 'pending_verification' | 'expired' | 'failed'
  expiresAt: string | null
}

export function AccountTab({ user, profile }: AccountTabProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    timezone: profile?.preferences?.timezone || 'UTC',
    job_focus: profile?.preferences?.job_focus || 'Software Engineering',
  })
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [emailStatus, setEmailStatus] = useState<EmailVerificationStatus | null>(null)
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(true)
  const [changingEmail, setChangingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  // Fetch email verification status on mount
  useEffect(() => {
    fetchEmailStatus()
  }, [])

  const fetchEmailStatus = async () => {
    setLoadingEmailStatus(true)
    try {
      const response = await fetch('/api/user/email/status')
      if (response.ok) {
        const data = await response.json()
        setEmailStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch email status:', error)
    } finally {
      setLoadingEmailStatus(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone,
          job_focus: formData.job_focus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      alert('Profile updated successfully!')
    } catch (error) {
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!isValidEmail(newEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setChangingEmail(true)
    setEmailError(null)

    try {
      const response = await fetch('/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate email change')
      }

      alert('Verification email sent! Please check your inbox.')
      setNewEmail('')
      await fetchEmailStatus()
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to change email')
    } finally {
      setChangingEmail(false)
    }
  }

  const handleCancelEmailChange = async () => {
    try {
      const response = await fetch('/api/user/email', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel email change')
      }

      alert('Email change cancelled')
      await fetchEmailStatus()
    } catch (error) {
      alert('Failed to cancel email change')
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Profile</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=10b981`}
              alt="Avatar"
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition">
                <Upload className="w-4 h-4" />
                <span className="font-geist">Change</span>
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition">
                <Trash2 className="w-4 h-4" />
                <span className="font-geist">Remove</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/70 mb-1.5 font-geist">Full name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/70 mb-1.5 font-geist">Email address</label>
              
              {/* Current Email Display */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 flex items-center gap-2 rounded-lg bg-white/5 border border-white/15 px-3 py-2">
                  <Mail className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white">{user.email}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
                </div>
              </div>

              {/* Pending Email Notification */}
              {emailStatus?.pendingEmail && emailStatus?.status === 'pending_verification' && (
                <div className="mb-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-200 mb-1">
                        Email verification pending
                      </p>
                      <p className="text-xs text-yellow-300/80 mb-2">
                        We sent a verification email to <strong>{emailStatus.pendingEmail}</strong>. 
                        Click the link in the email to complete the change.
                      </p>
                      <p className="text-xs text-yellow-300/60 mb-2">
                        You can continue using your account with {user.email} until verification is complete.
                      </p>
                      {emailStatus.expiresAt && (
                        <p className="text-xs text-yellow-300/60 mb-2">
                          Expires: {new Date(emailStatus.expiresAt).toLocaleString()}
                        </p>
                      )}
                      <button
                        onClick={handleCancelEmailChange}
                        className="text-xs text-yellow-200 hover:text-yellow-100 underline"
                      >
                        Cancel email change
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed/Expired Email Notification */}
              {emailStatus?.status === 'expired' && (
                <div className="mb-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-200 mb-1">
                        Previous email verification expired
                      </p>
                      <p className="text-xs text-orange-300/80">
                        Your last email change request expired. You can request a new email change below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Change Email Form */}
              <div className="space-y-2">
                <label className="block text-xs text-white/50 font-geist">Change email address</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value)
                      setEmailError(null)
                    }}
                    placeholder="new.email@company.com"
                    disabled={emailStatus?.status === 'pending_verification'}
                    className="flex-1 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleChangeEmail}
                    disabled={changingEmail || !newEmail || emailStatus?.status === 'pending_verification'}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingEmail ? 'Sending...' : 'Change email'}
                  </button>
                </div>
                {emailError && (
                  <p className="text-xs text-red-400">{emailError}</p>
                )}
                <p className="text-xs text-white/40">
                  You'll receive a verification email at the new address. Your current email will remain active until you verify the new one.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1.5 font-geist">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full rounded-lg bg-white/5 border border-white/15 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-black">
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1.5 font-geist">Job focus</label>
              <select
                value={formData.job_focus}
                onChange={(e) => setFormData({ ...formData, job_focus: e.target.value })}
                className="w-full rounded-lg bg-white/5 border border-white/15 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
              >
                {JOB_FOCUS_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-black">
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3.5 py-2 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-tight font-geist">Danger zone</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-geist">Delete account</p>
              <p className="text-xs text-white/60 font-geist mt-0.5">
                This action is irreversible. All jobs, resumes, and settings will be removed.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm hover:bg-red-500/20 transition"
            >
              <AlertTriangle className="w-4 h-4" />
              Delete account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold font-geist mb-2">Delete Account?</h3>
            <p className="text-sm text-white/60 font-geist mb-4">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/user/account', { method: 'DELETE' })
                    if (!response.ok) {
                      const data = await response.json().catch(() => ({ error: 'Failed to delete account' }))
                      
                      // Handle active subscription conflict (409)
                      if (response.status === 409 && data.subscription) {
                        alert(
                          `${data.message}\n\n` +
                          `Current subscription: ${data.subscription.plan} (${data.subscription.status})\n` +
                          `Period ends: ${data.subscription.periodEnd ? new Date(data.subscription.periodEnd).toLocaleDateString() : 'N/A'}\n\n` +
                          `Go to the Subscription tab to manage your subscription.`
                        )
                        setShowDeleteModal(false)
                        // Optionally switch to subscription tab
                        // window.location.hash = 'subscription'
                        return
                      }
                      
                      alert(data.message || data.error || 'Failed to delete account')
                      return
                    }
                    window.location.href = '/'
                  } catch (error) {
                    alert('Failed to delete account')
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
