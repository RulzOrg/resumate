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
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { ProjectItem } from "@/lib/resume-parser"

interface ProjectEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectItem | null
  onSave: (project: ProjectItem) => void
  isNew?: boolean
}

export function ProjectEditDialog({
  open,
  onOpenChange,
  project,
  onSave,
  isNew = false,
}: ProjectEditDialogProps) {
  const [form, setForm] = useState<ProjectItem>({
    name: "",
    description: "",
    technologies: [],
    bullets: [""],
  })

  useEffect(() => {
    if (project) {
      setForm({
        ...project,
        bullets: project.bullets.length > 0 ? project.bullets : [""],
        technologies: project.technologies || [],
      })
    } else {
      setForm({
        name: "",
        description: "",
        technologies: [],
        bullets: [""],
      })
    }
  }, [project, open])

  const handleSave = () => {
    if (!form.name.trim()) {
      return
    }
    const cleanedBullets = form.bullets.filter((b) => b.trim() !== "")
    const cleanedTechnologies = (form.technologies || [])
      .map((tech) => tech.trim())
      .filter((tech) => tech !== "")
    onSave({ ...form, bullets: cleanedBullets, technologies: cleanedTechnologies })
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

  const addTechnology = () => {
    setForm({ ...form, technologies: [...(form.technologies || []), ""] })
  }

  const removeTechnology = (index: number) => {
    setForm({
      ...form,
      technologies: (form.technologies || []).filter((_, i) => i !== index),
    })
  }

  const updateTechnology = (index: number, value: string) => {
    const newTechnologies = [...(form.technologies || [])]
    newTechnologies[index] = value
    setForm({ ...form, technologies: newTechnologies })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add Project" : "Edit Project"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="E-commerce Platform"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the project..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Technologies</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTechnology}
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Technology
              </Button>
            </div>

            <div className="space-y-2">
              {(form.technologies || []).map((tech, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={tech}
                    onChange={(e) => updateTechnology(index, e.target.value)}
                    placeholder="React, TypeScript, Node.js..."
                    className="flex-1"
                  />
                  {(form.technologies || []).length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTechnology(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Key Achievements & Details</Label>
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
                    placeholder="Describe key features, impact, or achievements..."
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
          <Button onClick={handleSave} disabled={!form.name.trim()}>
            {isNew ? "Add Project" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

