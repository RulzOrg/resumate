import {
  FileText,
  type LucideIcon,
} from "lucide-react"

/**
 * Maps resume/job title to appropriate icon
 * For resumes page, we primarily use FileText variants
 */
export function getResumeIcon(jobTitle: string): LucideIcon {
  // For now, all resumes use the same icon
  // In the future, could differentiate based on job type
  return FileText
}

/**
 * Get color class for match score (shared with jobs-utils)
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-400"
  if (score >= 60) return "bg-yellow-400"
  return "bg-amber-400"
}

/**
 * Format date for resume display
 */
export function formatResumeDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Extract short role name from job title
 */
export function extractRoleName(jobTitle: string): string {
  // Remove common prefixes like "Senior", "Junior", etc.
  const cleaned = jobTitle
    .replace(/^(Senior|Junior|Lead|Principal|Staff|Mid-level|Entry-level)\s+/i, '')
    .trim()
  
  // Get first 2-3 words for a concise role name
  const words = cleaned.split(/\s+/)
  return words.slice(0, 2).join(' ')
}
