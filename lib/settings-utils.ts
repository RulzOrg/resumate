/**
 * Settings utility functions
 */

export const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
  { value: 'America/New_York', label: 'Eastern (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain (MST/MDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
]

export const JOB_FOCUS_OPTIONS = [
  'Software Engineering',
  'Data Science',
  'Data Engineering',
  'Machine Learning',
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'DevOps',
  'Product Management',
  'UX/UI Design',
  'Graphic Design',
  'Marketing',
  'Sales',
  'Business Analytics',
  'Project Management',
  'Other',
]

/**
 * Get usage percentage
 */
export function getUsagePercentage(used: number, limit: number | 'unlimited'): number {
  if (limit === 'unlimited') return 0
  if (limit === 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

/**
 * Get usage color based on percentage
 */
export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-400'
  if (percentage >= 75) return 'bg-yellow-400'
  return 'bg-emerald-400'
}

/**
 * Format date for display
 */
export function formatBillingDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return 'N/A'
  }
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: string): string {
  const planMap: Record<string, string> = {
    'free': 'Free',
    'pro': 'Pro',
    'pro-annual': 'Pro Annual',
    'premium': 'Premium',
  }
  return planMap[plan] || plan
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: string): string {
  const colorMap: Record<string, string> = {
    'active': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    'trialing': 'border-blue-500/30 bg-blue-500/10 text-blue-200',
    'past_due': 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
    'canceled': 'border-red-500/30 bg-red-500/10 text-red-200',
    'free': 'border-white/10 bg-white/5 text-white/70',
  }
  return colorMap[status] || colorMap['free']
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }
  return { valid: true }
}
