import {
  Terminal,
  Server,
  Heart,
  BarChart,
  Briefcase,
  type LucideIcon,
} from "lucide-react"

/**
 * Maps job title to appropriate icon based on keywords
 */
export function getJobIcon(jobTitle: string): LucideIcon {
  const title = jobTitle.toLowerCase()
  
  if (title.includes("frontend") || title.includes("front-end") || title.includes("react") || title.includes("vue")) {
    return Terminal
  }
  
  if (title.includes("backend") || title.includes("back-end") || title.includes("devops") || title.includes("infrastructure")) {
    return Server
  }
  
  if (title.includes("designer") || title.includes("ux") || title.includes("ui") || title.includes("design")) {
    return Heart
  }
  
  if (title.includes("data") || title.includes("analyst") || title.includes("analytics")) {
    return BarChart
  }
  
  return Briefcase
}

/**
 * Get color class for match score
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-400"
  if (score >= 60) return "bg-yellow-400"
  return "bg-amber-400"
}

/**
 * Extract top keywords from text (simple implementation)
 */
export function extractKeywords(text: string, limit: number = 3): string[] {
  if (!text) return []
  
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'a', 'to', 'of', 'in', 'on', 'at',
    'as', 'is', 'are', 'be', 'by', 'or', 'an', 'from', 'into', 'your',
    'our', 'you', 'we', 'they', 'their', 'this', 'that', 'will', 'can',
    'team', 'work', 'role', 'job', 'experience', 'years'
  ])
  
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+.#\-\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && w.length > 1 && !stopWords.has(w))
  
  const counts = new Map<string, number>()
  words.forEach(w => counts.set(w, (counts.get(w) || 0) + 1))
  
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
}

/**
 * Format relative time for activity feed
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
