"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface TextEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  label: string
  value: string
  onSave: (value: string) => void
  multiline?: boolean
  placeholder?: string
  maxLength?: number
}

export function TextEditDialog({
  open,
  onOpenChange,
  title,
  label,
  value,
  onSave,
  multiline = false,
  placeholder = "",
  maxLength,
}: TextEditDialogProps) {
  const [form, setForm] = useState(value)

  useEffect(() => {
    setForm(value)
  }, [value, open])

  const handleSave = () => {
    onSave(form.trim())
    onOpenChange(false)
  }

  const charCount = form.length
  const isOverLimit = maxLength ? charCount > maxLength : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>{label}</Label>
              {maxLength && (
                <span
                  className={`text-xs ${
                    isOverLimit ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {charCount}/{maxLength}
                </span>
              )}
            </div>

            {multiline ? (
              <Textarea
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder={placeholder}
                className="min-h-[200px]"
              />
            ) : (
              <Input
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder={placeholder}
              />
            )}
          </div>

          {multiline && (
            <p className="text-xs text-muted-foreground">
              Tip: Keep your summary concise and impactful. Focus on your key achievements and value proposition.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isOverLimit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


