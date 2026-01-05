"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Briefcase, ChevronDown, ChevronUp } from "lucide-react"
import type { WorkExperienceItem } from "@/lib/resume-parser"
import { cn } from "@/lib/utils"

interface WorkExperienceEditorProps {
  experience: WorkExperienceItem
  index: number
  isExpanded: boolean
  onToggle: () => void
  onBulletChange: (expIndex: number, bulletIndex: number, value: string) => void
  onAddBullet: (expIndex: number) => void
  onRemoveBullet: (expIndex: number, bulletIndex: number) => void
}

export function WorkExperienceEditor({
  experience,
  index,
  isExpanded,
  onToggle,
  onBulletChange,
  onAddBullet,
  onRemoveBullet,
}: WorkExperienceEditorProps) {
  const dateRange = [experience.startDate, experience.endDate]
    .filter(Boolean)
    .join(" – ")

  return (
    <div className={cn(
      "border transition-all duration-200 rounded-xl overflow-hidden",
      isExpanded 
        ? "border-emerald-500/30 bg-zinc-900/40 shadow-lg ring-1 ring-emerald-500/10" 
        : "border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700"
    )}>
      {/* Clickable Header */}
      <div 
        className="flex items-center justify-between gap-4 p-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={cn(
            "p-2.5 rounded-lg shrink-0",
            isExpanded ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
          )}>
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-zinc-100 truncate flex items-center gap-2">
              {experience.title || "Untitled Position"}
              {!isExpanded && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal">
                  {experience.bullets.length} bullets
                </span>
              )}
            </h4>
            <p className="text-sm text-zinc-400 truncate mt-0.5">
              {experience.company}
              {experience.location && ` · ${experience.location}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-zinc-500">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-5 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between pl-14 pr-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Bullet Points
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAddBullet(index)
              }}
              className="h-7 text-xs bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:text-emerald-400"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Bullet
            </Button>
          </div>

          <div className="space-y-3 pl-0 sm:pl-14">
            {experience.bullets.map((bullet, bulletIndex) => (
              <div key={bulletIndex} className="flex gap-3 items-start group">
                <span className="text-emerald-500/50 text-sm mt-3 select-none font-bold">
                  •
                </span>
                <Textarea
                  value={bullet}
                  onChange={(e) => onBulletChange(index, bulletIndex, e.target.value)}
                  placeholder="Describe your achievement or responsibility..."
                  className="min-h-[44px] flex-1 text-sm bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 text-zinc-300 resize-none py-2"
                  rows={2}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveBullet(index, bulletIndex)}
                  className="h-9 w-9 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
