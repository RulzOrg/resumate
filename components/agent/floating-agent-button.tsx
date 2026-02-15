"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, Zap, FileSearch, MessageCircle, Send, Loader2, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type FeedbackType = "feedback" | "suggestion" | "feature" | "bug" | "other"

const feedbackTypes: { value: FeedbackType; label: string }[] = [
  { value: "feedback", label: "General Feedback" },
  { value: "suggestion", label: "Suggestion" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "other", label: "Other" },
]

export function FloatingAgentButton() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "feedback" as FeedbackType,
    message: "",
  })

  const resetForm = () => {
    setFormData({ name: "", email: "", type: "feedback", message: "" })
    setError(null)
    setIsSuccess(false)
  }

  const handleFeedbackClose = () => {
    setFeedbackOpen(false)
    setTimeout(resetForm, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback")
      }

      setIsSuccess(true)
      setTimeout(handleFeedbackClose, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <>
      {/* Horizontal Command Center */}
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-1",
          "rounded-full px-1.5 py-1.5",
          "bg-background/80 backdrop-blur-lg",
          "border border-border shadow-lg",
          "transition-all duration-200"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "text-xs font-medium text-foreground/80",
            "transition-colors hover:bg-primary/10 hover:text-primary"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Optimize</span>
        </Link>

        <Separator orientation="vertical" className="h-4" />

        <Link
          href="/ats-checker"
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "text-xs font-medium text-foreground/80",
            "transition-colors hover:bg-primary/10 hover:text-primary"
          )}
        >
          <FileSearch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ATS Check</span>
        </Link>

        <Separator orientation="vertical" className="h-4" />

        <button
          onClick={() => setFeedbackOpen(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "text-xs font-medium text-foreground/80",
            "transition-colors hover:bg-primary/10 hover:text-primary"
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Feedback</span>
        </button>

        <Separator orientation="vertical" className="h-4" />

        <button
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              })
            )
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "text-xs font-medium text-foreground/80",
            "transition-colors hover:bg-primary/10 hover:text-primary"
          )}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-muted-foreground">
            <kbd className="text-[10px] font-mono">⌘K</kbd>
          </span>
        </button>

        <Separator orientation="vertical" className="h-4" />

        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1.5",
            "bg-primary/10"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary hidden sm:inline">AI</span>
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={() => handleFeedbackClose()}
          onEscapeKeyDown={() => handleFeedbackClose()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              Send us Feedback
            </DialogTitle>
            <DialogDescription>
              We&apos;d love to hear from you! Share your thoughts, suggestions, or report issues.
            </DialogDescription>
          </DialogHeader>

          {isSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Send className="size-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Thank you!</h3>
              <p className="text-sm text-muted-foreground">
                Your feedback has been submitted successfully.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feedback-name">Name</Label>
                  <Input
                    id="feedback-name"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback-email">Email</Label>
                  <Input
                    id="feedback-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-type">Feedback Type</Label>
                <select
                  id="feedback-type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
                    "transition-[color,box-shadow] outline-none",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:bg-input/30 dark:border-border"
                  )}
                >
                  {feedbackTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-message">Message</Label>
                <Textarea
                  id="feedback-message"
                  name="message"
                  placeholder="Tell us what's on your mind..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="min-h-[120px] resize-none"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFeedbackClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
