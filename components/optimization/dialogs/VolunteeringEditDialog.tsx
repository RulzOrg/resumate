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
import type { VolunteerItem } from "@/lib/resume-parser"

interface VolunteeringEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  volunteering: VolunteerItem | null
  onSave: (volunteering: VolunteerItem) => void
  isNew?: boolean
}

export function VolunteeringEditDialog({
  open,
  onOpenChange,
  volunteering,
  onSave,
  isNew = false,
}: VolunteeringEditDialogProps) {
  const [form, setForm] = useState<VolunteerItem>({
    organization: "",
    role: "",
    dates: "",
    description: "",
  })

  useEffect(() => {
    if (volunteering) {
      setForm(volunteering)
    } else {
      setForm({
        organization: "",
        role: "",
        dates: "",
        description: "",
      })
    }
  }, [volunteering, open])

  const handleSave = () => {
    if (!form.organization.trim()) {
      return
    }
    onSave(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add Volunteering & Leadership" : "Edit Volunteering & Leadership"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="organization">Organization *</Label>
            <Input
              id="organization"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
              placeholder="Habitat for Humanity"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role/Position</Label>
            <Input
              id="role"
              value={form.role || ""}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Volunteer Coordinator"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dates">Dates</Label>
            <Input
              id="dates"
              value={form.dates || ""}
              onChange={(e) => setForm({ ...form, dates: e.target.value })}
              placeholder="Jan 2020 - Present"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your role, responsibilities, and impact..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.organization.trim()}>
            {isNew ? "Add Volunteering" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

