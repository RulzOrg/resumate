"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Download, SplitSquareVertical, FileText } from "lucide-react"

interface OptimizedDetailViewProps {
  optimizedId: string
  title: string
  optimizedContent: string
  originalContent?: string | null
  matchScore?: number | null
}

function classifyMatch(score?: number | null) {
  const s = typeof score === 'number' ? score : null
  if (s === null) return { label: 'N/A', className: 'text-foreground/70 dark:text-white/70' }
  if (s === 0) return { label: `${s}%`, className: 'text-red-400' }
  if (s < 60) return { label: `${s}%`, className: 'text-amber-400' }
  return { label: `${s}%`, className: 'text-emerald-400' }
}

function tokenizeWords(text: string) {
  return text.split(/(\s+)/)
}

function highlightDiff(base: string, compare: string, mode: 'added' | 'removed') {
  // lightweight highlight: words present in compare but not in base => added; vice versa => removed
  const baseSet = new Set(base.toLowerCase().split(/\s+/).filter(Boolean))
  const tokens = tokenizeWords(compare)
  return tokens.map((t, i) => {
    const key = `${i}-${t}`
    const isWord = /\S/.test(t)
    if (!isWord) return <span key={key}>{t}</span>
    const present = baseSet.has(t.toLowerCase())
    if (mode === 'added' && !present) {
      return (
        <span key={key} className="bg-emerald-500/20 text-emerald-300 rounded-sm">
          {t}
        </span>
      )
    }
    return <span key={key}>{t}</span>
  })
}

export function OptimizedDetailView({ optimizedId, title, optimizedContent, originalContent, matchScore }: OptimizedDetailViewProps) {
  const match = classifyMatch(matchScore)
  const orig = originalContent || ''
  const opt = optimizedContent || ''

  const optimizedHighlighted = useMemo(() => highlightDiff(orig, opt, 'added'), [orig, opt])

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {}
  }

  const download = (format: 'pdf' | 'docx') => {
    const link = document.createElement('a')
    const encodedId = encodeURIComponent(optimizedId)
    link.href = `/api/resumes/export?resume_id=${encodedId}&format=${format}`
    link.target = '_blank'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6">
      <Card className="border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="text-sm text-foreground/60 dark:text-white/60">Match: <span className={match.className}>{match.label}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-surface-muted dark:bg-white/10 border-border dark:border-white/10" onClick={() => copyText(optimizedContent)}>
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
            <Button variant="outline" className="bg-surface-muted dark:bg-white/10 border-border dark:border-white/10" onClick={() => download('pdf')}>
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" className="bg-surface-muted dark:bg-white/10 border-border dark:border-white/10" onClick={() => download('docx')}>
              <Download className="h-4 w-4 mr-2" /> DOCX
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-foreground/70 dark:text-white/70" />
                <span className="text-sm font-medium">Optimized</span>
              </div>
              <div className="prose prose-invert max-w-none text-sm leading-6 whitespace-pre-wrap">
                {optimizedHighlighted}
              </div>
            </div>

            <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-black/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <SplitSquareVertical className="h-4 w-4 text-foreground/70 dark:text-white/70" />
                <span className="text-sm font-medium">Source (original)</span>
              </div>
              <pre className="text-xs text-foreground/80 dark:text-white/80 whitespace-pre-wrap leading-6">{orig}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
