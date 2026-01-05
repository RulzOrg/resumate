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
import type { EducationItem } from "@/lib/resume-parser"

interface EducationEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  education: EducationItem | null
  onSave: (education: EducationItem) => void
  isNew?: boolean
}

export function EducationEditDialog({
  open,
  onOpenChange,
  education,
  onSave,
  isNew = false,
}: EducationEditDialogProps) {
  const [form, setForm] = useState<EducationItem>({
    institution: "",
    degree: "",
    field: "",
    graduationDate: "",
    notes: "",
  })

  useEffect(() => {
    if (education) {
      setForm(education)
    } else {
      setForm({
        institution: "",
        degree: "",
        field: "",
        graduationDate: "",
        notes: "",
      })
    }
  }, [education, open])

  const handleSave = () => {
    onSave(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add Education" : "Edit Education"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              placeholder="University of California, Berkeley"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="degree">Degree</Label>
              <Input
                id="degree"
                value={form.degree || ""}
                onChange={(e) => setForm({ ...form, degree: e.target.value })}
                placeholder="Bachelor of Science"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="field">Field of Study</Label>
              <Input
                id="field"
                value={form.field || ""}
                onChange={(e) => setForm({ ...form, field: e.target.value })}
                placeholder="Computer Science"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="graduationDate">Graduation Date</Label>
            <Input
              id="graduationDate"
              value={form.graduationDate || ""}
              onChange={(e) => setForm({ ...form, graduationDate: e.target.value })}
              placeholder="May 2020"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="GPA, honors, relevant coursework, activities..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isNew ? "Add Education" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


