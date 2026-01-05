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
import type { PublicationItem } from "@/lib/resume-parser"

interface PublicationEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  publication: PublicationItem | null
  onSave: (publication: PublicationItem) => void
  isNew?: boolean
}

export function PublicationEditDialog({
  open,
  onOpenChange,
  publication,
  onSave,
  isNew = false,
}: PublicationEditDialogProps) {
  const [form, setForm] = useState<PublicationItem>({
    title: "",
    publisher: "",
    date: "",
    description: "",
  })

  useEffect(() => {
    if (publication) {
      setForm(publication)
    } else {
      setForm({
        title: "",
        publisher: "",
        date: "",
        description: "",
      })
    }
  }, [publication, open])

  const handleSave = () => {
    if (!form.title.trim()) {
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
            {isNew ? "Add Publication" : "Edit Publication"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Machine Learning Applications in Healthcare"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="publisher">Publisher/Journal</Label>
              <Input
                id="publisher"
                value={form.publisher || ""}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                placeholder="Nature"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Publication Date</Label>
              <Input
                id="date"
                value={form.date || ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                placeholder="2023"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description or abstract..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.title.trim()}>
            {isNew ? "Add Publication" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

