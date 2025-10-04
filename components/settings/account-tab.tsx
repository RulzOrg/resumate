"use client"

import { useState } from 'react'
import { Upload, Trash2, Save, AlertTriangle } from 'lucide-react'
import type { User, UserProfile } from '@/lib/db'
import { TIMEZONES, JOB_FOCUS_OPTIONS, isValidEmail } from '@/lib/settings-utils'

interface AccountTabProps {
  user: User
  profile: UserProfile | null
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

  const handleSave = async () => {
    if (!isValidEmail(formData.email)) {
      alert('Please enter a valid email address')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      alert('Profile updated successfully!')
      window.location.reload()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
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
            <div>
              <label className="block text-xs text-white/70 mb-1.5 font-geist">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@company.com"
                className="w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
              />
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
                    await fetch('/api/user/account', { method: 'DELETE' })
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
