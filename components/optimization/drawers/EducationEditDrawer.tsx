"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { EducationItem } from "@/lib/resume-parser"

interface EducationEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  education: EducationItem | null
  onSave: (education: EducationItem) => void
  isNew?: boolean
}

export function EducationEditDrawer({
  open,
  onOpenChange,
  education,
  onSave,
  isNew = false,
}: EducationEditDrawerProps) {
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
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="sm:max-w-md h-full">
        <DrawerHeader className="border-b">
          <DrawerTitle>
            {isNew ? "Add Education" : "Edit Education"}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              <Label htmlFor="drawer-institution">Institution</Label>
              <Input
                id="drawer-institution"
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                placeholder="University of California, Berkeley"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="drawer-degree">Degree</Label>
                <Input
                  id="drawer-degree"
                  value={form.degree || ""}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                  placeholder="Bachelor of Science"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="drawer-field">Field of Study</Label>
                <Input
                  id="drawer-field"
                  value={form.field || ""}
                  onChange={(e) => setForm({ ...form, field: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-graduationDate">Graduation Date</Label>
              <Input
                id="drawer-graduationDate"
                value={form.graduationDate || ""}
                onChange={(e) => setForm({ ...form, graduationDate: e.target.value })}
                placeholder="May 2020"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-notes">Additional Notes</Label>
              <Textarea
                id="drawer-notes"
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="GPA, honors, relevant coursework, activities..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          <Button onClick={handleSave}>
            {isNew ? "Add Education" : "Save Changes"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
