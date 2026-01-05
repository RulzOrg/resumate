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

interface SimpleListEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  items: string[]
  onSave: (items: string[]) => void
  placeholder?: string
}

export function SimpleListEditDialog({
  open,
  onOpenChange,
  title,
  items,
  onSave,
  placeholder = "Enter item...",
}: SimpleListEditDialogProps) {
  const [form, setForm] = useState<string[]>(items.length > 0 ? items : [""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setForm(items.length > 0 ? items : [""])
  }, [items, open])

  const handleSave = () => {
    onSave(form.filter((s) => s.trim() !== ""))
    onOpenChange(false)
  }

  const addItem = () => {
    setForm([...form, ""])
    setTimeout(() => {
      inputRefs.current[form.length]?.focus()
    }, 0)
  }

  const removeItem = (index: number) => {
    if (form.length > 1) {
      setForm(form.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, value: string) => {
    const newForm = [...form]
    newForm[index] = value
    setForm(newForm)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (index === form.length - 1) {
        addItem()
      } else {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label>Items ({form.filter((s) => s.trim()).length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-2">
            {form.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Input
                  ref={(el) => { inputRefs.current[index] = el }}
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder={placeholder}
                  className="flex-1"
                />
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


