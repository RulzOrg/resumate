"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronRight, Pencil, Plus, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { SECTIONS } from "./constants"
import { hasSectionContent, getSectionCount } from "./helpers"
import { SectionContent } from "./SectionContent"
import type { SectionsListProps } from "./types"

export function SectionsList({
  parsed,
  expandedSections,
  onToggle,
  onEdit,
  onAdd,
  onEditItem,
  onDeleteItem,
}: SectionsListProps) {
  return (
    <div className="space-y-0.5 w-full min-w-0">
      {SECTIONS.map((section) => {
        const hasContent = hasSectionContent(parsed, section.id)
        const count = getSectionCount(parsed, section.id)
        const Icon = section.icon
        const isExpanded = expandedSections.includes(section.id)
        return (
          <div key={section.id} className="w-full min-w-0">
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors cursor-pointer w-full min-w-0",
                hasContent ? "hover:bg-muted/50" : "opacity-60 hover:opacity-80",
                isExpanded && "bg-muted/50"
              )}
              onClick={() => onToggle(section.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onToggle(section.id)
                }
              }}
              aria-expanded={isExpanded}
              aria-label={`Toggle ${section.label} section`}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                  isExpanded && "rotate-90"
                )}
              />
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate flex-1 min-w-0">{section.label}</span>
              {count > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {count}
                </span>
              )}

              <div
                className="flex items-center gap-0.5 shrink-0 ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {'hasEdit' in section && section.hasEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onEdit(section.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {'hasAdd' in section && section.hasAdd && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onAdd(section.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
                {'hasMore' in section && section.hasMore && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(section.id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit First Item
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAdd(section.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Accordion Content */}
            {isExpanded && (
              <div className="w-full min-w-0">
                <div className="w-full min-w-0">
                  <SectionContent
                    sectionId={section.id}
                    parsed={parsed}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
