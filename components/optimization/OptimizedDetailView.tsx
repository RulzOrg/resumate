"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Download, SplitSquareVertical, FileText, Settings2 } from "lucide-react"
import { LayoutSelector } from "./layout-selector"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { usePlatform } from "@/hooks/use-platform"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Kbd } from "@/components/keyboard-shortcuts/kbd"

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
  const [layout, setLayout] = useState<string>("modern")
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false)
  const match = classifyMatch(matchScore)
  const orig = originalContent || ''
  const opt = optimizedContent || ''

  const optimizedHighlighted = useMemo(() => highlightDiff(orig, opt, 'added'), [orig, opt])

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Copy failed. Try again.")
    }
  }

  const download = (format: 'docx' | 'html') => {
    try {
      const link = document.createElement('a')
      const encodedId = encodeURIComponent(optimizedId)
      link.href = `/api/resumes/export?resume_id=${encodedId}&format=${format}&layout=${layout}`
      link.target = '_blank'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Download started")
    } catch {
      toast.error("Download failed. Try again.")
    }
  }

  // Platform detection for shortcut display
  const { modifierKey } = usePlatform()

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "d",
      modifiers: { meta: true },
      handler: () => download("docx"),
      description: "Download DOCX",
    },
    {
      key: "c",
      modifiers: { meta: true },
      handler: () => copyText(optimizedContent),
      description: "Copy resume content",
    },
    {
      key: "p",
      modifiers: { meta: true },
      handler: () => download("html"),
      description: "Preview HTML",
    },
  ])

  return (
    <div className="space-y-6">
      <Card className="border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="text-sm text-foreground/60 dark:text-white/60">Match: <span className={match.className}>{match.label}</span></div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs font-medium text-foreground/60 dark:text-white/60">Layout:</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsLayoutModalOpen(true)}
                className="h-9 text-xs bg-surface-muted dark:bg-white/10 border-border dark:border-white/10 px-3 flex items-center gap-1.5"
              >
                <Settings2 className="h-4 w-4" />
                {layout.charAt(0).toUpperCase() + layout.slice(1)}
              </Button>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-surface-muted dark:bg-white/10 border-border dark:border-white/10"
                    onClick={() => copyText(optimizedContent)}
                    aria-label="Copy resume content to clipboard"
                  >
                    <Copy className="h-4 w-4 mr-2" aria-hidden="true" /> Copy
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Copy resume content</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>C</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-surface-muted dark:bg-white/10 border-border dark:border-white/10"
                    onClick={() => download("html")}
                    aria-label="Preview resume as HTML"
                  >
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" /> Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Preview as HTML</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>P</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-surface-muted dark:bg-white/10 border-border dark:border-white/10"
                    onClick={() => download("docx")}
                    aria-label="Download resume as Word document"
                  >
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" /> DOCX
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Download as DOCX</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>D</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
      <LayoutSelector 
        open={isLayoutModalOpen} 
        onOpenChange={setIsLayoutModalOpen} 
        currentLayout={layout} 
        onSelect={setLayout} 
      />
    </div>
  )
}
