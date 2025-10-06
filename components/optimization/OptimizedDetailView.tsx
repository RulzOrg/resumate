"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tab"
import { 
  Copy, 
  Download, 
  SplitSquareVertical, 
  FileText, 
  Edit3,
  Check,
  X,
  Printer,
  FileDown,
  Columns2,
  AlignLeft
} from "lucide-react"
import { computeLineDiff, getDiffStats } from "@/lib/diff-utils"
import { toast } from "sonner"

interface OptimizedDetailViewProps {
  optimizedId: string
  title: string
  optimizedContent: string
  originalContent?: string | null
  matchScore?: number | null
}

function classifyMatch(score?: number | null) {
  const s = typeof score === 'number' ? score : null
  if (s === null) return { label: 'N/A', className: 'text-white/70' }
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

type ViewMode = 'side-by-side' | 'unified'

export function OptimizedDetailView({ optimizedId, title, optimizedContent, originalContent, matchScore }: OptimizedDetailViewProps) {
  const match = classifyMatch(matchScore)
  const orig = originalContent || ''
  const opt = optimizedContent || ''

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(optimizedContent)
  const [showAcceptReject, setShowAcceptReject] = useState(false)

  // Compute diff
  const { oldLines, newLines } = useMemo(() => computeLineDiff(orig, opt), [orig, opt])
  const diffStats = useMemo(() => getDiffStats(orig, opt), [orig, opt])

  const optimizedHighlighted = useMemo(() => highlightDiff(orig, opt, 'added'), [orig, opt])

  // Handlers
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard", { className: "font-geist" })
    } catch {
      toast.error("Failed to copy", { className: "font-geist" })
    }
  }

  const download = (format: 'pdf' | 'docx' | 'txt' | 'md') => {
    const link = document.createElement('a')
    const encodedId = encodeURIComponent(optimizedId)
    link.href = `/api/resumes/download?id=${encodedId}&format=${format}`
    link.target = '_blank'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/resumes/optimized/${optimizedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optimized_content: editedContent })
      })
      if (!response.ok) throw new Error('Failed to save')
      toast.success("Changes saved", { className: "font-geist" })
      setIsEditing(false)
    } catch (error) {
      toast.error("Failed to save changes", { className: "font-geist" })
    }
  }

  const handleCancelEdit = () => {
    setEditedContent(optimizedContent)
    setIsEditing(false)
  }

  const handleAcceptChanges = async () => {
    // Accept all optimizations - keep the optimized version
    toast.success("All changes accepted", { className: "font-geist" })
    setShowAcceptReject(false)
  }

  const handleRejectChanges = async () => {
    // Reject optimizations - revert to original
    setEditedContent(orig)
    toast.success("Changes rejected, reverted to original", { className: "font-geist" })
    setShowAcceptReject(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm font-geist">
        <div className="flex items-center gap-2">
          <span className="text-white/60">Match:</span>
          <span className={match.className}>{match.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60">Changes:</span>
          <span className="text-emerald-400">+{diffStats.additions}</span>
          <span className="text-red-400">-{diffStats.deletions}</span>
        </div>
      </div>

      {/* Actions Bar */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
                className={viewMode === 'side-by-side' ? 'bg-emerald-500 text-black' : 'bg-white/10 border-white/10'}
              >
                <Columns2 className="h-4 w-4 mr-2" />
                Side-by-Side
              </Button>
              <Button
                variant={viewMode === 'unified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('unified')}
                className={viewMode === 'unified' ? 'bg-emerald-500 text-black' : 'bg-white/10 border-white/10'}
              >
                <AlignLeft className="h-4 w-4 mr-2" />
                Unified
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-white/10 border-white/10"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="bg-emerald-500 text-black"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="bg-white/10 border-white/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAcceptReject(!showAcceptReject)}
                className="bg-white/10 border-white/10"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept/Reject
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(editedContent)}
                  className="bg-white/10 border-white/10"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-white/10 border-white/10"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <select
                  onChange={(e) => download(e.target.value as any)}
                  value=""
                  className="h-9 px-3 rounded-md bg-white/10 border border-white/10 text-white text-sm font-geist"
                >
                  <option value="" disabled>Export...</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="txt">Plain Text</option>
                  <option value="md">Markdown</option>
                </select>
              </div>
            </div>
          </div>

          {/* Accept/Reject Panel */}
          {showAcceptReject && (
            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-white/70 mb-3 font-geist">
                Do you want to accept all optimizations or revert to the original?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAcceptChanges}
                  className="bg-emerald-500 text-black"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept All Changes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectChanges}
                  className="bg-red-500/10 border-red-500/30 text-red-400"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject & Revert
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAcceptReject(false)}
                  className="text-white/60"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Display */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-geist">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <SplitSquareVertical className="h-4 w-4 text-white/70" />
                  <span className="text-sm font-medium font-geist">Original</span>
                </div>
                <div className="text-sm text-white/80 whitespace-pre-wrap leading-6 font-mono">
                  {oldLines.map((part, idx) => (
                    <span
                      key={idx}
                      className={
                        part.type === 'removed'
                          ? 'bg-red-500/20 text-red-300 line-through'
                          : ''
                      }
                    >
                      {part.value}
                    </span>
                  ))}
                </div>
              </div>

              {/* Optimized */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium font-geist">Optimized</span>
                </div>
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[600px] p-3 rounded-lg bg-black/50 border border-white/10 text-sm text-white/90 font-mono leading-6 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  />
                ) : (
                  <div className="text-sm text-white/90 whitespace-pre-wrap leading-6 font-mono">
                    {newLines.map((part, idx) => (
                      <span
                        key={idx}
                        className={
                          part.type === 'added'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ''
                        }
                      >
                        {part.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Unified View */
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlignLeft className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium font-geist">Unified Diff</span>
              </div>
              {isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-[600px] p-3 rounded-lg bg-black/50 border border-white/10 text-sm text-white/90 font-mono leading-6 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                />
              ) : (
                <div className="text-sm text-white/90 whitespace-pre-wrap leading-6 font-mono">
                  {/* Show removed lines */}
                  {oldLines.map((part, idx) =>
                    part.type === 'removed' ? (
                      <div key={`old-${idx}`} className="bg-red-500/20 text-red-300 line-through">
                        - {part.value}
                      </div>
                    ) : null
                  )}
                  {/* Show added lines */}
                  {newLines.map((part, idx) =>
                    part.type === 'added' ? (
                      <div key={`new-${idx}`} className="bg-emerald-500/20 text-emerald-300">
                        + {part.value}
                      </div>
                    ) : part.type === 'unchanged' ? (
                      <div key={`new-${idx}`} className="text-white/70">
                        {part.value}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
