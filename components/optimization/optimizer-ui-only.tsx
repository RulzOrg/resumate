"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  AlertTriangle,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy as CopyIcon,
  Download,
  FileText,
  Grid,
  Hash,
  PencilLine,
  RefreshCcw,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Type,
  Eye,
  Wand2,
  WandSparkles,
} from "lucide-react"
import { toast } from "sonner"
import { scoreFit, rephraseBullet, rewriteResume } from "@/lib/api"
import type { EvidencePoint, ScoreBreakdown } from "@/lib/match"

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

const initialEditorHtml = `
  <div class="text-lg font-space-grotesk font-semibold tracking-tight">Sarah Johnson</div>
  <div class="text-foreground/70 dark:text-white/70">Senior Product Manager • sjohnson@example.com • San Francisco, CA</div>
  <div class="h-px bg-surface-muted dark:bg-white/10 my-4"></div>

  <div class="font-medium text-foreground/90 dark:text-white/90">Summary</div>
  <p class="mt-1 text-foreground/80 dark:text-white/80">Product leader with 7+ years delivering developer-facing platforms. Drives roadmap with data-informed experimentation and cross-functional collaboration. Deep familiarity with frontend frameworks and performance tooling.</p>

  <div class="font-medium text-foreground/90 dark:text-white/90 mt-4">Experience</div>
  <div class="mt-1">
    <div class="flex items-center justify-between">
      <div class="font-medium">Product Manager, Developer Experience — Acme Cloud</div>
      <div class="text-foreground/50 dark:text-white/50 text-xs">2021 — Present</div>
    </div>
    <ul class="list-disc pl-5 mt-1 space-y-1 text-foreground/80 dark:text-white/80">
      <li>Owned DX platform roadmap; shipped features improving build performance by 28% and deploy reliability by 15%.</li>
      <li>Led A/B tests on onboarding; increased activation by 12% across 50k+ developers.</li>
      <li>Partnered with design and engineering to launch workflow analytics; reduced time-to-diagnosis by 35%.</li>
    </ul>
  </div>

  <div class="mt-3">
    <div class="flex items-center justify-between">
      <div class="font-medium">Product Manager — Beta Tools</div>
      <div class="text-foreground/50 dark:text-white/50 text-xs">2018 — 2021</div>
    </div>
    <ul class="list-disc pl-5 mt-1 space-y-1 text-foreground/80 dark:text-white/80">
      <li>Prioritized roadmap via discovery, SQL analyses, and customer research with enterprise users.</li>
      <li>Launched API-based integrations enabling 3rd-party workflows; +200 partners in first year.</li>
      <li>Introduced experimentation platform governance; standardized metrics and guardrails.</li>
    </ul>
  </div>

  <div class="font-medium text-foreground/90 dark:text-white/90 mt-4">Skills</div>
  <p class="text-foreground/80 dark:text-white/80">Roadmapping, Product Discovery, A/B Testing, Analytics (SQL), Frontend Frameworks, API Design, Developer Experience, Enterprise</p>

  <div class="font-medium text-foreground/90 dark:text-white/90 mt-4">Education</div>
  <p class="text-foreground/80 dark:text-white/80">B.S. in Computer Science — University of Somewhere</p>
`

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

const mockResumeOptions: ResumeOption[] = [
  {
    id: "mock-resume-1",
    label: "Sarah Johnson — Product Leader (Master)",
    fileName: "Sarah_Johnson_Resume_2024.pdf",
    fileType: "application/pdf",
    fileSize: 164 * 1024,
    updatedAt: new Date().toISOString(),
    isPrimary: true,
  },
  {
    id: "mock-resume-2",
    label: "General Tech Resume v2",
    fileName: "General_Tech_Resume_v2.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 120 * 1024,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-resume-3",
    label: "PM Master V3",
    fileName: "PM_Master_V3.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 132 * 1024,
    updatedAt: new Date().toISOString(),
  },
]

const mockJobOptions: JobOption[] = [
  {
    id: "mock-job-1",
    jobTitle: "Senior Product Manager",
    companyName: "Vercel",
    jobDescription:
      "Vercel is seeking a Senior Product Manager to drive the roadmap for our developer experience. You will define strategy, collaborate with engineering and design, and ship products that improve performance, reliability, and developer workflows. Responsibilities include product discovery, roadmap prioritization, A/B testing, and launching user-facing features. Requirements: 6+ years PM experience, strong technical background, familiarity with frontend frameworks, experimentation platforms, SQL, and analytics. Nice to have: experience with platform products, devtools, enterprise customers, and API design.",
    keywords: ["roadmap", "developer", "experimentation", "frontend", "sql", "platform", "enterprise"],
    requiredSkills: ["Roadmap", "A/B Testing", "Frontend", "Analytics"],
    niceToHave: ["API design", "Enterprise"]
  },
]

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
  const resolvedResumes = resumes && resumes.length > 0 ? resumes : mockResumeOptions
  const resolvedJobs = jobOptions && jobOptions.length > 0 ? jobOptions : mockJobOptions

  const resolvedInitialResume =
    initialResume || resolvedResumes.find((r) => r.isPrimary) || resolvedResumes[0] || null
  const resolvedInitialJob = initialJob || resolvedJobs[0] || null

  const [step, setStep] = useState<Step>(1)
  const [selectedResume, setSelectedResume] = useState<string>(resolvedInitialResume?.id ?? mockResumeOptions[0].id)
  const [resumeMenuOpen, setResumeMenuOpen] = useState(false)
  const [jobDesc, setJobDesc] = useState(
    resolvedInitialJob?.jobDescription ?? mockJobOptions[0].jobDescription
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

  // Async states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizeError, setOptimizeError] = useState<string | null>(null)
  const [optimizedId, setOptimizedId] = useState<string | null>(null)

  // Step 2: evidence & scoring state
  const [isScoring, setIsScoring] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<EvidencePoint[]>([])
  const [score, setScore] = useState<ScoreBreakdown | null>(null)
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<Set<string>>(new Set())
  const [editedEvidence, setEditedEvidence] = useState<Record<string, string>>({})
  const [rephrasingId, setRephrasingId] = useState<string | null>(null)

  const [editorHtml, setEditorHtml] = useState<string>(initialEditorHtml)
  const [baseEditorHtml] = useState<string>(initialEditorHtml)
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

  const resumeText = useMemo(() => {
    if (typeof document === "undefined") return ""
    const tmp = document.createElement("div")
    tmp.innerHTML = editorHtml
    return tmp.textContent || (tmp as any).innerText || ""
  }, [editorHtml])

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
    setKeywords(extractKeywords(jobDesc))
  }, [])

  // Fetch evidence + score when entering Step 2 with a selected job
  useEffect(() => {
    async function run() {
      if (step !== 2 || !selectedJobId) return
      setIsScoring(true)
      setScoreError(null)
      try {
        const res = await scoreFit({ job_analysis_id: selectedJobId, resume_id: selectedResume, top_k: 5 })
        setEvidence(res.evidence || [])
        setScore(res.score || null)
        setSelectedEvidenceIds(new Set())
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

  const currentResume = useMemo(
    () => resolvedResumes.find((r) => r.id === selectedResume) ?? resolvedResumes[0],
    [selectedResume, resolvedResumes]
  )

  const reanalyze = () => setKeywords(extractKeywords(jobDesc))
  const replaceJD = () => {
    setJobDesc("")
    setKeywords([])
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
      setSelectedJobId(analysis?.id || null)
      if (Array.isArray(aiKeywords) && aiKeywords.length) setKeywords(aiKeywords)
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
      if (!Number.isNaN(remaining) && remaining <= 2) {
        toast.warning(`Approaching rate limit — ${remaining} request${remaining === 1 ? '' : 's'} left`)
      }
      toast.success('Job analyzed')
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
      let optimized: any
      if (selectedEvidenceIds.size > 0) {
        const payload = {
          resume_id: selectedResume,
          job_analysis_id: selectedJobId,
          selected_evidence: Array.from(selectedEvidenceIds).map((eid) => ({ evidence_id: eid })),
          options: { tone: config.tone, length: config.length },
        }
        const resp = await rewriteResume(payload)
        optimized = resp.optimized_resume
      } else {
        const res = await fetch('/api/resumes/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume_id: selectedResume, job_analysis_id: selectedJobId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to optimize')
        optimized = data.optimized_resume
      }
      if (optimized?.optimized_content) {
        setEditorHtml(mdToHtml(optimized.optimized_content))
      } else {
        // Fallback to local transform if server returned unexpected shape
        applyOptimizations()
      }
      const oid = optimized?.id || optimized?.optimized_resume_id || null
      if (oid) setOptimizedId(String(oid))
      setStep(4)
      toast.success('Optimized resume generated')
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

      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 space-y-8">
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
                      {resolvedResumes.map((resume) => (
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
                      ))}
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
                  className="w-full bg-transparent outline-none p-4 text-sm leading-6 placeholder-foreground/40 dark:placeholder-white/40 resize-y"
                  placeholder="Paste the full job description here..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                />
                <div className="border-t border-border dark:border-white/10 p-3 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-foreground/50 dark:text-white/50">Detected keywords:</span>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((k) => (
                        <span key={k} className="inline-flex items-center rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1 text-xs">
                          {k.replace(/^\w/, (c) => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 text-xs font-medium text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white"
                    onClick={reanalyze}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reanalyze
                  </button>
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
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground dark:text-white bg-surface-muted dark:bg-white/10 rounded-full py-2 px-4 hover:bg-surface-strong dark:hover:bg-white/20 transition-colors disabled:opacity-60"
                  onClick={handleAnalyzeWithAI}
                  disabled={isAnalyzing}
                  title="Analyze this job with AI to extract keywords and skills"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing…' : 'Analyze with AI'}
                </button>
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors disabled:opacity-60"
                  onClick={() => {
                    setStep(2)
                  }}
                  disabled={isAnalyzing}
                >
                  <Wand2 className="h-4 w-4" />
                  Continue
                </button>
              </div>
            </div>
          </div>

          {/* Review (Step 2) */}
          <div className={`${step === 2 ? "block" : "hidden"} rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Review Job</h2>
                <p className="text-sm text-foreground/60 dark:text-white/60 mt-1">Confirm alignment and address gaps before generating your tailored resume.</p>
              </div>
              <span className="text-xs text-foreground/50 dark:text-white/50">Step 2–3</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-medium">Match overview</span>
                  </div>
                  <span className="text-xs text-foreground/60 dark:text-white/60">{matchPct}% match</span>
                </div>
                <div className="mt-2">
                  <div className="w-full h-2 rounded-full bg-surface-muted dark:bg-white/10 overflow-hidden">
                    <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${matchPct}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-foreground/60 dark:text-white/60">
                    <span>Keywords coverage</span>
                    <span>{coveredCount}/{keywords.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span className="text-sm font-medium">Top keywords</span>
                  </div>
                  <button className="inline-flex items-center gap-1 text-xs text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white" onClick={reanalyze}>
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <span key={k} className="inline-flex items-center rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1 text-xs">
                      {k.replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>

              {/* Evidence & Scoring (server) */}
              <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4 lg:col-span-1">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-medium">AI score</span>
                  </div>
                  {isScoring ? (
                    <div className="text-xs text-foreground/60 dark:text-white/60">Scoring…</div>
                  ) : score ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between"><span>Overall</span><span className="text-foreground/80 dark:text-white/80">{score.overall}%</span></div>
                      {([['skills', 'Skills'], ['responsibilities','Responsibilities'], ['domain','Domain'], ['seniority','Seniority']] as const).map(([k, label]) => (
                        <div key={k}>
                          <div className="flex items-center justify-between"><span>{label}</span><span className="text-foreground/70 dark:text-white/70">{(score.dimensions as any)[k]}%</span></div>
                          <div className="w-full h-1.5 rounded bg-surface-muted dark:bg-white/10 overflow-hidden"><div className="h-1.5 bg-emerald-500" style={{ width: `${(score.dimensions as any)[k]}%` }}></div></div>
                        </div>
                      ))}
                      {score.missingMustHaves?.length > 0 && (
                        <div className="pt-2"><div className="text-foreground/70 dark:text-white/70 mb-1">Missing must‑haves</div>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {score.missingMustHaves.slice(0,6).map((m) => (<li key={m}>{m}</li>))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : scoreError ? (
                    <div className="text-xs text-red-400">{scoreError}</div>
                  ) : (
                    <div className="text-xs text-foreground/60 dark:text-white/60">No score yet.</div>
                  )}
                </div>
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4 lg:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="inline-flex items-center gap-2"><FileText className="h-4 w-4" /><span className="text-sm font-medium">Evidence</span></div>
                    <span className="text-xs text-foreground/60 dark:text-white/60">Selected: {selectedEvidenceIds.size}</span>
                  </div>
                  {isScoring ? (
                    <div className="text-xs text-foreground/60 dark:text-white/60">Fetching evidence…</div>
                  ) : evidence.length ? (
                    <ul className="space-y-2 text-sm">
                      {evidence.slice(0,20).map((ev) => {
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
                                        const { text } = await rephraseBullet({ evidence_id: eid, target_keywords: keywords.slice(0,5), style: 'concise' })
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
                </div>
              </div>

              {/* Skills breakdown */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <ListChecksIcon />
                    <span className="text-sm font-medium">Required skills</span>
                  </div>
                  {reqSkills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {reqSkills.map((s) => (
                        <span key={s} className="inline-flex items-center rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-foreground/60 dark:text-white/60">Run Analyze with AI to extract required skills.</div>
                  )}
                </div>
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <ListChecksIcon />
                    <span className="text-sm font-medium">Preferred skills</span>
                  </div>
                  {prefSkills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {prefSkills.map((s) => (
                        <span key={s} className="inline-flex items-center rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-foreground/60 dark:text-white/60">Run Analyze with AI to extract preferred skills.</div>
                  )}
                </div>
              </div>

              {/* Culture & Benefits */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <ListChecksIcon />
                    <span className="text-sm font-medium">Culture</span>
                  </div>
                  {culture.length ? (
                    <ul className="list-disc pl-5 text-xs text-foreground/80 dark:text-white/80 space-y-1">
                      {culture.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-foreground/60 dark:text-white/60">No culture details yet.</div>
                  )}
                </div>
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <ListChecksIcon />
                    <span className="text-sm font-medium">Benefits</span>
                  </div>
                  {benefits.length ? (
                    <ul className="list-disc pl-5 text-xs text-foreground/80 dark:text-white/80 space-y-1">
                      {benefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-foreground/60 dark:text-white/60">No benefits extracted yet.</div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
                <div className="inline-flex items-center gap-2 mb-2">
                  <ListChecksIcon />
                  <span className="text-sm font-medium">Key requirements</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keywords.map((k) => {
                    const covered = resumeText.toLowerCase().includes(k.toLowerCase())
                    return (
                      <div key={k} className="flex items-start gap-3 rounded-lg border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-3">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${covered ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 text-foreground/70 dark:text-white/70"}`}>
                          {covered ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{k.replace(/^\w/, (c) => c.toUpperCase())}</div>
                          <div className="text-xs text-foreground/60 dark:text-white/60 mt-0.5">{covered ? "Mentioned in your resume" : "Not detected — consider adding a relevant bullet or skill"}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
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
                className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors"
                onClick={() => {
                  setStep(3)
                  populateEmphasisFromJD()
                }}
              >
                <Sparkles className="h-4 w-4" />
                Continue to Optimize
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

          {/* Optimized (Final) */}
          <div className={`${step === 4 ? "block" : "hidden"} rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6 sm:p-8`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Optimized Resume</h2>
                <p className="text-sm text-foreground/60 dark:text-white/60 mt-1">Tailored to: {selectedJobTitle} — {selectedCompany}</p>
                {appliedSettingsChips}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`inline-flex items-center gap-2 text-sm font-medium rounded-full py-2 px-3 transition-colors ${editable ? "text-black bg-emerald-500 hover:bg-emerald-400" : "text-foreground dark:text-white bg-surface-muted dark:bg-white/10 hover:bg-surface-strong dark:hover:bg-white/20"}`}
                  onClick={() => setEditable((v) => !v)}
                >
                  <PencilLine className="h-4 w-4" />
                  {editable ? "Editing" : "Edit"}
                </button>
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground dark:text-white bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 rounded-full py-2 px-3 hover:bg-surface-strong dark:hover:bg-white/20 transition-colors"
                  onClick={async () => {
                    try {
                      const tmp = document.createElement("div")
                      tmp.innerHTML = editorHtml
                      await navigator.clipboard.writeText(tmp.innerText.trim())
                    } catch {}
                  }}
                >
                  <CopyIcon className="h-4 w-4" />
                  Copy
                </button>
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-3 hover:bg-emerald-400 transition-colors"
                  onClick={() => {
                    const w = window.open("", "_blank", "width=900,height=700")
                    if (!w) return
                    const html = `
                      <html>
                        <head>
                          <title>Optimized Resume</title>
                          <meta charset="utf-8" />
                          <style>
                            body { font-family: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.45; padding:32px; }
                            h1, h2, h3 { margin: 0 0 8px 0; }
                            .hr { height:1px; background:#e5e7eb; margin:16px 0; }
                            ul { margin: 8px 0 0 18px; }
                            .small { color:#6b7280; font-size:12px; }
                            strong { font-weight: 600; }
                          </style>
                        </head>
                        <body>
                          ${editorHtml.replace(/color:\s*rgba\(255,255,255,[^)]+\);?/gi, "")}
                          <div class="small" style="margin-top:24px;">Generated by ResuMate AI</div>
                          <script>window.onload = () => setTimeout(()=>window.print(), 50)<\/script>
                        </body>
                      </html>
                    `
                    w.document.open()
                    w.document.write(html)
                    w.document.close()
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                {optimizedId && (
                  <Link
                    href={`/dashboard/optimized/${optimizedId}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground dark:text-white bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 rounded-full py-2 px-3 hover:bg-surface-strong dark:hover:bg-white/20 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40">
              <div
                ref={editorRef}
                contentEditable={editable}
                suppressContentEditableWarning
                className="prose-invert p-5 text-sm leading-6 outline-none"
                dangerouslySetInnerHTML={{ __html: editorHtml }}
                onInput={(e) => setEditorHtml((e.target as HTMLDivElement).innerHTML)}
              />
              <div className="border-t border-border dark:border-white/10 p-3 flex items-center justify-between">
                <div className="text-xs text-foreground/60 dark:text-white/60">Editable content. Use the toolbar above to toggle edit or download.</div>
                <button
                  className="inline-flex items-center gap-2 text-xs font-medium text-foreground/80 dark:text-white/80 hover:text-foreground dark:hover:text-white"
                  onClick={() => {
                    // simple refine: bold first two keywords in skills
                    const keys = keywords.slice(0, 5).map((k) => k.toLowerCase())
                    const skillsRegex2 = new RegExp(
                      '(<div class=\\"font-medium text-foreground dark:text-white\\\\/90 mt-4\\">Skills<\\/div>\\s*<p class=\\"text-foreground dark:text-white\\\\/80\\">)([^<]+)(<\\/p>)',
                      'i'
                    )
                    const html = editorHtml.replace(
                      skillsRegex2,
                      (_m: string, a: string, skills: string, c: string) => {
                        const parts = skills.split(/,\s*/).map((s) => {
                          const base = s.trim()
                          const b = base.toLowerCase()
                          return keys.some((k) => b.includes(k)) ? `<strong>${base}</strong>` : base
                        })
                        return `${a}${parts.join(", ")}${c}`
                      }
                    )
                    setEditorHtml(html)
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Refine
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8 mt-8 lg:mt-0">
          <div className="rounded-2xl border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-foreground/90 dark:text-white/90">Job Summary</h3>
              <span className="text-xs font-medium text-foreground/50 dark:text-white/50">{resolvedJobs.length ? "Imported" : "Mock"}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-foreground/70 dark:text-white/70" />
                </div>
                <div>
                  <div className="text-sm font-medium">{selectedJobTitle || "Job title"}</div>
                  <div className="text-xs text-foreground/60 dark:text-white/60">{selectedCompany || "Company"}{jobLocation ? ` • ${jobLocation}` : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 flex items-center justify-center">
                  <ScaleIcon />
                </div>
                <div>
                  <div className="text-sm font-medium">Seniority</div>
                  <div className="text-xs text-foreground/60 dark:text-white/60">{jobSeniority || "Senior • IC"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-surface-subtle dark:bg-white/5 border border-border/80 dark:border-white/10 flex items-center justify-center">
                  <Grid className="h-4 w-4 text-foreground/70 dark:text-white/70" />
                </div>
                <div>
                  <div className="text-sm font-medium">Category</div>
                  <div className="text-xs text-foreground/60 dark:text-white/60">{resolvedInitialJob?.category ?? "Developer Experience • Platform"}</div>
                </div>
              </div>
              <div className="pt-2">
                <div className="text-xs text-foreground/60 dark:text-white/60 mb-1">Top skills</div>
                <div className="flex flex-wrap gap-2">
                  {(keywords.length ? keywords : ["Roadmap", "A/B Testing", "Analytics", "Frontend", "APIs"]).map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full bg-surface-muted dark:bg-white/10 border border-border dark:border-white/10 px-2.5 py-1 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

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
      </div>
    </div>
  )
}

function ListChecksIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 18H3" /><path d="M11 12H3" /><path d="M11 6H3" /><path d="m14 19 2 2 4-4" /><path d="m14 13 2 2 4-4" />
    </svg>
  )
}

function ScaleIcon() {
  return (
    <svg className="h-4 w-4 text-foreground/70 dark:text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18" />
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M5 7l-3 5h6l-3-5Z" />
      <path d="M19 7l-3 5h6l-3-5Z" />
    </svg>
  )
}
