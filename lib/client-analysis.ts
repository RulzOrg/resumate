// Client-side analysis utilities for immediate UI feedback

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'by', 'as', 'at', 'from',
  'is', 'are', 'was', 'were', 'be', 'being', 'been', 'that', 'which', 'who', 'whom', 'this',
  'these', 'those', 'it', 'its', "it's", 'into', 'over', 'under', 'between', 'among', 'across',
  'after', 'before', 'during', 'while', 'until', 'within', 'without', 'about', 'above', 'below',
  'around', 'through', 'throughout', 'up', 'down', 'out', 'off', 'than', 'then', 'so', 'if',
  'not', 'no', 'nor', 'do', 'does', 'did', 'done', 'can', 'could', 'should', 'would', 'may',
  'might', 'must', 'will', 'just', 'also', 'more', 'most', 'other', 'some', 'such', 'any',
  'each', 'much', 'many', 'per', 'our', 'ours', 'your', 'yours', 'their', 'theirs', 'own',
  'you', 'we', 'they', 'i', 'he', 'she', 'him', 'her', 'his', 'hers', 'them', 'us', 'me',
  'my', 'mine', 'ourselves', 'yourselves', 'themselves', 'myself', 'include', 'includes',
  'including', 'via', 'vs', 'vs.', 'etc', 'e.g.', 'eg', 'i.e.', 'ie', 'into', 'via', 'across', 'very'
])

// Baseline skills for match score calculation (can be customized per user)
export const BASELINE_SKILLS = new Set([
  'react', 'javascript', 'typescript', 'html', 'css', 'tailwind', 'node', 'node.js', 'nodejs',
  'jest', 'cypress', 'webpack', 'vite', 'git', 'github actions', 'figma', 'rest', 'graphql',
  'redux', 'testing', 'ci/cd', 'docker', 'python', 'java', 'sql', 'postgresql', 'mongodb',
  'aws', 'azure', 'gcp', 'kubernetes', 'api', 'agile', 'scrum', 'jira'
])

export function tokenize(text: string): string[] {
  // Keep tech chars like +, #, . and hyphens within tokens
  const tokens = text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'") // curly quotes
    .match(/[a-z][a-z0-9+.#-]{1,}|c\+\+|c#/g) || []
  
  return tokens.filter(t => t && !STOP_WORDS.has(t) && !/^[0-9]+$/.test(t))
}

export function countSections(text: string): number {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let sections = 0
  
  lines.forEach(l => {
    if (/^[-*•]/.test(l)) sections++
    else if (/^([A-Z][A-Z0-9\s/&-]{2,})(:)?$/.test(l)) sections++ // SHOUTY or title lines
    else if (/^[A-Za-z].+:\s*$/.test(l)) sections++
  })
  
  // Group into approximate "sections" by heading-like lines
  const headingLike = lines.filter(l => 
    /^[A-Za-z].+:\s*$/.test(l) || /^([A-Z][A-Z0-9\s/&-]{2,})(:)?$/.test(l)
  ).length
  
  return Math.max(headingLike || 1, Math.ceil(sections / 5) || 1)
}

export function extractKeywordsClient(text: string, limit: number = 12): string[] {
  const tokens = tokenize(text)
  const freq = new Map<string, number>()
  
  for (const t of tokens) {
    const norm = t.replace(/(\.+js)$/, ' js').trim() // normalize node.js -> node js
    freq.set(norm, (freq.get(norm) || 0) + 1)
  }
  
  // Merge variants
  const merged = new Map<string, number>()
  for (const [k, v] of freq.entries()) {
    let key = k
    if (key === 'js') continue
    if (key === 'node js' || key === 'node.js' || key === 'nodejs') key = 'node.js'
    if (key === 'github' || key === 'github actions') key = 'github actions'
    if (key === 'ci' || key === 'cd') key = 'ci/cd'
    merged.set(key, (merged.get(key) || 0) + v)
  }
  
  const sorted = [...merged.entries()]
    .filter(([k]) => k.length > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k)
  
  // Capitalize tech names nicely
  return sorted.map(k => {
    const map: Record<string, string> = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'html': 'HTML',
      'css': 'CSS',
      'node.js': 'Node.js',
      'ci/cd': 'CI/CD',
      'graphql': 'GraphQL',
      'react': 'React',
      'redux': 'Redux',
      'vite': 'Vite',
      'webpack': 'Webpack',
      'jest': 'Jest',
      'cypress': 'Cypress',
      'tailwind': 'Tailwind CSS',
      'figma': 'Figma',
      'rest': 'REST',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'aws': 'AWS',
      'azure': 'Azure',
      'gcp': 'GCP'
    }
    return map[k] || k.replace(/\b[a-z]/g, c => c.toUpperCase())
  })
}

export interface MatchScoreResult {
  pct: number
  color: string
  hint: string
}

export function estimateMatchScore(keywords: string[]): MatchScoreResult {
  const kwLower = keywords.map(k => k.toLowerCase())
  const overlap = kwLower.filter(k => BASELINE_SKILLS.has(k)).length
  const denom = Math.max(kwLower.length, 6)
  
  let pct = Math.round((overlap / denom) * 100)
  // Keep within a friendly band
  pct = Math.max(20, Math.min(96, pct + 18))
  
  let color = 'bg-emerald-400'
  let hint = 'Strong alignment. Minor tweaks recommended.'
  
  if (pct < 45) {
    color = 'bg-rose-400'
    hint = 'Low alignment. Add core tools and frameworks from the job.'
  } else if (pct < 70) {
    color = 'bg-amber-400'
    hint = 'Moderate alignment. Add missing keywords to improve.'
  }
  
  return { pct, color, hint }
}

export function buildSuggestions(keywords: string[]): string[] {
  // Missing vs baseline: focus on extracted terms not in baseline -> add to resume/CV
  const lower = keywords.map(k => k.toLowerCase())
  const missing = lower.filter(k => !BASELINE_SKILLS.has(k))
  
  // De-duplicate and cap
  const uniq = [...new Set(missing)].slice(0, 8)
  
  // Nice-case
  return uniq.map(k => 
    k.replace(/\b[a-z]/g, c => c.toUpperCase()).replace('Ci/Cd', 'CI/CD')
  )
}

export interface ATSCheck {
  level: 'ok' | 'warn' | 'info'
  text: string
}

export function buildATSChecks(text: string): ATSCheck[] {
  const words = tokenize(text).length
  const lines = text.split(/\r?\n/).map(l => l.trim())
  const bullets = lines.filter(l => /^[-*•]/.test(l)).length
  const hasNumbers = /\b\d+(\+|%|k)?\b/i.test(text)
  const hasSalary = /(\$|£|€)\s?\d|(\d{2,3})\s?k\b/i.test(text)
  const allCapsTokens = (text.match(/\b[A-Z]{3,}\b/g) || []).length
  const totalTokens = (text.match(/\b[A-Za-z]{3,}\b/g) || []).length || 1
  const capsRatio = allCapsTokens / totalTokens
  const hasHeadings = lines.some(l => 
    /^[A-Za-z].+:\s*$/.test(l) || /^([A-Z][A-Z0-9\s/&-]{2,})(:)?$/.test(l)
  )
  
  const checks: ATSCheck[] = []
  
  checks.push({
    level: (words >= 120 && words <= 1200) ? 'ok' : 'warn',
    text: (words >= 120 && words <= 1200) 
      ? `Length is reasonable (${words} words)` 
      : `Unusual length (${words} words)`
  })
  
  checks.push({
    level: bullets >= 3 ? 'ok' : 'warn',
    text: bullets >= 3 
      ? 'Uses bullet points for clarity' 
      : 'Consider adding bullet points for readability'
  })
  
  checks.push({
    level: hasHeadings ? 'ok' : 'warn',
    text: hasHeadings 
      ? 'Contains clear section headings' 
      : 'Add headings (e.g., Responsibilities, Requirements)'
  })
  
  checks.push({
    level: hasNumbers ? 'ok' : 'warn',
    text: hasNumbers 
      ? 'Includes measurable data (numbers/percentages)' 
      : 'Add measurable outcomes or ranges'
  })
  
  checks.push({
    level: capsRatio > 0.12 ? 'warn' : 'ok',
    text: capsRatio > 0.12 
      ? 'Excessive ALL-CAPS or acronyms' 
      : 'Acronym usage looks balanced'
  })
  
  if (hasSalary) {
    checks.push({
      level: 'info',
      text: 'Salary information detected'
    })
  }
  
  return checks
}

export interface QuickMetrics {
  words: number
  readingTime: string
  sections: number
}

export function calculateQuickMetrics(text: string): QuickMetrics {
  const words = tokenize(text).length
  const readingTime = Math.max(1, Math.round(words / 200))
  const sections = countSections(text)
  
  return {
    words,
    readingTime: `${readingTime} min`,
    sections
  }
}
