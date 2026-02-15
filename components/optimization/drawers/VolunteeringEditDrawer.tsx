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
import type { VolunteerItem } from "@/lib/resume-parser"

interface VolunteeringEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  volunteering: VolunteerItem | null
  onSave: (volunteering: VolunteerItem) => void
  isNew?: boolean
}

export function VolunteeringEditDrawer({
  open,
  onOpenChange,
  volunteering,
  onSave,
  isNew = false,
}: VolunteeringEditDrawerProps) {
  const [form, setForm] = useState<VolunteerItem>({
    organization: "",
    role: "",
    dates: "",
    description: "",
  })

  useEffect(() => {
    if (!open) return
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
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="sm:max-w-md h-full">
        <DrawerHeader className="border-b">
          <DrawerTitle>
            {isNew ? "Add Volunteering & Leadership" : "Edit Volunteering & Leadership"}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              <Label htmlFor="drawer-organization">Organization *</Label>
              <Input
                id="drawer-organization"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="Habitat for Humanity"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-role">Role/Position</Label>
              <Input
                id="drawer-role"
                value={form.role || ""}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Volunteer Coordinator"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-dates">Dates</Label>
              <Input
                id="drawer-dates"
                value={form.dates || ""}
                onChange={(e) => setForm({ ...form, dates: e.target.value })}
                placeholder="Jan 2020 - Present"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-vol-description">Description</Label>
              <Textarea
                id="drawer-vol-description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your role, responsibilities, and impact..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          <Button onClick={handleSave} disabled={!form.organization.trim()}>
            {isNew ? "Add Volunteering" : "Save Changes"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
