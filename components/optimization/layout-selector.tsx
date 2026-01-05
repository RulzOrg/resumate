"use client"

import * as React from "react"
import { Check, ArrowRight, FileText, Layout, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LayoutSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLayout: string
  onSelect: (layout: string) => void
}

const layouts = [
  {
    id: "classic",
    title: "Classic",
    description: "Standard top-down flow. Best for traditional resumes and long-form documentation.",
    icon: FileText,
    preview: (
      <div className="w-full h-full flex flex-col gap-1.5 p-3">
        <div className="h-2 w-2/5 bg-white/20 rounded-sm" />
        <div className="h-1.5 w-full bg-white/10 rounded-sm" />
        <div className="h-1.5 w-full bg-white/10 rounded-sm" />
        <div className="h-1.5 w-4/5 bg-white/10 rounded-sm" />
        <div className="mt-2 h-1.5 w-full bg-white/10 rounded-sm" />
        <div className="h-1.5 w-full bg-white/10 rounded-sm" />
        <div className="h-1.5 w-full bg-white/10 rounded-sm" />
        <div className="h-1.5 w-3/4 bg-white/10 rounded-sm" />
      </div>
    ),
  },
  {
    id: "modern",
    title: "Modern",
    description: "Split layout with a persistent sidebar. Ideal for portfolios and profiles.",
    icon: Layout,
    preview: (
      <div className="w-full h-full flex gap-2 p-3">
        <div className="w-1/3 flex flex-col gap-1.5">
          <div className="h-6 w-6 rounded-full bg-white/20" />
          <div className="h-1.5 w-full bg-white/10 rounded-sm" />
          <div className="h-1.5 w-full bg-white/10 rounded-sm" />
          <div className="mt-auto h-8 w-full bg-white/5 rounded-sm border border-white/10 border-dashed" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-2 w-3/4 bg-white/20 rounded-sm" />
          <div className="h-1.5 w-full bg-white/10 rounded-sm" />
          <div className="h-1.5 w-full bg-white/10 rounded-sm" />
          <div className="h-1.5 w-full bg-white/10 rounded-sm" />
          <div className="mt-2 h-1.5 w-full bg-white/10 rounded-sm" />
          <div className="h-1.5 w-full bg-white/10 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "compact",
    title: "Compact",
    description: "High-density data grid. Maximizes information per page for technical sheets.",
    icon: LayoutGrid,
    preview: (
      <div className="w-full h-full flex flex-col gap-2 p-3">
        <div className="flex justify-between items-center mb-1">
          <div className="h-2 w-1/4 bg-white/20 rounded-sm" />
          <div className="h-1.5 w-1/6 bg-white/10 rounded-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          <div className="bg-white/5 border border-white/10 rounded-md p-1.5 flex flex-col gap-1">
            <div className="h-1.5 w-full bg-white/10 rounded-sm" />
            <div className="h-1.5 w-3/4 bg-white/10 rounded-sm" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-md p-1.5 flex flex-col gap-1">
            <div className="h-1.5 w-full bg-white/10 rounded-sm" />
            <div className="h-1.5 w-3/4 bg-white/10 rounded-sm" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <div className="h-1.5 w-full bg-white/10 rounded-sm" />
            <div className="h-1.5 w-full bg-white/10 rounded-sm" />
            <div className="h-1.5 w-full bg-white/10 rounded-sm" />
          </div>
        </div>
      </div>
    ),
  },
]

export function LayoutSelector({ open, onOpenChange, currentLayout, onSelect }: LayoutSelectorProps) {
  const [selected, setSelected] = React.useState(currentLayout)

  React.useEffect(() => {
    setSelected(currentLayout)
  }, [currentLayout, open])

  const handleApply = () => {
    onSelect(selected)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#121212] border-white/10 text-white p-0 overflow-hidden sm:rounded-2xl">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Choose Layout</DialogTitle>
            <DialogDescription className="text-white/60">
              Select a structure for your exported document.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 pt-4">
          {layouts.map((layout) => {
            const isSelected = selected === layout.id
            const Icon = layout.icon

            return (
              <button
                key={layout.id}
                onClick={() => setSelected(layout.id)}
                className={cn(
                  "relative flex flex-col text-left group transition-all duration-200 focus:outline-none",
                  "bg-[#1A1A1A] hover:bg-[#222] rounded-xl border-2 p-1",
                  isSelected ? "border-emerald-500/50" : "border-transparent"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 z-10 bg-emerald-500 text-black rounded-full p-0.5 border-4 border-[#121212]">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
                
                <div className="aspect-[4/3] rounded-lg bg-black/40 border border-white/5 mb-3 overflow-hidden relative">
                  {layout.preview}
                </div>

                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("h-4 w-4", isSelected ? "text-emerald-400" : "text-white/40")} />
                    <span className="font-medium text-sm">{layout.title}</span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {layout.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter className="bg-black/20 p-4 px-6 border-t border-white/5 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/5 font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="bg-white text-black hover:bg-white/90 font-semibold px-6"
          >
            Apply Changes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

