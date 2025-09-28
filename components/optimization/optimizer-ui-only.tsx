"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
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
  Wand2,
  WandSparkles,
} from "lucide-react"

type Step = 1 | 2 | 3 | 4

const initialEditorHtml = `
  <div class="text-lg font-space-grotesk font-semibold tracking-tight">Sarah Johnson</div>
  <div class="text-white/70">Senior Product Manager • sjohnson@example.com • San Francisco, CA</div>
  <div class="h-px bg-white/10 my-4"></div>

  <div class="font-medium text-white/90">Summary</div>
  <p class="mt-1 text-white/80">Product leader with 7+ years delivering developer-facing platforms. Drives roadmap with data-informed experimentation and cross-functional collaboration. Deep familiarity with frontend frameworks and performance tooling.</p>

  <div class="font-medium text-white/90 mt-4">Experience</div>
  <div class="mt-1">
    <div class="flex items-center justify-between">
      <div class="font-medium">Product Manager, Developer Experience — Acme Cloud</div>
      <div class="text-white/50 text-xs">2021 — Present</div>
    </div>
    <ul class="list-disc pl-5 mt-1 space-y-1 text-white/80">
      <li>Owned DX platform roadmap; shipped features improving build performance by 28% and deploy reliability by 15%.</li>
      <li>Led A/B tests on onboarding; increased activation by 12% across 50k+ developers.</li>
      <li>Partnered with design and engineering to launch workflow analytics; reduced time-to-diagnosis by 35%.</li>
    </ul>
  </div>

  <div class="mt-3">
    <div class="flex items-center justify-between">
      <div class="font-medium">Product Manager — Beta Tools</div>
      <div class="text-white/50 text-xs">2018 — 2021</div>
    </div>
    <ul class="list-disc pl-5 mt-1 space-y-1 text-white/80">
      <li>Prioritized roadmap via discovery, SQL analyses, and customer research with enterprise users.</li>
      <li>Launched API-based integrations enabling 3rd-party workflows; +200 partners in first year.</li>
      <li>Introduced experimentation platform governance; standardized metrics and guardrails.</li>
    </ul>
  </div>

  <div class="font-medium text-white/90 mt-4">Skills</div>
  <p class="text-white/80">Roadmapping, Product Discovery, A/B Testing, Analytics (SQL), Frontend Frameworks, API Design, Developer Experience, Enterprise</p>

  <div class="font-medium text-white/90 mt-4">Education</div>
  <p class="text-white/80">B.S. in Computer Science — University of Somewhere</p>
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

export default function OptimizerUiOnly() {
  const [step, setStep] = useState<Step>(2) // start at Review as per note
  const [selectedResume, setSelectedResume] = useState<string>("Sarah_Johnson_Resume_2024.pdf")
  const [resumeMenuOpen, setResumeMenuOpen] = useState(false)
  const [jobDesc, setJobDesc] = useState(
    "Vercel is seeking a Senior Product Manager to drive the roadmap for our developer experience. You will define strategy, collaborate with engineering and design, and ship products that improve performance, reliability, and developer workflows. Responsibilities include product discovery, roadmap prioritization, A/B testing, and launching user-facing features. Requirements: 6+ years PM experience, strong technical background, familiarity with frontend frameworks, experimentation platforms, SQL, and analytics. Nice to have: experience with platform products, devtools, enterprise customers, and API design."
  )
  const [keywords, setKeywords] = useState<string[]>([])

  const [editorHtml, setEditorHtml] = useState<string>(initialEditorHtml)
  const [baseEditorHtml] = useState<string>(initialEditorHtml)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [editable, setEditable] = useState(false)

  const resumeText = useMemo(() => {
    const tmp = document?.createElement?.("div")
    if (!tmp) return ""
    tmp.innerHTML = editorHtml
    return tmp.textContent || tmp.innerText || ""
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

  const reanalyze = () => setKeywords(extractKeywords(jobDesc))
  const replaceJD = () => {
    setJobDesc("")
    setKeywords([])
  }

  const populateEmphasisFromJD = () => setConfig((c) => ({ ...c, emphasize: extractKeywords(jobDesc) }))

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
      '(<div class=\\"font-medium text-white\\\\/90\\">Summary<\\/div>\\s*<p class=\\"mt-1 text-white\\\\/80\\">)([^<]+)(<\\/p>)',
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
    if (config.length === "short") {
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
        '(<div class=\\"font-medium text-white\\\\/90 mt-4\\">Skills<\\/div>\\s*<p class=\\"text-white\\\\/80\\">)([^<]+)(<\\/p>)',
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
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
            <it.icon className="h-3.5 w-3.5" />
            <span>{it.label}</span>
          </span>
        ))}
        {config.emphasize.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
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
        <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">AI Resume Optimization</h1>
        <p className="mt-1 text-base text-white/60">Target: Senior Product Manager — Vercel</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full ${step === 1 ? "bg-emerald-500 text-black" : "bg-white/10 text-white"} flex items-center justify-center text-sm font-medium`}>1</div>
            <span className={`text-sm font-medium ${step === 1 ? "text-white" : "text-white/80"}`}>Select Master Resume</span>
          </div>
          <div className="h-px flex-1 bg-white/10"></div>
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full ${step === 2 ? "bg-emerald-500 text-black" : "bg-white/10 text-white"} flex items-center justify-center text-sm font-medium`}>2</div>
            <span className={`text-sm font-medium ${step === 2 ? "text-white" : "text-white/80"}`}>Review Job</span>
          </div>
          <div className="h-px flex-1 bg-white/10"></div>
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full ${step === 3 ? "bg-emerald-500 text-black" : "bg-white/10 text-white"} flex items-center justify-center text-sm font-medium`}>3</div>
            <span className={`text-sm font-medium ${step === 3 ? "text-white" : "text-white/80"}`}>Optimize</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Setup (Step 1) */}
          <div className={`${step === 1 ? "block" : "hidden"} relative rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8`}>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Setup</h2>
              <span className="text-xs text-white/50">Step 1–2</span>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-white/80">Master Resume</label>
              <div className="relative">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm hover:bg-black/30 focus:outline-none"
                  onClick={() => setResumeMenuOpen((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white/70" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{selectedResume}</p>
                      <p className="text-xs text-white/60">Last updated May 12, 2024</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/60" />
                </button>

                {resumeMenuOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl">
                    <div className="p-2">
                      {[
                        "Sarah_Johnson_Resume_2024.pdf",
                        "General_Tech_Resume_v2.docx",
                        "PM_Master_V3.docx",
                      ].map((name) => (
                        <button
                          key={name}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition text-left"
                          onClick={() => {
                            setSelectedResume(name)
                            setResumeMenuOpen(false)
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white/70" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{name}</p>
                            <p className="text-xs text-white/60">{name.endsWith(".pdf") ? "PDF • 164 KB" : "DOCX • 120 KB"}</p>
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
                <label className="block text-sm font-medium text-white/80">Analyzed Job Description</label>
                <button
                  className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white"
                  onClick={replaceJD}
                >
                  <RefreshCw className="h-4 w-4" />
                  Replace text
                </button>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40">
                <textarea
                  rows={8}
                  className="w-full bg-transparent outline-none p-4 text-sm leading-6 placeholder-white/40 resize-y"
                  placeholder="Paste the full job description here..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                />
                <div className="border-t border-white/10 p-3 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-white/50">Detected keywords:</span>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((k) => (
                        <span key={k} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs">
                          {k.replace(/^\w/, (c) => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white"
                    onClick={reanalyze}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reanalyze
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-white/60">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                Ready to optimize
              </div>
              <button
                className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors"
                onClick={() => {
                  setStep(2)
                }}
              >
                <Wand2 className="h-4 w-4" />
                Optimize
              </button>
            </div>
          </div>

          {/* Review (Step 2) */}
          <div className={`${step === 2 ? "block" : "hidden"} rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Review Job</h2>
                <p className="text-sm text-white/60 mt-1">Confirm alignment and address gaps before generating your tailored resume.</p>
              </div>
              <span className="text-xs text-white/50">Step 2–3</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-medium">Match overview</span>
                  </div>
                  <span className="text-xs text-white/60">{matchPct}% match</span>
                </div>
                <div className="mt-2">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${matchPct}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-white/60">
                    <span>Keywords coverage</span>
                    <span>{coveredCount}/{keywords.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span className="text-sm font-medium">Top keywords</span>
                  </div>
                  <button className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white" onClick={reanalyze}>
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <span key={k} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs">
                      {k.replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="inline-flex items-center gap-2 mb-2">
                  <ListChecksIcon />
                  <span className="text-sm font-medium">Key requirements</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keywords.map((k) => {
                    const covered = resumeText.toLowerCase().includes(k.toLowerCase())
                    return (
                      <div key={k} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${covered ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/70"}`}>
                          {covered ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{k.replace(/^\w/, (c) => c.toUpperCase())}</div>
                          <div className="text-xs text-white/60 mt-0.5">{covered ? "Mentioned in your resume" : "Not detected — consider adding a relevant bullet or skill"}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-4 hover:bg-white/20 transition-colors"
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
          <div className={`${step === 3 ? "block" : "hidden"} relative rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Optimize</h2>
                <p className="text-sm text-white/60 mt-1">Choose preferences, then generate your tailored resume.</p>
              </div>
              <span className="text-xs text-white/50">Step 3</span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-white/80 mb-2">Tone</div>
                <div className="flex flex-wrap gap-2">
                  {["neutral", "impactful", "executive"].map((t) => {
                    const active = config.tone === t
                    return (
                      <button
                        key={t}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium ${active ? "bg-white text-black" : "bg-transparent text-white/70 hover:bg-white/10"}`}
                        onClick={() => setConfig((c) => ({ ...c, tone: t as any }))}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-white/80 mb-2">Emphasize</div>
                <div className="flex flex-wrap gap-2">
                  {(config.emphasize || []).map((k) => {
                    const active = (config.emphasize || []).includes(k)
                    return (
                      <button
                        key={k}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium ${active ? "bg-white text-black" : "bg-transparent text-white/70 hover:bg-white/10"}`}
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
                  <div className="text-sm font-medium text-white/80 mb-2">Length</div>
                  <div className="flex flex-wrap gap-2">
                    {["short", "standard", "detailed"].map((l) => {
                      const active = config.length === l
                      return (
                        <button
                          key={l}
                          className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium ${active ? "bg-white text-black" : "bg-transparent text-white/70 hover:bg-white/10"}`}
                          onClick={() => setConfig((c) => ({ ...c, length: l as any }))}
                        >
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white/80 mb-2">Formatting</div>
                  <button
                    className={`inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium ${config.ats ? "bg-white/10" : "bg-transparent"}`}
                    onClick={() => setConfig((c) => ({ ...c, ats: !c.ats }))}
                  >
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${config.ats ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/60"}`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    ATS-friendly
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-white/20 p-4 text-xs text-white/60">
                Tips: Keep tone consistent with company voice, emphasize 3–5 most relevant skills, and keep bullets tight and outcome-oriented.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-4 hover:bg-white/20 transition-colors"
                onClick={() => setStep(2)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                className="inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors"
                onClick={() => {
                  applyOptimizations()
                  setStep(4)
                }}
              >
                <WandSparkles className="h-4 w-4" />
                Generate Optimized Resume
              </button>
            </div>
          </div>

          {/* Optimized (Final) */}
          <div className={`${step === 4 ? "block" : "hidden"} rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Optimized Resume</h2>
                <p className="text-sm text-white/60 mt-1">Tailored to: Senior Product Manager — Vercel</p>
                {appliedSettingsChips}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`inline-flex items-center gap-2 text-sm font-medium rounded-full py-2 px-3 transition-colors ${editable ? "text-black bg-emerald-500 hover:bg-emerald-400" : "text-white bg-white/10 hover:bg-white/20"}`}
                  onClick={() => setEditable((v) => !v)}
                >
                  <PencilLine className="h-4 w-4" />
                  {editable ? "Editing" : "Edit"}
                </button>
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-3 hover:bg-white/20 transition-colors"
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
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40">
              <div
                ref={editorRef}
                contentEditable={editable}
                suppressContentEditableWarning
                className="prose-invert p-5 text-sm leading-6 outline-none"
                dangerouslySetInnerHTML={{ __html: editorHtml }}
                onInput={(e) => setEditorHtml((e.target as HTMLDivElement).innerHTML)}
              />
              <div className="border-t border-white/10 p-3 flex items-center justify-between">
                <div className="text-xs text-white/60">Editable content. Use the toolbar above to toggle edit or download.</div>
                <button
                  className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white"
                  onClick={() => {
                    // simple refine: bold first two keywords in skills
                    const keys = keywords.slice(0, 5).map((k) => k.toLowerCase())
                    const skillsRegex2 = new RegExp(
                      '(<div class=\\"font-medium text-white\\\\/90 mt-4\\">Skills<\\/div>\\s*<p class=\\"text-white\\\\/80\\">)([^<]+)(<\\/p>)',
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-white/90">Job Summary</h3>
              <span className="text-xs font-medium text-white/50">Imported</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <div className="text-sm font-medium">Senior Product Manager</div>
                  <div className="text-xs text-white/60">Vercel • Remote</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <ScaleIcon />
                </div>
                <div>
                  <div className="text-sm font-medium">Seniority</div>
                  <div className="text-xs text-white/60">Senior • IC</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Grid className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <div className="text-sm font-medium">Category</div>
                  <div className="text-xs text-white/60">Developer Experience • Platform</div>
                </div>
              </div>
              <div className="pt-2">
                <div className="text-xs text-white/60 mb-1">Top skills</div>
                <div className="flex flex-wrap gap-2">
                  {"Roadmap,A/B Testing,Analytics,Frontend,APIs".split(",").map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-white/20 bg-transparent p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
                <Star className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <div className="text-sm font-medium">Tip</div>
                <div className="text-xs text-white/60">Mirror role language, quantify outcomes, and prioritize relevant projects.</div>
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
    <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18" />
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M5 7l-3 5h6l-3-5Z" />
      <path d="M19 7l-3 5h6l-3-5Z" />
    </svg>
  )
}
