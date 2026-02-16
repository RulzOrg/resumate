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
import type { PublicationItem } from "@/lib/resume-parser"

interface PublicationEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  publication: PublicationItem | null
  onSave: (publication: PublicationItem) => void
  isNew?: boolean
}

export function PublicationEditDrawer({
  open,
  onOpenChange,
  publication,
  onSave,
  isNew = false,
}: PublicationEditDrawerProps) {
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
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="sm:max-w-md h-full">
        <DrawerHeader className="border-b">
          <DrawerTitle>
            {isNew ? "Add Publication" : "Edit Publication"}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              <Label htmlFor="drawer-pub-title">Title *</Label>
              <Input
                id="drawer-pub-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Machine Learning Applications in Healthcare"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="drawer-publisher">Publisher/Journal</Label>
                <Input
                  id="drawer-publisher"
                  value={form.publisher || ""}
                  onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                  placeholder="Nature"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="drawer-pub-date">Publication Date</Label>
                <Input
                  id="drawer-pub-date"
                  value={form.date || ""}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  placeholder="2023"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-pub-description">Description</Label>
              <Textarea
                id="drawer-pub-description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description or abstract..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          <Button onClick={handleSave} disabled={!form.title.trim()}>
            {isNew ? "Add Publication" : "Save Changes"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
