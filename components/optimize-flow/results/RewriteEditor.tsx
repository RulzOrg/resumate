"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Check,
  X,
  Pencil,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Briefcase,
  FileText,
  Sparkles,
  Download,
  ArrowRight,
  Copy,
  FileDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RewriteResult, EditedContent, RewrittenExperience } from "@/lib/types/optimize-flow"
import {
  generateResumeMarkdown,
  generateResumePlainText,
  downloadAsFile,
  copyToClipboard,
  generateFilename,
} from "@/lib/export/optimize-flow-exports"

interface RewriteEditorProps {
  result: RewriteResult
  missingKeywords: string[]
  jobTitle: string
  companyName?: string
  onContentChange: (content: EditedContent) => void
  onContinue: () => void
}

export function RewriteEditor({
  result,
  missingKeywords,
  jobTitle,
  companyName,
  onContentChange,
  onContinue,
}: RewriteEditorProps) {
  const [editedSummary, setEditedSummary] = useState(result.professionalSummary)
  const [editedExperiences, setEditedExperiences] = useState<RewrittenExperience[]>(
    result.workExperiences
  )
  const [editingSummary, setEditingSummary] = useState(false)
  const [editingBulletIndex, setEditingBulletIndex] = useState<{
    expIndex: number
    bulletIndex: number
  } | null>(null)
  const [expandedExperiences, setExpandedExperiences] = useState<number[]>([0])
  const [copied, setCopied] = useState(false)

  // Get current edited content
  const getCurrentContent = (): EditedContent => ({
    professionalSummary: editedSummary,
    workExperiences: editedExperiences,
  })

  // Handle download as markdown
  const handleDownload = () => {
    const content = getCurrentContent()
    const markdown = generateResumeMarkdown(content, {
      jobTitle,
      companyName,
      includeKeywordsAdded: true,
    })
    const filename = generateFilename("resume", jobTitle, "md")
    downloadAsFile(markdown, filename)
  }

  // Handle copy to clipboard
  const handleCopy = async () => {
    const content = getCurrentContent()
    const plainText = generateResumePlainText(content)
    const success = await copyToClipboard(plainText)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Track which keywords have been added
  const addedKeywords = result.keywordsAdded

  // Notify parent of content changes
  const notifyChange = (summary: string, experiences: RewrittenExperience[]) => {
    onContentChange({
      professionalSummary: summary,
      workExperiences: experiences,
    })
  }

  // Summary editing handlers
  const handleSummaryEdit = (value: string) => {
    setEditedSummary(value)
  }

  const handleSummarySave = () => {
    setEditingSummary(false)
    notifyChange(editedSummary, editedExperiences)
  }

  const handleSummaryCancel = () => {
    setEditedSummary(result.professionalSummary)
    setEditingSummary(false)
  }

  const handleSummaryReset = () => {
    setEditedSummary(result.professionalSummary)
    notifyChange(result.professionalSummary, editedExperiences)
  }

  // Bullet editing handlers
  const handleBulletEdit = (expIndex: number, bulletIndex: number, value: string) => {
    const newExperiences = [...editedExperiences]
    newExperiences[expIndex] = {
      ...newExperiences[expIndex],
      rewrittenBullets: newExperiences[expIndex].rewrittenBullets.map((b, i) =>
        i === bulletIndex ? value : b
      ),
    }
    setEditedExperiences(newExperiences)
  }

  const handleBulletSave = () => {
    setEditingBulletIndex(null)
    notifyChange(editedSummary, editedExperiences)
  }

  const handleBulletCancel = (expIndex: number, bulletIndex: number) => {
    const newExperiences = [...editedExperiences]
    newExperiences[expIndex] = {
      ...newExperiences[expIndex],
      rewrittenBullets: newExperiences[expIndex].rewrittenBullets.map((b, i) =>
        i === bulletIndex ? result.workExperiences[expIndex].rewrittenBullets[bulletIndex] : b
      ),
    }
    setEditedExperiences(newExperiences)
    setEditingBulletIndex(null)
  }

  const handleBulletReset = (expIndex: number, bulletIndex: number) => {
    const newExperiences = [...editedExperiences]
    newExperiences[expIndex] = {
      ...newExperiences[expIndex],
      rewrittenBullets: newExperiences[expIndex].rewrittenBullets.map((b, i) =>
        i === bulletIndex ? result.workExperiences[expIndex].rewrittenBullets[bulletIndex] : b
      ),
    }
    setEditedExperiences(newExperiences)
    notifyChange(editedSummary, newExperiences)
  }

  // Toggle experience expansion
  const toggleExperience = (index: number) => {
    setExpandedExperiences((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border dark:border-white/10">
        <div>
          <h2 className="text-xl font-semibold font-space-grotesk mb-1">
            Your Rewritten Resume
          </h2>
          <p className="text-sm text-foreground/60 dark:text-white/60">
            Review and edit the optimized content below
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Keywords Added Summary */}
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-2">
              Keywords Added: {addedKeywords.length}/{missingKeywords.length}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.map((keyword, index) => {
                const isAdded = addedKeywords.some(
                  (k) => k.toLowerCase() === keyword.toLowerCase()
                )
                return (
                  <span
                    key={index}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      isAdded
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-foreground/10 text-foreground/50 dark:text-white/50"
                    )}
                  >
                    {isAdded && <Check className="w-3 h-3" />}
                    {keyword}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-border dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-medium">Professional Summary</h3>
          </div>
          {!editingSummary && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSummaryReset}
                className="p-1.5 rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors"
                title="Reset to original"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingSummary(true)}
                className="p-1.5 rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="p-5">
          {editingSummary ? (
            <div className="space-y-3">
              <textarea
                value={editedSummary}
                onChange={(e) => handleSummaryEdit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm leading-relaxed"
                rows={4}
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleSummaryCancel}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSummarySave}>
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/80 dark:text-white/80 leading-relaxed">
              {editedSummary}
            </p>
          )}
        </div>
      </div>

      {/* Work Experiences */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-medium">Work Experience</h3>
        </div>

        {editedExperiences.map((exp, expIndex) => (
          <div
            key={expIndex}
            className="rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 overflow-hidden"
          >
            {/* Experience Header */}
            <button
              onClick={() => toggleExperience(expIndex)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="text-left">
                <h4 className="font-medium text-sm">{exp.title}</h4>
                <p className="text-xs text-foreground/60 dark:text-white/60">
                  {exp.company} • {exp.duration}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {exp.keywordsAdded.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    +{exp.keywordsAdded.length} keywords
                  </span>
                )}
                {expandedExperiences.includes(expIndex) ? (
                  <ChevronUp className="w-4 h-4 text-foreground/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-foreground/40" />
                )}
              </div>
            </button>

            {/* Experience Bullets */}
            {expandedExperiences.includes(expIndex) && (
              <div className="px-5 pb-5 space-y-3">
                {exp.rewrittenBullets.map((bullet, bulletIndex) => {
                  const isEditing =
                    editingBulletIndex?.expIndex === expIndex &&
                    editingBulletIndex?.bulletIndex === bulletIndex
                  const originalBullet = result.workExperiences[expIndex]?.originalBullets[bulletIndex]

                  return (
                    <div key={bulletIndex} className="group">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedExperiences[expIndex].rewrittenBullets[bulletIndex]}
                            onChange={(e) =>
                              handleBulletEdit(expIndex, bulletIndex, e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                            rows={2}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBulletCancel(expIndex, bulletIndex)}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleBulletSave}>
                              <Check className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground/80 dark:text-white/80 leading-relaxed">
                              {bullet}
                            </p>
                            {originalBullet && originalBullet !== bullet && (
                              <p className="mt-1.5 text-xs text-foreground/40 dark:text-white/40 line-through">
                                Original: {originalBullet}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleBulletReset(expIndex, bulletIndex)}
                              className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-colors"
                              title="Reset"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setEditingBulletIndex({ expIndex, bulletIndex })
                              }
                              className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border dark:border-white/10">
        <p className="text-xs text-foreground/40 dark:text-white/40 text-center sm:text-left">
          Content is saved automatically. Click continue when ready for ATS scanning.
        </p>
        <Button
          onClick={onContinue}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black"
        >
          Continue to ATS Scan
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
