"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { CertificationItem } from "@/lib/resume-parser"

interface CertificationsEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  certifications: CertificationItem[]
  onSave: (certifications: CertificationItem[]) => void
}

export function CertificationsEditDialog({
  open,
  onOpenChange,
  certifications,
  onSave,
}: CertificationsEditDialogProps) {
  const [form, setForm] = useState<CertificationItem[]>(
    certifications.length > 0 ? certifications : [{ name: "", issuer: "" }]
  )
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setForm(certifications.length > 0 ? certifications : [{ name: "", issuer: "" }])
  }, [certifications, open])

  const handleSave = () => {
    onSave(form.filter((c) => c.name.trim() !== ""))
    onOpenChange(false)
  }

  const addItem = () => {
    setForm([...form, { name: "", issuer: "" }])
    setTimeout(() => {
      const nameInputIndex = (form.length * 2)
      inputRefs.current[nameInputIndex]?.focus()
    }, 0)
  }

  const removeItem = (index: number) => {
    if (form.length > 1) {
      setForm(form.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: "name" | "issuer", value: string) => {
    const newForm = [...form]
    newForm[index] = { ...newForm[index], [field]: value }
    setForm(newForm)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: "name" | "issuer") => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (field === "name") {
        // Move to issuer field
        const issuerInputIndex = (index * 2) + 1
        inputRefs.current[issuerInputIndex]?.focus()
      } else {
        // Move to next item's name field or add new item
        if (index === form.length - 1) {
          addItem()
        } else {
          const nextNameInputIndex = ((index + 1) * 2)
          inputRefs.current[nextNameInputIndex]?.focus()
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Certifications</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label>Certifications ({form.filter((c) => c.name.trim()).length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Certification
            </Button>
          </div>

          <div className="space-y-3">
            {form.map((cert, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="flex gap-2 items-center">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="flex-1 grid gap-2">
                    <Input
                      ref={(el) => { inputRefs.current[index * 2] = el }}
                      value={cert.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, "name")}
                      placeholder="Certification name..."
                      className="flex-1"
                    />
                    <Input
                      ref={(el) => { inputRefs.current[index * 2 + 1] = el }}
                      value={cert.issuer || ""}
                      onChange={(e) => updateItem(index, "issuer", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, "issuer")}
                      placeholder="Issuer (optional)..."
                      className="flex-1"
                    />
                  </div>
                  {form.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
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

