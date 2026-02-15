/**
 * Keyword extraction and matching utilities for algorithmic resume scoring.
 * No LLM calls — pure deterministic text processing.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must",
  "not", "no", "nor", "so", "if", "then", "than", "too", "very", "just",
  "about", "above", "after", "again", "all", "also", "am", "any", "because",
  "before", "between", "both", "each", "few", "further", "get", "got",
  "here", "how", "i", "into", "it", "its", "itself", "let", "me", "more",
  "most", "my", "myself", "now", "only", "other", "our", "out", "own",
  "same", "she", "he", "him", "her", "his", "some", "such", "that",
  "their", "them", "there", "these", "they", "this", "those", "through",
  "under", "until", "up", "we", "what", "when", "where", "which", "while",
  "who", "whom", "why", "you", "your", "per", "etc", "vs", "via",
  // Job posting filler words
  "position", "role", "company", "team", "work", "working", "job",
  "candidate", "candidates", "ideal", "looking", "join", "opportunity",
  "responsibilities", "requirements", "qualifications", "preferred",
  "required", "experience", "years", "year", "ability", "able",
  "strong", "excellent", "good", "great", "well", "new", "using",
  "within", "across", "ensure", "including", "include", "includes",
  "make", "take", "use", "used", "help", "support", "provide",
  "develop", "create", "manage", "lead", "drive", "build",
])

/** Section header patterns that indicate requirements/qualifications */
const REQUIREMENTS_HEADERS = [
  /requirements?/i,
  /qualifications?/i,
  /what you(?:'ll)? (?:need|bring)/i,
  /must[- ]have/i,
  /minimum/i,
  /essential/i,
  /required/i,
  /key skills/i,
  /technical skills/i,
  /core competenc/i,
]

const NICE_TO_HAVE_HEADERS = [
  /nice[- ]to[- ]have/i,
  /preferred/i,
  /bonus/i,
  /plus/i,
  /desired/i,
  /additional/i,
]

/** Normalize text for comparison: lowercase, strip punctuation, collapse whitespace */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Tokenize text into individual words, filtering stop words */
function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

/** Extract n-grams (1-3 words) from text */
function extractNgrams(text: string, maxN = 3): string[] {
  const words = normalizeText(text).split(" ").filter((w) => w.length > 1)
  const ngrams: string[] = []

  for (let n = 1; n <= Math.min(maxN, words.length); n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(" ")
      // Skip n-grams that are all stop words
      const ngramWords = ngram.split(" ")
      if (!ngramWords.every((w) => STOP_WORDS.has(w))) {
        ngrams.push(ngram)
      }
    }
  }

  return ngrams
}

/** Check if a job description section is a requirements section */
function isRequirementsSection(line: string): boolean {
  return REQUIREMENTS_HEADERS.some((re) => re.test(line))
}

function isNiceToHaveSection(line: string): boolean {
  return NICE_TO_HAVE_HEADERS.some((re) => re.test(line))
}

export interface ExtractedKeywords {
  /** High-priority keywords from requirements sections */
  required: string[]
  /** Lower-priority keywords from nice-to-have sections */
  preferred: string[]
  /** All unique keywords */
  all: string[]
  /** Multi-word terms (2-3 word phrases that appear together) */
  phrases: string[]
  /** Detected skill terms */
  skills: string[]
}

/**
 * Extract keywords from a job description.
 * Weights keywords appearing in requirements/qualifications sections higher.
 */
export function extractJobKeywords(jobDescription: string): ExtractedKeywords {
  const lines = jobDescription.split("\n")
  let currentSection: "general" | "required" | "preferred" = "general"

  const requiredTerms: string[] = []
  const preferredTerms: string[] = []
  const generalTerms: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect section headers
    if (isRequirementsSection(trimmed)) {
      currentSection = "required"
      continue
    }
    if (isNiceToHaveSection(trimmed)) {
      currentSection = "preferred"
      continue
    }
    // Reset to general on empty lines or new section-like headers
    if (!trimmed) continue

    const words = tokenize(trimmed)
    const target =
      currentSection === "required"
        ? requiredTerms
        : currentSection === "preferred"
          ? preferredTerms
          : generalTerms

    target.push(...words)
  }

  // Count term frequency to prioritize repeated terms
  const freq = new Map<string, number>()
  for (const term of [...requiredTerms, ...preferredTerms, ...generalTerms]) {
    freq.set(term, (freq.get(term) || 0) + 1)
  }

  // Extract meaningful phrases (2-3 word n-grams that appear in requirements)
  const requirementsSections = lines
    .join("\n")
    .split(/\n\s*\n/)
    .filter((section) =>
      section.split("\n").some((line) => isRequirementsSection(line.trim()))
    )
    .join("\n")

  const phrases = extractNgrams(requirementsSections || jobDescription, 3)
  const phraseFreq = new Map<string, number>()
  for (const phrase of phrases) {
    if (phrase.split(" ").length >= 2) {
      phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1)
    }
  }

  // Keep phrases that appear at least once and aren't all stop words
  const meaningfulPhrases = [...phraseFreq.entries()]
    .filter(([phrase, count]) => count >= 1 && phrase.split(" ").length >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase)
    .slice(0, 50)

  // Deduplicate
  const required = [...new Set(requiredTerms)]
  const preferred = [...new Set(preferredTerms)]
  const all = [
    ...new Set([...requiredTerms, ...preferredTerms, ...generalTerms]),
  ]

  // Extract skill-like terms (technical terms, tools, languages)
  const skills = extractSkillTerms(jobDescription)

  return { required, preferred, all, phrases: meaningfulPhrases, skills }
}

/**
 * Extract technical skill terms from text.
 * Matches against common technology/tool/methodology patterns.
 */
function extractSkillTerms(text: string): string[] {
  const normalized = text.toLowerCase()
  const found: string[] = []

  for (const skill of COMMON_SKILLS) {
    const pattern = new RegExp(`\\b${escapeRegex(skill)}\\b`, "i")
    if (pattern.test(normalized)) {
      found.push(skill)
    }
  }

  return [...new Set(found)]
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Check if a keyword appears in text, with fuzzy matching for compound terms.
 * E.g., "project management" matches "managing projects" or "managed a project".
 */
export function fuzzyMatch(keyword: string, text: string): boolean {
  const normalizedKeyword = normalizeText(keyword)
  const normalizedText = normalizeText(text)

  // Exact substring match
  if (normalizedText.includes(normalizedKeyword)) return true

  // For single-word keywords, check word boundaries
  if (!normalizedKeyword.includes(" ")) {
    const words = normalizedText.split(" ")
    // Check stem-like matching (crude but effective without a stemmer)
    return words.some((w) => {
      // Match if either word starts with the other (min 4 chars)
      if (w.length < 4 || normalizedKeyword.length < 4) return w === normalizedKeyword
      return w.startsWith(normalizedKeyword.slice(0, -1)) || normalizedKeyword.startsWith(w.slice(0, -1))
    })
  }

  // For multi-word keywords, check if all significant words appear
  const keywordWords = normalizedKeyword.split(" ").filter((w) => !STOP_WORDS.has(w))
  if (keywordWords.length === 0) return false

  return keywordWords.every((kw) => {
    if (kw.length < 4) return normalizedText.includes(kw)
    return normalizedText.split(" ").some(
      (w) => w.startsWith(kw.slice(0, -1)) || kw.startsWith(w.slice(0, -1))
    )
  })
}

/**
 * Common technology skills, tools, and methodology terms.
 * These are matched case-insensitively against job descriptions and resumes.
 */
const COMMON_SKILLS = [
  // Programming Languages
  "javascript", "typescript", "python", "java", "c#", "c++", "ruby", "go",
  "golang", "rust", "swift", "kotlin", "php", "scala", "r", "matlab",
  "perl", "haskell", "elixir", "dart", "lua", "sql", "nosql",

  // Web Frameworks & Libraries
  "react", "reactjs", "react.js", "next.js", "nextjs", "angular", "vue",
  "vuejs", "vue.js", "svelte", "ember", "backbone", "jquery", "express",
  "nestjs", "fastify", "django", "flask", "rails", "spring", "asp.net",
  "laravel", "remix", "gatsby", "nuxt",

  // Mobile
  "react native", "flutter", "ios", "android", "xamarin", "ionic",
  "swiftui", "jetpack compose",

  // Databases
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  "dynamodb", "cassandra", "sqlite", "oracle", "sql server", "firestore",
  "supabase", "prisma", "drizzle", "sequelize",

  // Cloud & DevOps
  "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
  "terraform", "ansible", "jenkins", "github actions", "ci/cd", "cicd",
  "circleci", "gitlab", "vercel", "netlify", "heroku", "cloudflare",
  "nginx", "apache",

  // Data & AI/ML
  "machine learning", "deep learning", "nlp", "natural language processing",
  "computer vision", "tensorflow", "pytorch", "scikit-learn", "pandas",
  "numpy", "spark", "hadoop", "data science", "data engineering",
  "data analytics", "data visualization", "tableau", "power bi",
  "bigquery", "snowflake", "airflow", "dbt", "etl",

  // Design & UX
  "figma", "sketch", "adobe xd", "invision", "prototyping", "wireframing",
  "user research", "usability testing", "design systems", "ui design",
  "ux design", "interaction design", "information architecture",
  "design thinking", "accessibility", "wcag", "a11y",

  // Project Management & Methodologies
  "agile", "scrum", "kanban", "jira", "confluence", "asana", "trello",
  "waterfall", "lean", "six sigma", "pmp", "prince2", "safe",
  "product management", "project management", "program management",
  "stakeholder management", "cross-functional",

  // Testing
  "jest", "mocha", "cypress", "selenium", "playwright", "testing library",
  "unit testing", "integration testing", "e2e testing", "tdd", "bdd",
  "qa", "quality assurance",

  // APIs & Protocols
  "rest", "restful", "graphql", "grpc", "websocket", "oauth", "jwt",
  "api design", "openapi", "swagger", "microservices", "event-driven",

  // Soft Skills & Business
  "leadership", "communication", "problem solving", "teamwork",
  "collaboration", "mentoring", "coaching", "strategic planning",
  "critical thinking", "analytical", "presentation", "negotiation",
  "customer service", "client facing", "stakeholder",

  // Other Technologies
  "git", "linux", "unix", "bash", "powershell", "webpack", "vite",
  "node.js", "nodejs", "deno", "bun", "graphql", "tailwind",
  "tailwindcss", "css", "html", "sass", "less", "styled components",
  "material ui", "chakra ui", "bootstrap", "storybook",
  "redux", "mobx", "zustand", "recoil", "context api",
  "sentry", "datadog", "new relic", "grafana", "prometheus",
  "rabbitmq", "kafka", "sqs", "sns", "pubsub",
  "stripe", "twilio", "sendgrid", "auth0", "clerk",
  "contentful", "sanity", "strapi", "wordpress",
  "blockchain", "web3", "solidity", "ethereum",
  "ar", "vr", "unity", "unreal engine",
]
