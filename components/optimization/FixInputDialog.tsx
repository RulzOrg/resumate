"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { FixStrategy, RequiredInput, FixContext } from "@/lib/ats-checker/fix-strategies"
import type { ATSIssue } from "@/lib/ats-checker/types"

interface FixInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strategy: FixStrategy
  issue: ATSIssue
  onSubmit: (command: string) => void
  context?: FixContext
}

function buildNaturalLanguageCommand(
  issue: ATSIssue,
  inputs: RequiredInput[],
  values: Record<string, string>
): string {
  // Build a natural-language command from the user's input values
  const parts: string[] = []

  for (const input of inputs) {
    const value = values[input.field]?.trim()
    if (!value) continue

    switch (input.type) {
      case "email":
        parts.push(`Add my email address ${value} to the resume contact information`)
        break
      case "tel":
        parts.push(`Add my phone number ${value} to the resume contact information`)
        break
      case "url":
        parts.push(`Add my ${input.label.toLowerCase()} ${value} to the resume contact information`)
        break
      default:
        // For generic text fields, infer intent from the issue title and field label
        if (input.field === "location") {
          parts.push(`Add my location ${value} to the resume contact information`)
        } else if (input.field === "name") {
          parts.push(`Set my name to ${value} in the resume contact information`)
        } else {
          parts.push(`Update my ${input.label.toLowerCase()} to "${value}" in my resume`)
        }
        break
    }
  }

  if (parts.length === 0) {
    // Fallback: use the issue recommendation
    return issue.recommendation
  }

  // Join multiple parts if there happen to be several required inputs
  return parts.join(". ")
}

export function FixInputDialog({
  open,
  onOpenChange,
  strategy,
  issue,
  onSubmit,
}: FixInputDialogProps) {
  const requiredInputs = strategy.requiredInputs ?? []
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // Reset form state when dialog opens or strategy changes
  useEffect(() => {
    if (open) {
      const initialValues: Record<string, string> = {}
      for (const input of requiredInputs) {
        initialValues[input.field] = ""
      }
      setValues(initialValues)
      setErrors({})
    }
  }, [open, strategy])

  const updateValue = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [field]: false }))
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      // Validate all required fields are filled
      const newErrors: Record<string, boolean> = {}
      let hasError = false

      for (const input of requiredInputs) {
        if (!values[input.field]?.trim()) {
          newErrors[input.field] = true
          hasError = true
        }
      }

      if (hasError) {
        setErrors(newErrors)
        return
      }

      const command = buildNaturalLanguageCommand(issue, requiredInputs, values)
      onSubmit(command)
      onOpenChange(false)
    },
    [values, requiredInputs, issue, onSubmit, onOpenChange]
  )

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{issue.title}</DialogTitle>
          {strategy.previewDescription && (
            <DialogDescription>{strategy.previewDescription}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {requiredInputs.map((input) => (
            <div key={input.field} className="grid gap-2">
              <Label htmlFor={`fix-input-${input.field}`}>{input.label}</Label>
              <Input
                id={`fix-input-${input.field}`}
                type={input.type}
                placeholder={input.placeholder}
                value={values[input.field] ?? ""}
                onChange={(e) => updateValue(input.field, e.target.value)}
                className={cn(errors[input.field] && "border-destructive")}
                aria-invalid={errors[input.field] || undefined}
                autoFocus={requiredInputs.indexOf(input) === 0}
              />
              {errors[input.field] && (
                <p className="text-xs text-destructive">
                  {input.label} is required
                </p>
              )}
            </div>
          ))}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">Apply Fix</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
