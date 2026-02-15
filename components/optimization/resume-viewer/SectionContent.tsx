"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { SectionContentProps } from "./types"
import { stripMarkdown } from "./utils/markdown"

export function SectionContent({
  sectionId,
  parsed,
  onEditItem,
  onDeleteItem,
}: SectionContentProps) {
  switch (sectionId) {
    case "contact":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm space-y-1">
          {parsed.contact.name && <p className="font-medium truncate">{parsed.contact.name}</p>}
          {parsed.contact.email && <p className="text-muted-foreground truncate">{parsed.contact.email}</p>}
          {parsed.contact.phone && <p className="text-muted-foreground truncate">{parsed.contact.phone}</p>}
          {parsed.contact.location && <p className="text-muted-foreground truncate">{parsed.contact.location}</p>}
        </div>
      )

    case "target":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm">
          <p className="truncate">{parsed.targetTitle || "No target title set"}</p>
        </div>
      )

    case "summary":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm min-w-0">
          <p className="text-muted-foreground line-clamp-3 break-words">
            {parsed.summary || "No summary added"}
          </p>
        </div>
      )

    case "experience":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.workExperience.map((exp, idx) => (
            <EditableListItem
              key={idx}
              sectionId="experience"
              index={idx}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              label={`Edit experience item ${idx + 1}`}
            >
              <p className="font-medium break-words">{exp.company}</p>
              <p className="text-muted-foreground text-xs break-words">{exp.title}</p>
            </EditableListItem>
          ))}
        </div>
      )

    case "education":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.education.map((edu, idx) => (
            <EditableListItem
              key={idx}
              sectionId="education"
              index={idx}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              label={`Edit education item ${idx + 1}`}
            >
              <p className="font-medium break-words">{edu.institution}</p>
              {edu.degree && (
                <p className="text-muted-foreground text-xs break-words">{edu.degree}</p>
              )}
            </EditableListItem>
          ))}
        </div>
      )

    case "skills":
      return (
        <div className="pl-7 pr-2 pb-2">
          <div className="flex flex-wrap gap-1">
            {parsed.skills.slice(0, 8).map((skill, idx) => (
              <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
                {stripMarkdown(skill)}
              </span>
            ))}
            {parsed.skills.length > 8 && (
              <span className="text-xs text-muted-foreground">
                +{parsed.skills.length - 8} more
              </span>
            )}
          </div>
        </div>
      )

    case "interests":
      return (
        <div className="pl-7 pr-2 pb-2 text-sm text-muted-foreground min-w-0 break-words">
          {parsed.interests.length > 0
            ? parsed.interests.slice(0, 5).map(i => stripMarkdown(i)).join(", ") +
              (parsed.interests.length > 5 ? ` +${parsed.interests.length - 5} more` : "")
            : "No interests added"}
        </div>
      )

    case "certifications":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-1 min-w-0">
          {parsed.certifications.slice(0, 3).map((cert, idx) => (
            <p key={idx} className="text-sm text-muted-foreground break-words">
              {cert.name}
            </p>
          ))}
          {parsed.certifications.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{parsed.certifications.length - 3} more
            </p>
          )}
        </div>
      )

    case "awards":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-1 min-w-0">
          {parsed.awards.slice(0, 3).map((award, idx) => (
            <p key={idx} className="text-sm text-muted-foreground break-words">
              {award}
            </p>
          ))}
          {parsed.awards.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{parsed.awards.length - 3} more
            </p>
          )}
        </div>
      )

    case "projects":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.projects.map((project, idx) => (
            <EditableListItem
              key={idx}
              sectionId="projects"
              index={idx}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              label={`Edit project item ${idx + 1}`}
            >
              <p className="font-medium break-words">{project.name}</p>
              {project.description && (
                <p className="text-muted-foreground text-xs break-words line-clamp-1">
                  {project.description}
                </p>
              )}
            </EditableListItem>
          ))}
        </div>
      )

    case "volunteering":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.volunteering.map((vol, idx) => (
            <EditableListItem
              key={idx}
              sectionId="volunteering"
              index={idx}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              label={`Edit volunteering item ${idx + 1}`}
            >
              <p className="font-medium break-words">{vol.organization}</p>
              {vol.role && (
                <p className="text-muted-foreground text-xs break-words">{vol.role}</p>
              )}
            </EditableListItem>
          ))}
        </div>
      )

    case "publications":
      return (
        <div className="pl-7 pr-2 pb-2 space-y-2 min-w-0">
          {parsed.publications.map((pub, idx) => (
            <EditableListItem
              key={idx}
              sectionId="publications"
              index={idx}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              label={`Edit publication item ${idx + 1}`}
            >
              <p className="font-medium break-words">{pub.title}</p>
              {pub.publisher && (
                <p className="text-muted-foreground text-xs break-words">{pub.publisher}</p>
              )}
            </EditableListItem>
          ))}
        </div>
      )

    default:
      return null
  }
}

/** Reusable row for editable list items (experience, education, projects, etc.) */
function EditableListItem({
  sectionId,
  index,
  onEdit,
  onDelete,
  label,
  children,
}: {
  sectionId: string
  index: number
  onEdit: (sectionId: string, index: number) => void
  onDelete: (sectionId: string, index: number) => void
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="group flex items-start justify-between text-sm p-2 rounded hover:bg-muted/50 cursor-pointer min-w-0"
      onClick={() => onEdit(sectionId, index)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onEdit(sectionId, index)
        }
      }}
      aria-label={label}
    >
      <div className="flex-1 min-w-0 pr-2">{children}</div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(sectionId, index)
        }}
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  )
}
