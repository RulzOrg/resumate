"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { DiffPreview } from "@/components/shared/DiffPreview"
import { UserInputForm } from "./UserInputForm"
import type { DiffEntry, ResumeEditOperation } from "@/lib/chat-edit-types"
import type { RequiredInput } from "@/lib/ats-checker/fix-strategies"

interface FixPreviewState {
  issueId: string
  checkId: string
  issueTitle?: string
  issueSeverity?: string
}

interface FixPreviewModalProps {
  state: FixPreviewState | null
  onClose: () => void
  onApplyFix: (checkId: string, issueId: string, operations: ResumeEditOperation[]) => void
}

type ModalState =
  | { type: "loading" }
  | { type: "input_required"; fields: RequiredInput[] }
  | { type: "preview"; diffs: DiffEntry[]; explanation: string; operations: ResumeEditOperation[]; confidence: string }
  | { type: "guidance"; recommendation: string }
  | { type: "error"; message: string }

export function FixPreviewModal({ state, onClose, onApplyFix }: FixPreviewModalProps) {
  const [modalState, setModalState] = useState<ModalState>({ type: "loading" })
  const [isRetrying, setIsRetrying] = useState(false)

  const fetchPreview = useCallback(async (userInputs?: Record<string, string>) => {
    if (!state) return
    setModalState({ type: "loading" })

    try {
      const response = await fetch("/api/public/ats-check/fix-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkId: state.checkId,
          issueId: state.issueId,
          userInputs,
        }),
      })

      const data = await response.json()

      if (response.status === 429) {
        setModalState({ type: "error", message: data.userMessage || "Rate limit exceeded. Please try again later." })
        return
      }

      if (!response.ok) {
        setModalState({ type: "error", message: data.userMessage || "Failed to generate fix preview." })
        return
      }

      switch (data.status) {
        case "success":
          setModalState({
            type: "preview",
            diffs: data.preview.diffs,
            explanation: data.preview.explanation,
            operations: data.preview.operations,
            confidence: data.preview.confidence,
          })
          break
        case "input_required":
          setModalState({ type: "input_required", fields: data.fields })
          break
        case "guidance_only":
          setModalState({ type: "guidance", recommendation: data.recommendation })
          break
        case "no_fix":
          setModalState({ type: "guidance", recommendation: data.explanation || data.recommendation })
          break
        default:
          setModalState({ type: "error", message: "Unexpected response." })
      }
    } catch {
      setModalState({ type: "error", message: "Network error. Please check your connection and try again." })
    } finally {
      setIsRetrying(false)
    }
  }, [state])

  // Fetch preview when the modal opens
  useEffect(() => {
    if (state) {
      fetchPreview()
    }
  }, [state, fetchPreview])

  const handleRetry = () => {
    setIsRetrying(true)
    fetchPreview()
  }

  const handleUserInputSubmit = (values: Record<string, string>) => {
    fetchPreview(values)
  }

  const handleApplyFix = () => {
    if (!state || modalState.type !== "preview") return
    onApplyFix(state.checkId, state.issueId, modalState.operations)
  }

  if (!state) return null

  return (
    <Dialog open={!!state} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Fix Preview
          </DialogTitle>
          {state.issueTitle && (
            <DialogDescription className="flex items-center gap-2 text-sm">
              {state.issueSeverity && (
                <Badge
                  variant="outline"
                  className={
                    state.issueSeverity === "critical"
                      ? "border-red-500/50 text-red-600 dark:text-red-400"
                      : state.issueSeverity === "warning"
                        ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
                        : "border-muted-foreground/50 text-muted-foreground"
                  }
                >
                  {state.issueSeverity}
                </Badge>
              )}
              {state.issueTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-2">
          {/* Loading */}
          {modalState.type === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is analyzing the fix...</p>
            </div>
          )}

          {/* Input Required */}
          {modalState.type === "input_required" && (
            <UserInputForm
              fields={modalState.fields}
              onSubmit={handleUserInputSubmit}
            />
          )}

          {/* Preview */}
          {modalState.type === "preview" && (
            <div className="space-y-4">
              <p className="text-sm text-foreground/90">{modalState.explanation}</p>

              {modalState.confidence === "low" && (
                <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  The AI is less confident about this fix. Review the changes carefully.
                </div>
              )}

              <DiffPreview diffs={modalState.diffs} />

              <div className="flex gap-2 pt-2">
                <Button onClick={handleApplyFix} className="flex-1">
                  Apply & Save
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Guidance Only */}
          {modalState.type === "guidance" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This issue can&apos;t be fixed automatically, but here&apos;s what you can do:
              </p>
              <div className="rounded-md bg-muted/50 border border-border p-3 text-sm">
                {modalState.recommendation}
              </div>
              <Button variant="ghost" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          )}

          {/* Error */}
          {modalState.type === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {modalState.message}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry} disabled={isRetrying} className="flex-1">
                  {isRetrying ? "Retrying..." : "Try Again"}
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
