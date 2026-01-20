"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { AlertCircle, FileText, Loader2 } from "lucide-react"
import { WorkExperienceEditor } from "./WorkExperienceEditor"
import { ProcessingOverlay, type ProcessingStep } from "@/components/processing-overlay"
import type { WorkExperienceItem } from "@/lib/resume-parser"

export interface ReviewContent {
  workExperience: WorkExperienceItem[]
  summary?: string
}

interface ReviewContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: ReviewContent | null
  onConfirm: (content: ReviewContent) => void
  isLoading?: boolean
}

export function ReviewContentDialog({
  open,
  onOpenChange,
  content,
  onConfirm,
  isLoading = false,
}: ReviewContentDialogProps) {
  const [editedContent, setEditedContent] = useState<ReviewContent>({
    workExperience: [],
    summary: "",
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [optimizationStepIndex, setOptimizationStepIndex] = useState(0)

  // Optimization steps for the overlay
  const optimizationSteps: ProcessingStep[] = [
    { label: "Analyzing job requirements", status: optimizationStepIndex > 0 ? "completed" : optimizationStepIndex === 0 && isLoading ? "active" : "pending" },
    { label: "Optimizing content", status: optimizationStepIndex > 1 ? "completed" : optimizationStepIndex === 1 ? "active" : "pending" },
    { label: "Calculating match score", status: optimizationStepIndex > 2 ? "completed" : optimizationStepIndex === 2 ? "active" : "pending" },
    { label: "Finalizing resume", status: optimizationStepIndex > 3 ? "completed" : optimizationStepIndex === 3 ? "active" : "pending" },
  ]

  // Simulate step progression when isLoading changes
  useEffect(() => {
    if (!isLoading) {
      setOptimizationStepIndex(0)
      return
    }

    // Simulate step progression
    const stepDurations = [1500, 2500, 2000, 1500] // Time for each step
    let currentStep = 0
    
    const advanceStep = () => {
      if (currentStep < 4) {
        setOptimizationStepIndex(currentStep)
        currentStep++
        if (currentStep < 4) {
          setTimeout(advanceStep, stepDurations[currentStep - 1])
        }
      }
    }

    advanceStep()

    return () => {
      currentStep = 4 // Stop the progression
    }
  }, [isLoading])

  // Initialize form when content changes
  useEffect(() => {
    if (content) {
      setEditedContent({
        workExperience: content.workExperience.map((exp) => ({
          ...exp,
          bullets: exp.bullets.length > 0 ? [...exp.bullets] : [""],
        })),
        summary: content.summary || "",
      })
      setValidationError(null)
      setExpandedIndex(0) // Default to first item expanded
    }
  }, [content])

  // Bullet handlers
  const handleBulletChange = useCallback(
    (expIndex: number, bulletIndex: number, value: string) => {
      setEditedContent((prev) => ({
        ...prev,
        workExperience: prev.workExperience.map((exp, i) =>
          i === expIndex
            ? {
                ...exp,
                bullets: exp.bullets.map((b, j) =>
                  j === bulletIndex ? value : b
                ),
              }
            : exp
        ),
      }))
      setValidationError(null)
    },
    []
  )

  const handleAddBullet = useCallback((expIndex: number) => {
    setEditedContent((prev) => ({
      ...prev,
      workExperience: prev.workExperience.map((exp, i) =>
        i === expIndex
          ? { ...exp, bullets: [...exp.bullets, ""] }
          : exp
      ),
    }))
  }, [])

  const handleRemoveBullet = useCallback(
    (expIndex: number, bulletIndex: number) => {
      setEditedContent((prev) => ({
        ...prev,
        workExperience: prev.workExperience.map((exp, i) =>
          i === expIndex
            ? { ...exp, bullets: exp.bullets.filter((_, j) => j !== bulletIndex) }
            : exp
        ),
      }))
    },
    []
  )

  // Summary handler
  const handleSummaryChange = useCallback((value: string) => {
    setEditedContent((prev) => ({
      ...prev,
      summary: value,
    }))
  }, [])

  // Validation
  const validate = (): boolean => {
    for (const exp of editedContent.workExperience) {
      const emptyBullets = exp.bullets.filter((b) => !b.trim())
      if (emptyBullets.length > 0) {
        setValidationError(
          `"${exp.title || exp.company}" has empty bullet points. Please fill them in or remove them.`
        )
        return false
      }
    }

    const hasAnyBullets = editedContent.workExperience.some(
      (exp) => exp.bullets.length > 0
    )
    if (!hasAnyBullets) {
      setValidationError(
        "At least one work experience must have bullet points to optimize."
      )
      return false
    }

    setValidationError(null)
    return true
  }

  const handleConfirm = () => {
    if (!validate()) return

    const cleanedContent: ReviewContent = {
      ...editedContent,
      workExperience: editedContent.workExperience.map((exp) => ({
        ...exp,
        bullets: exp.bullets.filter((b) => b.trim()),
      })),
    }

    onConfirm(cleanedContent)
  }

  const handleCancel = () => {
    setValidationError(null)
    onOpenChange(false)
  }

  const totalBullets = editedContent.workExperience.reduce(
    (acc, exp) => acc + exp.bullets.filter((b) => b.trim()).length,
    0
  )

  return (
    <>
      {/* Optimization Processing Overlay */}
      <ProcessingOverlay
        isOpen={isLoading}
        title="Optimizing your resume"
        subtitle="This may take a moment..."
        steps={optimizationSteps}
        currentStepIndex={optimizationStepIndex}
        estimatedTime="~30-60 seconds"
      />

      <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-[800px] w-[95vw] h-[90vh] max-h-[850px] flex flex-col p-0 shadow-2xl overflow-hidden"
      >
        <DialogHeader className="px-6 py-6 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md z-10">
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <FileText className="h-5 w-5 text-emerald-500" />
            Review Your Resume Content
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Review and edit your work experience bullets and summary before
            optimization. The AI will enhance this content for the target job.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950">
          <div className="space-y-8 p-6">
            {validationError && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium leading-relaxed">{validationError}</p>
              </div>
            )}

            {/* Professional Summary */}
            {(editedContent.summary || editedContent.summary === "") && (
              <div className="space-y-3 bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/50">
                <Label htmlFor="summary" className="text-sm font-semibold text-zinc-200">
                  Professional Summary
                </Label>
                <Textarea
                  id="summary"
                  value={editedContent.summary}
                  onChange={(e) => handleSummaryChange(e.target.value)}
                  placeholder="Enter your professional summary (optional)..."
                  className="min-h-[120px] resize-none bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500/30 text-zinc-300 leading-relaxed"
                  rows={4}
                />
                <p className="text-xs text-zinc-500">
                  This will be tailored to match the job requirements.
                </p>
              </div>
            )}

            {/* Work Experience */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <Label className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                  Work Experience ({editedContent.workExperience.length})
                </Label>
                <span className="text-xs font-medium text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                  {totalBullets} bullet{totalBullets !== 1 ? "s" : ""} total
                </span>
              </div>

              {editedContent.workExperience.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
                  <p>No work experience found in your resume.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editedContent.workExperience.map((exp, index) => (
                    <WorkExperienceEditor
                      key={index}
                      experience={exp}
                      index={index}
                      isExpanded={expandedIndex === index}
                      onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      onBulletChange={handleBulletChange}
                      onAddBullet={handleAddBullet}
                      onRemoveBullet={handleRemoveBullet}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/50 backdrop-blur-md z-10">
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            disabled={isLoading}
            className="border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || editedContent.workExperience.length === 0}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              "Confirm & Optimize"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
