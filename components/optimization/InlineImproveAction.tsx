"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, Check, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface InlineImproveActionProps {
  bullet: string
  company?: string
  title?: string
  jobTitle?: string
  companyName?: string | null
  onApply: (improvedBullet: string) => void
}

export function InlineImproveAction({
  bullet,
  company,
  title,
  jobTitle,
  companyName,
  onApply,
}: InlineImproveActionProps) {
  const [isImproving, setIsImproving] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [improvedText, setImprovedText] = useState("")

  const handleImprove = useCallback(async () => {
    if (!bullet.trim()) {
      toast.error("No bullet text to improve.")
      return
    }

    setIsImproving(true)
    setIsStreaming(true)
    setImprovedText("")

    try {
      const response = await fetch("/api/resumes/improve-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet: bullet.trim(),
          company,
          title,
          jobTitle,
          companyName,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Failed to improve bullet")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let result = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
        setImprovedText(result)
      }

      setIsStreaming(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      toast.error(message)
      setIsImproving(false)
      setIsStreaming(false)
      setImprovedText("")
    }
  }, [bullet, company, title, jobTitle, companyName])

  const handleApply = useCallback(() => {
    if (improvedText.trim()) {
      onApply(improvedText.trim())
    }
    setIsImproving(false)
    setIsStreaming(false)
    setImprovedText("")
  }, [improvedText, onApply])

  const handleDismiss = useCallback(() => {
    setIsImproving(false)
    setIsStreaming(false)
    setImprovedText("")
  }, [])

  return (
    <>
      {/* Hover-reveal Sparkles button */}
      {!isImproving && (
        <button
          type="button"
          onClick={handleImprove}
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary",
            "inline-flex items-center justify-center",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label="Improve with AI"
          title="Improve with AI"
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
        </button>
      )}

      {/* Loading indicator (replaces the sparkles button position) */}
      {isImproving && isStreaming && !improvedText && (
        <button
          type="button"
          disabled
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2",
            "h-6 w-6 rounded-full bg-primary/10 text-primary",
            "inline-flex items-center justify-center"
          )}
          aria-label="Improving bullet point"
        >
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        </button>
      )}

      {/* Improvement preview */}
      {isImproving && improvedText && (
        <div className="mt-1 p-2 rounded-md bg-muted/50 border border-border text-xs space-y-1">
          {isStreaming && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              <span>Improving...</span>
            </div>
          )}

          {/* Original text with strikethrough */}
          <p className="line-through text-muted-foreground">{bullet}</p>

          {/* Improved text */}
          <p className="text-primary font-medium whitespace-pre-wrap">{improvedText}</p>

          {/* Action buttons (only show after streaming completes) */}
          {!isStreaming && (
            <div className="flex gap-1.5 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleApply}
              >
                <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3 mr-1" aria-hidden="true" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
