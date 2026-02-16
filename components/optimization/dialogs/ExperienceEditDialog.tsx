"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, GripVertical, Sparkles, Loader2, Check, X } from "lucide-react"
import { toast } from "sonner"
import type { WorkExperienceItem } from "@/lib/resume-parser"

interface ExperienceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experience: WorkExperienceItem | null
  onSave: (experience: WorkExperienceItem) => void
  isNew?: boolean
  jobTitle?: string
  companyName?: string | null
}

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"]

export function ExperienceEditDialog({
  open,
  onOpenChange,
  experience,
  onSave,
  isNew = false,
  jobTitle,
  companyName,
}: ExperienceEditDialogProps) {
  const [form, setForm] = useState<WorkExperienceItem>({
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    employmentType: "Full-time",
    bullets: [""],
  })

  const [improving, setImproving] = useState<{
    index: number
    result: string
    isStreaming: boolean
  } | null>(null)

  useEffect(() => {
    if (experience) {
      setForm({
        ...experience,
        bullets: experience.bullets.length > 0 ? experience.bullets : [""],
      })
    } else {
      setForm({
        company: "",
        title: "",
        location: "",
        startDate: "",
        endDate: "",
        employmentType: "Full-time",
        bullets: [""],
      })
    }
    setImproving(null)
  }, [experience, open])

  const handleSave = () => {
    const cleanedBullets = form.bullets.filter((b) => b.trim() !== "")
    onSave({ ...form, bullets: cleanedBullets })
    onOpenChange(false)
  }

  const addBullet = () => {
    setForm({ ...form, bullets: [...form.bullets, ""] })
  }

  const removeBullet = (index: number) => {
    setForm({
      ...form,
      bullets: form.bullets.filter((_, i) => i !== index),
    })
  }

  const updateBullet = (index: number, value: string) => {
    const newBullets = [...form.bullets]
    newBullets[index] = value
    setForm({ ...form, bullets: newBullets })
  }

  const handleImprove = useCallback(async (index: number) => {
    const bullet = form.bullets[index]
    if (!bullet.trim()) {
      toast.error("Write a bullet point first, then improve it.")
      return
    }

    setImproving({ index, result: "", isStreaming: true })

    try {
      const response = await fetch("/api/resumes/improve-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet: bullet.trim(),
          company: form.company,
          title: form.title,
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
        setImproving((prev) => prev ? { ...prev, result } : null)
      }

      setImproving((prev) => prev ? { ...prev, isStreaming: false } : null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      toast.error(message)
      setImproving(null)
    }
  }, [form.bullets, form.company, form.title, jobTitle, companyName])

  const handleApplyImprovement = () => {
    if (improving && improving.result.trim()) {
      updateBullet(improving.index, improving.result.trim())
      setImproving(null)
    }
  }

  const handleDismissImprovement = () => {
    setImproving(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add Work Experience" : "Edit Work Experience"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Amazon"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location || ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Seattle, WA"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Senior Product Designer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select
                value={form.employmentType || "Full-time"}
                onValueChange={(value) =>
                  setForm({ ...form, employmentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                value={form.startDate || ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                placeholder="01/2021"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                value={form.endDate || ""}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                placeholder="Present"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Achievements & Responsibilities</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBullet}
                className="h-8"
                aria-label="Add new bullet point"
              >
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add Bullet
              </Button>
            </div>

            <div className="space-y-3">
              {form.bullets.map((bullet, index) => (
                <div key={index}>
                  <div className="flex gap-2 items-start">
                    <GripVertical className="h-4 w-4 mt-3 text-muted-foreground cursor-grab" aria-hidden="true" />
                    <Textarea
                      value={bullet}
                      onChange={(e) => updateBullet(index, e.target.value)}
                      placeholder="Describe your achievement with metrics if possible..."
                      className="min-h-[80px] flex-1"
                      aria-label={`Bullet point ${index + 1}`}
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleImprove(index)}
                        disabled={improving?.isStreaming === true}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        aria-label={`Improve bullet point ${index + 1} with AI`}
                        title="Improve with AI"
                      >
                        {improving?.index === index && improving.isStreaming ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                      {form.bullets.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBullet(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove bullet point ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {improving?.index === index && (
                    <div className="ml-6 mt-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          {improving.isStreaming ? "Improving..." : "AI Suggestion"}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                        {improving.result || "Thinking..."}
                      </p>
                      {!improving.isStreaming && improving.result && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleApplyImprovement}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Apply
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleDismissImprovement}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isNew ? "Add Experience" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
