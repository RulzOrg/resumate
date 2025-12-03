"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

// Safe Link component that handles SSR issues
const SafeLink = ({ href, children, className, ...props }: any) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <span className={className} {...props}>
        {children}
      </span>
    )
  }

  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  )
}

import {
  ArrowLeft,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Hash,
  RefreshCcw,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Type,
  Wand2,
  WandSparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { scoreFit, rephraseBullet } from "@/lib/api"
import type { EvidencePoint, ScoreBreakdown } from "@/lib/match"
import type { CategorizedSkills } from "@/lib/skills/categorizer"
import { ResumeEditorV2 } from "./resume-editor-v2"
import { ScoreHero } from "./score-hero"
import { SkillsAnalysis } from "./skills-analysis"
import { JobDetailsCard } from "./job-details-card"

type Step = 1 | 2 | 3 | 4

type ResumeOption = {
  id: string
  label: string
  fileName?: string
  fileType?: string
  fileSize?: number
  updatedAt?: string
  isPrimary?: boolean
}

type JobOption = {
  id: string
  jobTitle: string
  companyName?: string
  jobDescription: string
  keywords?: string[]
  requiredSkills?: string[]
  niceToHave?: string[]
  location?: string
  experienceLevel?: string
  category?: string
  matchScore?: number
}

// Removed hardcoded mock resume - will use actual user data or show empty state

function extractKeywords(text: string) {
  const stop = new Set([
    "the",
    "and",
    "a",
    "to",
    "of",
    "in",
    "for",
    "with",
    "that",
    "you",
    "on",
    "is",
    "are",
    "by",
    "be",
    "or",
    "as",
    "an",
    "our",
    "we",
    "will",
    "your",
    "from",
    "have",
    "has",
    "this",
    "into",
    "across",
    "year",
    "years",
    "pm",
    "experience",
  ])
  const counts: Record<string, number> = {}
  text
    .toLowerCase()
    .replace(/[^a-z0-9+/#.\s-]/g, " ")
    .split(/\s+/)
    .forEach((w) => {
      if (!w || stop.has(w) || w.length < 3) return
      counts[w] = (counts[w] || 0) + 1
    })
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([w]) => w)
  return top
}

interface OptimizerUiOnlyProps {
  resumes?: ResumeOption[]
  initialResume?: ResumeOption | null
  jobOptions?: JobOption[]
  initialJob?: JobOption | null
}

// Mock data removed - component should handle empty states gracefully

const formatFileMeta = (resume: ResumeOption) => {
  const parts: string[] = []
  if (resume.fileType?.toLowerCase().includes("pdf")) {
    parts.push("PDF")
  } else if (resume.fileType?.toLowerCase().includes("word")) {
    parts.push("DOCX")
  }
  if (typeof resume.fileSize === "number") {
    const kb = Math.max(1, Math.round(resume.fileSize / 1024))
    parts.push(`${kb} KB`)
  }
  return parts.join(" • ")
}

export default function OptimizerUiOnly({
  resumes,
  initialResume,
  jobOptions,
  initialJob,
}: OptimizerUiOnlyProps) {
  const [mounted, setMounted] = useState(false)

  const resolvedResumes = useMemo(() => resumes || [], [resumes])
  const resolvedJobs = useMemo(() => jobOptions || [], [jobOptions])

  const resolvedInitialResume =
    initialResume || resolvedResumes.find((r) => r.isPrimary) || resolvedResumes[0] || null
  const resolvedInitialJob = initialJob || resolvedJobs[0] || null

  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [selectedResume, setSelectedResume] = useState<string>(resolvedInitialResume?.id ?? '')
  const [resumeMenuOpen, setResumeMenuOpen] = useState(false)
  const [jobDesc, setJobDesc] = useState(
    resolvedInitialJob?.jobDescription ?? ''
  )
  const [keywords, setKeywords] = useState<string[]>(resolvedInitialJob?.keywords ?? [])
  const [reqSkills, setReqSkills] = useState<string[]>(resolvedInitialJob?.requiredSkills ?? [])
  const [prefSkills, setPrefSkills] = useState<string[]>(resolvedInitialJob?.niceToHave ?? [])
  const [keyReqs, setKeyReqs] = useState<string[]>([])
  const [culture, setCulture] = useState<string[]>([])
  const [benefits, setBenefits] = useState<string[]>([])
  const [jobLocation, setJobLocation] = useState<string | undefined>(resolvedInitialJob?.location)
  const [jobSeniority, setJobSeniority] = useState<string | undefined>(resolvedInitialJob?.experienceLevel)

  // Active job selection metadata for API calls and display
  const [selectedJobId, setSelectedJobId] = useState<string | null>(resolvedInitialJob?.id ?? null)
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>(resolvedInitialJob?.jobTitle ?? "Target Role")
  const [selectedCompany, setSelectedCompany] = useState<string>(resolvedInitialJob?.companyName ?? "Company")

  // Categorized skills state
  const [categorizedSkills, setCategorizedSkills] = useState<CategorizedSkills | null>(null)
  const [skillMatch, setSkillMatch] = useState<{
    hard: { matched: number; total: number }
    soft: { matched: number; total: number }
    other: { matched: number; total: number }
  } | null>(null)

  // Async states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasAnalyzedInSession, setHasAnalyzedInSession] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizeError, setOptimizeError] = useState<string | null>(null)
  const [optimizedId, setOptimizedId] = useState<string | null>(null)
  const [optimizedMarkdown, setOptimizedMarkdown] = useState<string>('')
  const [structuredOutput, setStructuredOutput] = useState<any>(null)

  // Step 2: evidence & scoring state
  const [isScoring, setIsScoring] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<EvidencePoint[]>([])
  const [score, setScore] = useState<ScoreBreakdown | null>(null)
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<Set<string>>(new Set())
  const [editedEvidence, setEditedEvidence] = useState<Record<string, string>>({})
  const [rephrasingId, setRephrasingId] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [qdrantWarning, setQdrantWarning] = useState<string | null>(null)

  // Master resume content for match calculation (before optimization)
  const [masterResumeContent, setMasterResumeContent] = useState<string>('')
  const [isLoadingResumeContent, setIsLoadingResumeContent] = useState(false)

  const [editorHtml, setEditorHtml] = useState<string>('')
  const [baseEditorHtml] = useState<string>('')
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [editable, setEditable] = useState(false)

  function mdToHtml(md: string): string {
    try {
      // Very lightweight markdown-to-HTML for headings, lists, newlines
      let html = md
        .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
        .replace(/^\*\s+(.*)$/gm, '<li>$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Wrap list items
      html = html.replace(/(<li>[\s\S]*?<\/li>)(\n(?=<li>)|$)/g, '<ul>$1</ul>')
      // Paragraphs
      html = html
        .split(/\n\n+/)
        .map((para) => (/(<h\d|<ul|<li)/.test(para) ? para : `<p>${para.replace(/\n/g, '<br/>')}</p>`))
        .join('\n')
      return html
    } catch {
      return `<pre>${md.replace(/</g, '&lt;')}</pre>`
    }
  }

  // Resume text for match calculation - use optimized content if available, otherwise master resume
  const resumeText = useMemo(() => {
    // If we have optimized content in the editor, use that
    if (editorHtml) {
      if (typeof document === "undefined") return ""
      const tmp = document.createElement("div")
      tmp.innerHTML = editorHtml
      return tmp.textContent || (tmp as any).innerText || ""
    }
    // Otherwise use the master resume content for match calculation
    return masterResumeContent || ""
  }, [editorHtml, masterResumeContent])

  const coveredCount = useMemo(() => {
    const lower = resumeText.toLowerCase()
    let covered = 0
    for (const k of keywords) if (lower.includes(k.toLowerCase())) covered++
    return covered
  }, [resumeText, keywords])

  const matchPct = useMemo(() => {
    const total = keywords.length || 1
    return Math.round((coveredCount / total) * 100)
  }, [keywords.length, coveredCount])

  const [config, setConfig] = useState({
    tone: "neutral" as "neutral" | "impactful" | "executive",
    length: "standard" as "short" | "standard" | "detailed",
    ats: true,
    emphasize: [] as string[],
  })

  useEffect(() => {
    setMounted(true)
    if (jobDesc) {
      setKeywords(extractKeywords(jobDesc))
    }
  }, [jobDesc])

  // Real-time keyword extraction as user types (debounced)
  useEffect(() => {
    if (!jobDesc || jobDesc.length < 50) return
    const timer = setTimeout(() => {
      setKeywords(extractKeywords(jobDesc))
    }, 1000) // 1 second debounce
    return () => clearTimeout(timer)
  }, [jobDesc])

  // Fetch evidence + score when entering Step 2 with a selected job
  useEffect(() => {
    async function run() {
      if (step !== 2 || !selectedJobId) return
      setIsScoring(true)
      setScoreError(null)
      setQdrantWarning(null)
      try {
        const res = await scoreFit({ job_analysis_id: selectedJobId, resume_id: selectedResume, top_k: 5 })
        setEvidence(res.evidence || [])
        setScore(res.score || null)
        setDebugInfo((res as any).debug || null)
        setSelectedEvidenceIds(new Set())

        // Check for Qdrant availability warning
        if ((res as any).debug?.qdrantAvailable === false || (res as any).debug?.warning) {
          setQdrantWarning((res as any).debug?.warning || 'Vector search unavailable - evidence scoring may be limited')
        }
      } catch (e: any) {
        setScoreError(e?.error || e?.message || 'Failed to score')
        setEvidence([])
        setScore(null)
      } finally {
        setIsScoring(false)
      }
    }
    run()
  }, [step, selectedJobId, selectedResume])

  // Fetch master resume content for match calculation
  useEffect(() => {
    async function fetchResumeContent() {
      if (!selectedResume) {
        setMasterResumeContent('')
        return
      }

      setIsLoadingResumeContent(true)
      try {
        const res = await fetch(`/api/resumes/${selectedResume}`)
        if (res.ok) {
          const data = await res.json()
          setMasterResumeContent(data.resume?.content_text || '')
        } else {
          console.error('Failed to fetch resume content')
          setMasterResumeContent('')
        }
      } catch (e) {
        console.error('Error fetching resume content:', e)
        setMasterResumeContent('')
      } finally {
        setIsLoadingResumeContent(false)
      }
    }
    fetchResumeContent()
  }, [selectedResume])

  const currentResume = useMemo(
    () => resolvedResumes.find((r) => r.id === selectedResume) ?? resolvedResumes[0],
    [selectedResume, resolvedResumes]
  )

  const reanalyze = () => {
    setKeywords(extractKeywords(jobDesc))
    setCategorizedSkills(null)
    setSkillMatch(null)
  }
  const replaceJD = () => {
    setJobDesc("")
    setKeywords([])
    setCategorizedSkills(null)
    setSkillMatch(null)
    setHasAnalyzedInSession(false) // Reset analysis flag when replacing job description
  }

  const removeKeyword = (keywordToRemove: string) => {
    // Update flat keywords array
    setKeywords(prev => prev.filter(k => k !== keywordToRemove))

    // Update categorized skills if they exist
    if (categorizedSkills) {
      setCategorizedSkills(prev => {
        if (!prev) return null
        return {
          hard: prev.hard.filter(s => s !== keywordToRemove),
          soft: prev.soft.filter(s => s !== keywordToRemove),
          other: prev.other.filter(s => s !== keywordToRemove)
        }
      })
    }
  }

  const populateEmphasisFromJD = () => setConfig((c) => ({ ...c, emphasize: extractKeywords(jobDesc) }))

  async function handleAnalyzeWithAI() {
    setAnalyzeError(null)
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: selectedJobTitle || 'Target Role',
          company_name: selectedCompany || 'Company',
          job_description: jobDesc,
        }),
      })
      // Rate limit feedback
      const remainingHeader = res.headers.get('x-ratelimit-remaining') || res.headers.get('x-rate-limit-remaining') || res.headers.get('ratelimit-remaining')
      const resetHeader = res.headers.get('x-ratelimit-reset') || res.headers.get('x-rate-limit-reset') || res.headers.get('ratelimit-reset') || res.headers.get('retry-after')
      const remaining = remainingHeader ? Number(remainingHeader) : NaN
      if (!res.ok) {
        if (res.status === 429) {
          const secs = resetHeader ? Number(resetHeader) : undefined
          toast.error(`Rate limit reached${secs ? ` — retry in ~${secs}s` : ''}`)
        }
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to analyze job')
      const analysis = data.analysis
      const result = analysis?.analysis_result || analysis
      const aiKeywords = result?.keywords || result?.top_keywords || []
      const must = result?.required_skills || result?.requiredSkills || result?.must_have || []
      const nice = result?.preferred_skills || result?.preferredSkills || result?.nice_to_have || analysis?.niceToHave || []
      const reqs = result?.key_requirements || result?.requirements || []
      const cult = result?.culture || result?.culture_values || []
      const bens = result?.benefits || []
      const loc = result?.location || analysis?.location || jobLocation
      const senior = result?.experience_level || result?.seniority || analysis?.experienceLevel || jobSeniority

      // Extract categorized skills if available
      const categorized = result?.categorized_skills
      if (categorized && categorized.hard && categorized.soft && categorized.other) {
        setCategorizedSkills(categorized)
        // Also populate flat arrays for backward compatibility
        const allSkills = [...categorized.hard, ...categorized.soft, ...categorized.other]
        if (allSkills.length > 0) {
          setKeywords(allSkills)
        }
      } else if (Array.isArray(aiKeywords) && aiKeywords.length) {
        // Fallback to regular keywords if no categorization
        setKeywords(aiKeywords)
        setCategorizedSkills(null)
      }

      setSelectedJobId(analysis?.id || null)
      setReqSkills(Array.isArray(must) ? must : [])
      setPrefSkills(Array.isArray(nice) ? nice : [])
      setKeyReqs(Array.isArray(reqs) ? reqs : [])
      setCulture(Array.isArray(cult) ? cult : [])
      setBenefits(Array.isArray(bens) ? bens : [])
      setJobLocation(typeof loc === 'string' ? loc : jobLocation)
      setJobSeniority(typeof senior === 'string' ? senior : jobSeniority)
      // Update title/company from analysis if present
      if (analysis?.job_title) setSelectedJobTitle(analysis.job_title)
      if (analysis?.company_name) setSelectedCompany(analysis.company_name)

      // Fetch skill match ratios if we have a job ID and categorized skills
      if (analysis?.id && categorized) {
        try {
          const matchRes = await fetch(`/api/skills/match?jobId=${analysis.id}`)
          if (matchRes.ok) {
            const matchData = await matchRes.json()
            setSkillMatch(matchData.match)
          }
        } catch (e) {
          console.log('Could not fetch skill match ratios:', e)
        }
      }
      if (!Number.isNaN(remaining) && remaining <= 2) {
        toast.warning(`Approaching rate limit — ${remaining} request${remaining === 1 ? '' : 's'} left`)
      }
      toast.success('Job analyzed')
      setHasAnalyzedInSession(true) // Mark as analyzed in this session
    } catch (e: any) {
      setAnalyzeError(e?.message || 'Analysis failed')
      toast.error(e?.message || 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleGenerateOptimized() {
    setOptimizeError(null)
    if (!selectedJobId) {
      setOptimizeError('Please analyze the job first to proceed.')
      toast.error('Analyze the job first')
      return
    }
    setIsOptimizing(true)
    try {
      // Always use v2 optimizer endpoint for better structured output
      const payload: any = {
        resume_id: selectedResume,
        job_analysis_id: selectedJobId,
        preferences: {
          tone: config.tone,                    // 'neutral' | 'impactful' | 'executive'
          length_mode: config.length === 'short' ? 'short' : 'full',  // Map: short→short, standard/detailed→full
          ats_optimization: config.ats,         // true | false
          emphasize_keywords: config.emphasize  // keywords to emphasize
        }
      }

      // Include selected evidence IDs if user selected any
      if (selectedEvidenceIds.size > 0) {
        payload.selected_evidence_ids = Array.from(selectedEvidenceIds)
        console.log(`[Optimizer] Sending ${payload.selected_evidence_ids.length} selected evidence IDs to v2 optimizer`)
      }

      const res = await fetch('/api/resumes/optimize-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to optimize')

      const optimized = {
        id: data.optimized_resume.id,
        structured_output: data.structured_output,
        optimized_content: data.structured_output?.tailored_resume_text?.ats_plain_text || data.optimized_resume.optimized_content
      }

      // Store structured output for the form editor
      if (data.structured_output) {
        setStructuredOutput(data.structured_output)
      }
      if (optimized?.optimized_content) {
        // Store the original markdown for the structured editor
        setOptimizedMarkdown(optimized.optimized_content)
        // Also convert to HTML for any legacy preview needs
        setEditorHtml(mdToHtml(optimized.optimized_content))
      } else {
        // Fallback to local transform if server returned unexpected shape
        applyOptimizations()
      }
      const oid = optimized?.id || (optimized as any)?.optimized_resume_id || null
      if (oid) {
        setOptimizedId(String(oid))
        toast.success('Optimized resume generated! Redirecting to editor...')
        // Redirect to dedicated editor page for better UX and persistence
        setTimeout(() => {
          router.push(`/dashboard/optimized/${oid}`)
        }, 1000)
      }
    } catch (e: any) {
      setOptimizeError(e?.message || 'Optimization failed')
      toast.error(e?.message || 'Optimization failed')
    } finally {
      setIsOptimizing(false)
    }
  }

  const applyOptimizations = () => {
    let html = baseEditorHtml
    // Tone update for Summary
    const summaryBase =
      "Product leader with 7+ years delivering developer-facing platforms. Drives roadmap with data-informed experimentation and cross-functional collaboration. Deep familiarity with frontend frameworks and performance tooling."
    const impactful =
      "Product leader with 7+ years delivering high-impact developer platforms. Drives roadmap with rigorous experimentation, decisive prioritization, and cross-functional leadership. Deep familiarity with frontend frameworks and performance tooling."
    const executive =
      "Senior product leader with 7+ years scaling developer platforms. Shapes strategy, aligns cross-functional teams, and delivers measurable outcomes through experimentation and disciplined execution."

    const summaryRegex = new RegExp(
      '(<div class=\\"font-medium text-foreground dark:text-white\\\\/90\\">Summary<\\/div>\\s*<p class=\\"mt-1 text-foreground dark:text-white\\\\/80\\">)([^<]+)(<\\/p>)',
      'i'
    )
    html = html.replace(
      summaryRegex,
      (_m: string, a: string, _content: string, c: string) => {
        const text = config.tone === "impactful" ? impactful : config.tone === "executive" ? executive : summaryBase
        return `${a}${text}${c}`
      }
    )

    // Length: short removes last bullet in each list
    if (config.length === "short" && typeof document !== "undefined") {
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      tmp.querySelectorAll("ul").forEach((ul) => {
        const items = ul.querySelectorAll("li")
        if (items.length > 2) ul.removeChild(items[items.length - 1])
      })
      html = tmp.innerHTML
    }

    // Emphasis: bold selected in Skills line
    if (config.emphasize.length) {
      const skillsRegex = new RegExp(
        '(<div class=\\"font-medium text-foreground dark:text-white\\\\/90 mt-4\\">Skills<\\/div>\\s*<p class=\\"text-foreground dark:text-white\\\\/80\\">)([^<]+)(<\\/p>)',
        'i'
      )
      html = html.replace(skillsRegex, (_m: string, a: string, skills: string, c: string) => {
        const parts = skills.split(/,\s*/).map((s) => {
          const b = s.trim()
          const lower = b.toLowerCase()
          return config.emphasize.some((k) => lower.includes(k.toLowerCase())) ? `<strong>${b}</strong>` : b
        })
        return `${a}${parts.join(", ")}${c}`
      })
    }

    setEditorHtml(html)
  }

  const appliedSettingsChips = useMemo(() => {
    const items = [
      { label: config.tone.charAt(0).toUpperCase() + config.tone.slice(1), icon: Type },
      { label: config.length.charAt(0).toUpperCase() + config.length.slice(1), icon: FileText },
      { label: config.ats ? "ATS on" : "ATS off", icon: Bot },
    ]
    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1">
            <it.icon className="h-3.5 w-3.5" />
            <span>{it.label}</span>
          </span>
        ))}
        {config.emphasize.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1">
            <Hash className="h-3.5 w-3.5" />
            <span>
              {config.emphasize
                .slice(0, 3)
                .map((k) => k.replace(/^\w/, (c) => c.toUpperCase()))
                .join(", ")}
              {config.emphasize.length > 3 ? ` +${config.emphasize.length - 3}` : ""}
            </span>
          </span>
        )}
      </div>
    )
  }, [config])

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 animate-pulse mx-auto mb-4"></div>
            <p className="text-white/60">Loading optimizer...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-2">
          <Link href="/dashboard" className="group inline-flex items-center gap-2 text-sm text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">AI Resume Optimization</h1>
        <p className="mt-1 text-base text-foreground/60 dark:text-white/60">
          Target: {selectedJobTitle} — {selectedCompany}
        </p>
      </div>

      <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full ${step === 1 ? "bg-emerald-500 text-black" : "bg-surface-muted dark:bg-white/10 text-foreground dark:text-white"} flex items-center justify-center text-sm font-medium`}>1</div>
            <span className={`text-sm font-medium ${step === 1 ? "text-foreground dark:text-white" : "text-foreground/80 dark:text-white/80"}`}>Select Master Resume</span>
          </div>
          <div className="h-px flex-1 bg-surface-muted dark:bg-white/10"></div>
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full ${step === 2 ? "bg-emerald-500 text-black" : "bg-surface-muted dark:bg-white/10 text-foreground dark:text-white"} flex items-center justify-center text-sm font-medium`}>2</div>
            <span className={`text-sm font-medium ${step === 2 ? "text-foreground dark:text-white" : "text-foreground/80 dark:text-white/80"}`}>Review Job</span>
          </div>
          <div className="h-px flex-1 bg-surface-muted dark:bg-white/10"></div>
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full ${step === 3 ? "bg-emerald-500 text-black" : "bg-surface-muted dark:bg-white/10 text-foreground dark:text-white"} flex items-center justify-center text-sm font-medium`}>3</div>
            <span className={`text-sm font-medium ${step === 3 ? "text-foreground dark:text-white" : "text-foreground/80 dark:text-white/80"}`}>Optimize</span>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${step !== 4 ? 'lg:grid-cols-3' : ''} lg:gap-8`}>
        <div className={`${step !== 4 ? 'lg:col-span-2' : ''} space-y-8`}>
          {/* Setup (Step 1) */}
          <div className={`${step === 1 ? "block" : "hidden"} relative rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8`}>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Setup</h2>
              <span className="text-xs text-foreground/50 dark:text-white/50">Step 1–2</span>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-foreground/80 dark:text-white/80">Master Resume</label>
              <div className="relative">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 px-4 py-3 text-sm hover:bg-muted dark:hover:bg-black/30 focus:outline-none"
                  onClick={() => setResumeMenuOpen((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-foreground/70 dark:text-white/70" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{currentResume?.label ?? "Select resume"}</p>
                      <p className="text-xs text-foreground/60 dark:text-white/60">
                        {currentResume?.updatedAt
                          ? `Updated ${new Date(currentResume.updatedAt).toLocaleDateString()}`
                          : "Uploaded resume"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-foreground/60 dark:text-white/60" />
                </button>

                {resumeMenuOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-border dark:border-white/10 bg-card/95 dark:bg-black/90 backdrop-blur-xl shadow-2xl">
                    <div className="p-2">
                      {resolvedResumes.length === 0 ? (
                        <div className="p-4 text-center text-sm text-foreground/60 dark:text-white/60">
                          No resumes uploaded yet. Please upload a resume first.
                        </div>
                      ) : (
                        resolvedResumes.map((resume) => (
                          <button
                            key={resume.id}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted dark:hover:bg-white/10 transition text-left"
                            onClick={() => {
                              setSelectedResume(resume.id)
                              setResumeMenuOpen(false)
                            }}
                          >
                            <div className="h-8 w-8 rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-foreground/70 dark:text-white/70" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{resume.label}</p>
                              <p className="text-xs text-foreground/60 dark:text-white/60">
                                {formatFileMeta(resume) || "Uploaded resume"}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground/80 dark:text-white/80">Analyzed Job Description</label>
                <button
                  className="inline-flex items-center gap-2 text-xs font-medium text-foreground/80 dark:text-white/80 hover:text-foreground dark:hover:text-white"
                  onClick={replaceJD}
                >
                  <RefreshCw className="h-4 w-4" />
                  Replace text
                </button>
              </div>
              <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40">
                <textarea
                  rows={8}
                  className="w-full bg-transparent outline-none p-4 text-sm leading-6 placeholder-foreground/40 dark:placeholder-white/40 resize-y disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Paste the full job description here..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  disabled={isAnalyzing}
                />
                <div className="border-t border-border dark:border-white/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-foreground/50 dark:text-white/50">Detected keywords:</span>
                    <button
                      className="inline-flex items-center gap-2 text-xs font-medium text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white"
                      onClick={reanalyze}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Reanalyze
                    </button>
                  </div>
                  {categorizedSkills ? (
                    <div className="space-y-3">
                      {/* Hard Skills */}
                      {categorizedSkills.hard.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-foreground/60 dark:text-white/60 mb-1.5">
                            Hard Skills {skillMatch && `(${skillMatch.hard.matched}/${skillMatch.hard.total})`}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {categorizedSkills.hard.map((skill) => (
                              <span key={`hard-${skill}`} className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 px-2.5 py-1 text-xs">
                                {skill.replace(/^\w/, (c) => c.toUpperCase())}
                                <button
                                  onClick={() => removeKeyword(skill)}
                                  className="inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  title={`Remove "${skill}"`}
                                  disabled={isAnalyzing}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Soft Skills */}
                      {categorizedSkills.soft.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-foreground/60 dark:text-white/60 mb-1.5">
                            Soft Skills {skillMatch && `(${skillMatch.soft.matched}/${skillMatch.soft.total})`}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {categorizedSkills.soft.map((skill) => (
                              <span key={`soft-${skill}`} className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/20 dark:border-green-500/30 px-2.5 py-1 text-xs">
                                {skill.replace(/^\w/, (c) => c.toUpperCase())}
                                <button
                                  onClick={() => removeKeyword(skill)}
                                  className="inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  title={`Remove "${skill}"`}
                                  disabled={isAnalyzing}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Keywords */}
                      {categorizedSkills.other.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-foreground/60 dark:text-white/60 mb-1.5">
                            Others {skillMatch && `(${skillMatch.other.matched}/${skillMatch.other.total})`}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {categorizedSkills.other.map((skill) => (
                              <span key={`other-${skill}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1 text-xs">
                                {skill.replace(/^\w/, (c) => c.toUpperCase())}
                                <button
                                  onClick={() => removeKeyword(skill)}
                                  className="inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  title={`Remove "${skill}"`}
                                  disabled={isAnalyzing}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : keywords.length > 0 ? (
                    // Fallback to regular keywords if no categorization
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map((k) => (
                        <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1 text-xs">
                          {k.replace(/^\w/, (c) => c.toUpperCase())}
                          <button
                            onClick={() => removeKeyword(k)}
                            className="inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            title={`Remove "${k}" keyword`}
                            disabled={isAnalyzing}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-foreground/50 dark:text-white/50">
                      Click "Analyze with AI" to extract keywords
                    </div>
                  )}
                </div>
              </div>
              {analyzeError && (
                <div className="mt-2 text-xs text-red-400">{analyzeError}</div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-foreground/60 dark:text-white/60">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                Ready to optimize
              </div>
              {hasAnalyzedInSession && !isAnalyzing ? (
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors"
                  onClick={() => {
                    setStep(2)
                  }}
                  title="Continue to next step"
                >
                  <Wand2 className="h-4 w-4" />
                  Continue
                </button>
              ) : (
                <button
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:bg-white/20 disabled:text-white/40"
                  onClick={handleAnalyzeWithAI}
                  disabled={isAnalyzing}
                  title="Analyze this job with AI to extract keywords and skills"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing…' : 'Analyze with AI'}
                </button>
              )}
            </div>
          </div>

          {/* Review (Step 2) */}
          <div className={`${step === 2 ? "block" : "hidden"} space-y-6`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Review Job</h2>
                <p className="text-sm text-foreground/60 dark:text-white/60 mt-1">Confirm alignment and address gaps before generating your tailored resume.</p>
              </div>
              <span className="text-xs text-foreground/50 dark:text-white/50">Step 2–3</span>
            </div>

            {/* 1. Score Hero */}
            <ScoreHero
              score={score}
              isLoading={isScoring}
              error={scoreError}
            />

            {/* 2. Skills Analysis */}
            <SkillsAnalysis
              keywords={keywords}
              categorizedSkills={categorizedSkills}
              resumeText={resumeText}
              onRemoveKeyword={removeKeyword}
              isAnalyzing={isAnalyzing}
            />

            {/* Qdrant Warning Banner */}
            {qdrantWarning && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-yellow-500 mb-1">Limited Evidence Search</div>
                    <div className="text-xs text-foreground/80 dark:text-white/80">{qdrantWarning}</div>
                    <div className="text-xs text-foreground/60 dark:text-white/60 mt-2">
                      Optimization will still work using AI analysis, but evidence-based scoring is unavailable.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Evidence List (Existing Logic) */}
            <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Evidence</span>
                </div>
                <span className="text-xs text-foreground/60 dark:text-white/60">Selected: {selectedEvidenceIds.size}</span>
              </div>

              {isScoring ? (
                <div className="text-xs text-foreground/60 dark:text-white/60">Fetching evidence…</div>
              ) : evidence.length ? (
                <ul className="space-y-2 text-sm">
                  {evidence.slice(0, 20).map((ev) => {
                    const eid = (ev.metadata as any)?.evidence_id || (ev.id?.includes(":") ? ev.id.split(":")[1] : ev.id)
                    const shown = editedEvidence[eid] || ev.text
                    const selected = selectedEvidenceIds.has(eid)
                    return (
                      <li key={ev.id} className={`rounded-lg border border-border dark:border-white/10 p-3 bg-surface-subtle dark:bg-white/5 ${selected ? 'ring-1 ring-emerald-500/40' : ''}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selected}
                            onChange={() => setSelectedEvidenceIds((s) => { const n = new Set(s); if (selected) n.delete(eid); else n.add(eid); return n })}
                          />
                          <div className="flex-1">
                            <div className="text-foreground/90 dark:text-white/90">{shown}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <button
                                className="inline-flex items-center gap-1 rounded border border-border dark:border-white/10 px-2 py-1 hover:bg-surface-muted dark:hover:bg-white/10"
                                disabled={rephrasingId === eid}
                                onClick={async () => {
                                  try {
                                    setRephrasingId(eid)
                                    const { text } = await rephraseBullet({ evidence_id: eid, target_keywords: keywords.slice(0, 5), style: 'concise' })
                                    setEditedEvidence((m) => ({ ...m, [eid]: text }))
                                  } catch (e: any) {
                                    toast.error(e?.error || e?.message || 'Rephrase failed')
                                  } finally {
                                    setRephrasingId(null)
                                  }
                                }}
                              >{rephrasingId === eid ? 'Rephrasing…' : 'Rephrase'}</button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="text-xs text-foreground/60 dark:text-white/60">No evidence found. Try adjusting queries or ensure resume is indexed.</div>
              )}

              {/* Debug Info Display */}
              {debugInfo && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-foreground/50 dark:text-white/50 hover:text-foreground/70 dark:hover:text-white/70">Debug info</summary>
                  <div className="mt-2 space-y-1 text-foreground/60 dark:text-white/60 font-mono text-[10px]">
                    <div>Queries: {debugInfo.totalQueries}</div>
                    <div>Evidence: {debugInfo.evidenceCount}</div>
                    <div>Duration: {debugInfo.searchDurationMs}ms</div>
                    <div>Qdrant: {debugInfo.qdrantAvailable ? '✓ Available' : '✗ Unavailable'}</div>
                  </div>
                </details>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground dark:text-white bg-surface-muted dark:bg-white/10 rounded-full py-2 px-4 hover:bg-surface-strong dark:hover:bg-white/20 transition-colors"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:bg-white/20 disabled:text-white/40"
                onClick={() => {
                  setStep(3)
                  populateEmphasisFromJD()
                }}
                disabled={isAnalyzing}
                title={isAnalyzing ? "Please wait for AI analysis to complete" : "Continue to optimization"}
              >
                <Wand2 className="h-4 w-4" />
                {isAnalyzing ? "Please wait..." : "Continue to Optimize"}
              </button>
            </div>
          </div>

          {/* Optimize (Step 3) */}
          <div className={`${step === 3 ? "block" : "hidden"} relative rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Optimize</h2>
                <p className="text-sm text-foreground/60 dark:text-white/60 mt-1">Choose preferences, then generate your tailored resume.</p>
              </div>
              <span className="text-xs text-foreground/50 dark:text-white/50">Step 3</span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-2">Tone</div>
                <div className="flex flex-wrap gap-2">
                  {["neutral", "impactful", "executive"].map((t) => {
                    const active = config.tone === t
                    return (
                      <button
                        key={t}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-border dark:border-white/10 px-3 py-1.5 text-xs font-medium ${active ? "bg-white text-black" : "bg-transparent text-foreground/70 dark:text-white/70 hover:bg-surface-muted dark:hover:bg-white/10"}`}
                        onClick={() => setConfig((c) => ({ ...c, tone: t as any }))}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-2">Emphasize</div>
                <div className="flex flex-wrap gap-2">
                  {(config.emphasize || []).map((k) => {
                    const active = (config.emphasize || []).includes(k)
                    return (
                      <button
                        key={k}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-border dark:border-white/10 px-3 py-1.5 text-xs font-medium ${active ? "bg-white text-black" : "bg-transparent text-foreground/70 dark:text-white/70 hover:bg-surface-muted dark:hover:bg-white/10"}`}
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            emphasize: active ? c.emphasize.filter((x) => x !== k) : [...c.emphasize, k],
                          }))
                        }
                      >
                        {k.replace(/^\w/, (c) => c.toUpperCase())}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-2">Length</div>
                  <div className="flex flex-wrap gap-2">
                    {["short", "standard", "detailed"].map((l) => {
                      const active = config.length === l
                      return (
                        <button
                          key={l}
                          className={`inline-flex items-center gap-1.5 rounded-full border border-border dark:border-white/10 px-3 py-1.5 text-xs font-medium ${active ? "bg-white text-black" : "bg-transparent text-foreground/70 dark:text-white/70 hover:bg-surface-muted dark:hover:bg-white/10"}`}
                          onClick={() => setConfig((c) => ({ ...c, length: l as any }))}
                        >
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-2">Formatting</div>
                  <button
                    className={`inline-flex items-center gap-2 rounded-xl border border-border dark:border-white/10 px-3 py-2 text-xs font-medium ${config.ats ? "bg-surface-muted dark:bg-white/10" : "bg-transparent"}`}
                    onClick={() => setConfig((c) => ({ ...c, ats: !c.ats }))}
                  >
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${config.ats ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-muted dark:bg-white/10 text-foreground/60 dark:text-white/60"}`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    ATS-friendly
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border/80 dark:border-white/20 p-4 text-xs text-foreground/60 dark:text-white/60">
                Tips: Keep tone consistent with company voice, emphasize 3–5 most relevant skills, and keep bullets tight and outcome-oriented.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground dark:text-white bg-surface-muted dark:bg-white/10 rounded-full py-2 px-4 hover:bg-surface-strong dark:hover:bg-white/20 transition-colors"
                onClick={() => setStep(2)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex flex-col items-end gap-2">
                {optimizeError && (
                  <div className="text-xs text-red-400 self-start">{optimizeError}</div>
                )}
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors disabled:opacity-60"
                  onClick={handleGenerateOptimized}
                  disabled={isOptimizing}
                >
                  <WandSparkles className="h-4 w-4" />
                  {isOptimizing ? 'Generating…' : selectedEvidenceIds.size > 0 ? 'Rewrite Using Selected Evidence' : 'Generate Optimized Resume'}
                </button>
              </div>
            </div>
          </div>

          {/* Optimized (Final) - Enhanced V2 Editor */}
          {step === 4 && structuredOutput && optimizedId && (
            <ResumeEditorV2
              optimizedId={optimizedId}
              structuredOutput={structuredOutput}
              jobTitle={selectedJobTitle}
              companyName={selectedCompany}
            />
          )}

          {/* Fallback message if no structured output */}
          {step === 4 && !structuredOutput && (
            <div className="rounded-lg border-2 border-dashed border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <p className="text-neutral-400">Resume editor requires structured output from optimization.</p>
              <p className="text-sm text-neutral-500 mt-2">Please re-optimize your resume to use the enhanced editor.</p>
            </div>
          )}
        </div>

        {/* Right column - Job Summary (hidden on Step 4) */}
        {step !== 4 && (
          <div className="space-y-8 mt-8 lg:mt-0">
            <JobDetailsCard
              jobTitle={selectedJobTitle}
              companyName={selectedCompany}
              location={jobLocation}
              seniority={jobSeniority}
              category={resolvedInitialJob?.category}
              culture={culture}
              benefits={benefits}
            />

            <div className="rounded-2xl border border-dashed border-border/80 dark:border-white/20 bg-transparent p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-foreground/80 dark:text-white/80" />
                </div>
                <div>
                  <div className="text-sm font-medium">Tip</div>
                  <div className="text-xs text-foreground/60 dark:text-white/60">Mirror role language, quantify outcomes, and prioritize relevant projects.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

