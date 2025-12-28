"use client"

import { useState, useEffect } from "react"
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
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { WorkExperienceItem } from "@/lib/resume-parser"

interface ExperienceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experience: WorkExperienceItem | null
  onSave: (experience: WorkExperienceItem) => void
  isNew?: boolean
}

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"]

export function ExperienceEditDialog({
  open,
  onOpenChange,
  experience,
  onSave,
  isNew = false,
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
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Bullet
              </Button>
            </div>

            <div className="space-y-2">
              {form.bullets.map((bullet, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <GripVertical className="h-4 w-4 mt-3 text-muted-foreground cursor-grab" />
                  <Textarea
                    value={bullet}
                    onChange={(e) => updateBullet(index, e.target.value)}
                    placeholder="Describe your achievement with metrics if possible..."
                    className="min-h-[80px] flex-1"
                  />
                  {form.bullets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBullet(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

