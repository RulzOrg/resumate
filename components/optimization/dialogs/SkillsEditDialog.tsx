"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { X, Plus } from "lucide-react"

interface SkillsEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skills: string[]
  onSave: (skills: string[]) => void
}

export function SkillsEditDialog({
  open,
  onOpenChange,
  skills,
  onSave,
}: SkillsEditDialogProps) {
  const [form, setForm] = useState<string[]>(skills)
  const [newSkill, setNewSkill] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(skills)
  }, [skills])

  const handleSave = () => {
    onSave(form.filter((s) => s.trim() !== ""))
    onOpenChange(false)
  }

  const addSkill = () => {
    const trimmed = newSkill.trim()
    if (trimmed && !form.includes(trimmed)) {
      setForm([...form, trimmed])
      setNewSkill("")
      inputRef.current?.focus()
    }
  }

  const removeSkill = (index: number) => {
    setForm(form.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addSkill()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Skills</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Add New Skill</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a skill and press Enter..."
              />
              <Button type="button" onClick={addSkill} size="icon" aria-label="Add skill">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Current Skills ({form.length})</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[120px] bg-muted/30">
              {form.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No skills added yet. Type above to add skills.
                </p>
              ) : (
                form.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-sm py-1 px-3 pr-2 flex items-center gap-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: Include both technical skills and soft skills relevant to your target role.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



