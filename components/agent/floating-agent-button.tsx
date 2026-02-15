"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, Zap, FileSearch, MessageCircle, Send, Loader2 } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { cn } from "@/lib/utils"

type FeedbackType = "feedback" | "suggestion" | "feature" | "bug" | "other"

const feedbackTypes: { value: FeedbackType; label: string }[] = [
  { value: "feedback", label: "General Feedback" },
  { value: "suggestion", label: "Suggestion" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "other", label: "Other" },
]

const quickActions = [
  {
    icon: Zap,
    label: "Optimize Resume",
    description: "AI-powered resume optimization",
    href: "/dashboard",
  },
  {
    icon: FileSearch,
    label: "Check ATS Score",
    description: "Free ATS compatibility check",
    href: "/ats-checker",
  },
]

export function FloatingAgentButton() {
  const [popoverOpen, setPopoverOpen] = useState(false)
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

  const handleFeedbackClick = () => {
    setPopoverOpen(false)
    setFeedbackOpen(true)
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
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "flex items-center justify-center",
              "size-14 rounded-full",
              "bg-primary hover:bg-primary/90",
              "text-primary-foreground shadow-lg",
              "transition-all duration-200",
              "hover:scale-110 hover:shadow-xl",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "focus:ring-offset-background"
            )}
            aria-label="Open AI assistant"
          >
            <Sparkles className="size-6" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          className="w-72 p-0"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm font-semibold">AI Assistant</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your career optimization co-pilot
            </p>
          </div>

          <div className="p-1.5">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setPopoverOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5",
                  "transition-colors hover:bg-accent"
                )}
              >
                <action.icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{action.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            ))}

            <button
              onClick={handleFeedbackClick}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5",
                "transition-colors hover:bg-accent text-left"
              )}
            >
              <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">Send Feedback</p>
                <p className="mt-1 text-xs text-muted-foreground">Share thoughts or report issues</p>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>

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
