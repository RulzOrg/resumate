"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Copy,
  Download,
  FileText,
  Save,
  Loader2,
  Check,
  Undo2,
  Redo2,
} from "lucide-react"
import {
  parseResumeContent,
  type ParsedResume,
} from "@/lib/resume-parser"
import { normalizeStructuredOutput } from "@/lib/optimized-resume-document"
import {
  ContactEditDialog,
  ExperienceEditDialog,
  EducationEditDialog,
  SkillsEditDialog,
  SimpleListEditDialog,
  TextEditDialog,
  CertificationsEditDialog,
  ProjectEditDialog,
  VolunteeringEditDialog,
  PublicationEditDialog,
} from "../dialogs"
import { cn } from "@/lib/utils"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { usePlatform } from "@/hooks/use-platform"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Kbd } from "@/components/keyboard-shortcuts/kbd"

import type { ResumeViewerV2Props } from "./types"
import { DEFAULT_EXPANDED_SECTIONS } from "./constants"
import { classifyMatch } from "./helpers"
import { useResumeEditor } from "./hooks/useResumeEditor"
import { useResumeDialogs } from "./hooks/useResumeDialogs"
import { useResumeSave } from "./hooks/useResumeSave"
import { useResumeExport } from "./hooks/useResumeExport"
import { SectionsList } from "./SectionsList"
import { ResumePreview } from "./ResumePreview"

export function ResumeViewerV2({
  optimizedId,
  title,
  optimizedContent,
  structuredOutput,
  revisionToken,
  matchScore,
}: ResumeViewerV2Props) {
  const layout = "modern"
  const [expandedSections, setExpandedSections] = useState<string[]>([...DEFAULT_EXPANDED_SECTIONS])

  // Normalize structured data
  const normalizedStructured = useMemo(
    () => normalizeStructuredOutput(structuredOutput, optimizedContent),
    [structuredOutput, optimizedContent]
  )

  // Parse initial content
  const initialParsed = useMemo(() => {
    if (normalizedStructured) {
      return normalizedStructured.document
    }
    return parseResumeContent(optimizedContent || "")
  }, [normalizedStructured, optimizedContent])

  // Core editor state (undo/redo, change tracking)
  const editor = useResumeEditor(initialParsed)
  const { resumeData, setResumeData, hasChanges, setHasChanges, updateResumeData } = editor

  // Sync resumeData when optimizedContent changes externally
  const lastSyncedContentRef = useRef<string | undefined>(optimizedContent)
  useEffect(() => {
    if (lastSyncedContentRef.current === optimizedContent) return
    if (hasChanges) {
      console.warn("Skipping sync: unsaved changes present")
      return
    }
    setResumeData(initialParsed)
    editor.resetHistory()
    lastSyncedContentRef.current = optimizedContent
  }, [initialParsed, optimizedContent, hasChanges, setResumeData, editor])

  // Save logic (autosave, conflict detection, beforeunload)
  const { isSaving, saveStatus, save, setSaveStatus } = useResumeSave(
    resumeData,
    hasChanges,
    setHasChanges,
    { optimizedId, revisionToken, matchScore }
  )

  // Dialog orchestration
  const dialogs = useResumeDialogs(resumeData, updateResumeData)

  // Export (copy, download)
  const { copySuccess, copyText, download } = useResumeExport(
    resumeData,
    optimizedContent,
    optimizedId,
    layout
  )

  const match = classifyMatch(matchScore)

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Platform detection for shortcut display
  const { modifierKey } = usePlatform()

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "d",
      modifiers: { meta: true },
      handler: () => download("docx"),
      description: "Download DOCX",
    },
    {
      key: "c",
      modifiers: { meta: true },
      handler: copyText,
      description: "Copy resume content",
    },
    {
      key: "s",
      modifiers: { meta: true },
      handler: save,
      description: "Save changes",
      enabled: (hasChanges || saveStatus === "conflict") && !isSaving,
    },
    {
      key: "p",
      modifiers: { meta: true },
      handler: () => download("html"),
      description: "Preview HTML",
    },
    {
      key: "z",
      modifiers: { meta: true },
      handler: editor.undo,
      description: "Undo",
      enabled: editor.canUndo,
    },
    {
      key: "y",
      modifiers: { meta: true },
      handler: editor.redo,
      description: "Redo",
      enabled: editor.canRedo,
    },
  ])

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="text-sm text-muted-foreground">
              Match: <span className={match.className}>{match.label}</span>
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              Status:{" "}
              <span
                className={cn(
                  saveStatus === "saved" && "text-emerald-500",
                  saveStatus === "saving" && "text-amber-500",
                  saveStatus === "unsaved" && "text-foreground",
                  saveStatus === "conflict" && "text-red-500"
                )}
              >
                {saveStatus === "saved" && "Saved"}
                {saveStatus === "saving" && "Saving"}
                {saveStatus === "unsaved" && "Unsaved"}
                {saveStatus === "conflict" && "Conflict"}
              </span>
            </div>
          </div>

          <TooltipProvider>
            <div className="flex flex-wrap items-center gap-2">
              {/* Undo / Redo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={editor.undo}
                    disabled={!editor.canUndo}
                    aria-label="Undo"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Undo</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>Z</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={editor.redo}
                    disabled={!editor.canRedo}
                    aria-label="Redo"
                  >
                    <Redo2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Redo</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>Y</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              {/* Save */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={save}
                    disabled={isSaving || (!hasChanges && saveStatus !== "conflict")}
                    className="bg-primary"
                    aria-label="Save resume changes"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                    )}
                    Save Changes
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Save changes</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>S</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              {/* Copy */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyText}
                    className={copySuccess ? "bg-emerald-500/10 border-emerald-500/20" : ""}
                    aria-label="Copy resume content to clipboard"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-emerald-500" aria-hidden="true" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" aria-hidden="true" /> Copy
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Copy resume content</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>C</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              {/* Preview */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download("html")}
                    aria-label="Preview resume as HTML"
                  >
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" /> Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Preview as HTML</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>P</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>

              {/* Download DOCX */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download("docx")}
                    aria-label="Download resume as Word document"
                  >
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" /> DOCX
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Download as DOCX</span>
                  <span className="ml-2 opacity-60">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>D</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] h-[calc(100vh-280px)] min-h-[800px]">
            {/* Left Panel - Sections List */}
            <div className="relative border-r-0 md:border-r border-border bg-muted/20 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 h-full">
                <div className="p-4">
                  <SectionsList
                    parsed={resumeData}
                    metadata={normalizedStructured?.metadata}
                    expandedSections={expandedSections}
                    onToggle={toggleSection}
                    onEdit={dialogs.openEdit}
                    onAdd={dialogs.openAdd}
                    onEditItem={dialogs.openEditItem}
                    onDeleteItem={dialogs.handleDeleteItem}
                  />
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Preview */}
            <div className="relative bg-gray-100 dark:bg-gray-900 overflow-hidden min-w-0 flex flex-col">
              <ScrollArea className="flex-1 h-full">
                <div className="p-4 md:p-6 lg:p-8">
                  <ResumePreview parsed={resumeData} rawContent={optimizedContent} />
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ContactEditDialog
        open={dialogs.activeDialog.type === "contact"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        contact={resumeData.contact}
        onSave={dialogs.handleSaveContact}
      />

      <TextEditDialog
        open={dialogs.activeDialog.type === "target"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        title="Edit Target Title"
        label="Target Job Title"
        value={resumeData.targetTitle || ""}
        onSave={(value) => { updateResumeData({ targetTitle: value }); dialogs.closeDialog() }}
        placeholder="Senior Product Designer"
      />

      <TextEditDialog
        open={dialogs.activeDialog.type === "summary"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        title="Edit Professional Summary"
        label="Professional Summary"
        value={resumeData.summary || ""}
        onSave={(value) => { updateResumeData({ summary: value }); dialogs.closeDialog() }}
        multiline
        maxLength={500}
        placeholder="Write a compelling summary highlighting your key achievements and value proposition..."
      />

      <ExperienceEditDialog
        open={dialogs.activeDialog.type === "experience"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        experience={
          dialogs.activeDialog.index !== null
            ? resumeData.workExperience[dialogs.activeDialog.index]
            : null
        }
        onSave={(exp) => { dialogs.handleSaveExperience(exp); dialogs.closeDialog() }}
        isNew={dialogs.activeDialog.isNew}
      />

      <EducationEditDialog
        open={dialogs.activeDialog.type === "education"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        education={
          dialogs.activeDialog.index !== null
            ? resumeData.education[dialogs.activeDialog.index]
            : null
        }
        onSave={dialogs.handleSaveEducation}
        isNew={dialogs.activeDialog.isNew}
      />

      <SkillsEditDialog
        open={dialogs.activeDialog.type === "skills"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        skills={resumeData.skills}
        onSave={(skills) => { updateResumeData({ skills }); dialogs.closeDialog() }}
      />

      <SimpleListEditDialog
        open={dialogs.activeDialog.type === "interests"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        title="Interests"
        items={resumeData.interests}
        onSave={(interests) => { updateResumeData({ interests }); dialogs.closeDialog() }}
        placeholder="Enter an interest..."
      />

      <CertificationsEditDialog
        open={dialogs.activeDialog.type === "certifications"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        certifications={resumeData.certifications}
        onSave={(certifications) => { updateResumeData({ certifications }); dialogs.closeDialog() }}
      />

      <SimpleListEditDialog
        open={dialogs.activeDialog.type === "awards"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        title="Awards & Scholarships"
        items={resumeData.awards}
        onSave={(awards) => { updateResumeData({ awards }); dialogs.closeDialog() }}
        placeholder="Award or scholarship name..."
      />

      <ProjectEditDialog
        open={dialogs.activeDialog.type === "projects"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        project={
          dialogs.activeDialog.index !== null
            ? resumeData.projects[dialogs.activeDialog.index]
            : null
        }
        onSave={dialogs.handleSaveProject}
        isNew={dialogs.activeDialog.isNew}
      />

      <VolunteeringEditDialog
        open={dialogs.activeDialog.type === "volunteering"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        volunteering={
          dialogs.activeDialog.index !== null
            ? resumeData.volunteering[dialogs.activeDialog.index]
            : null
        }
        onSave={dialogs.handleSaveVolunteering}
        isNew={dialogs.activeDialog.isNew}
      />

      <PublicationEditDialog
        open={dialogs.activeDialog.type === "publications"}
        onOpenChange={(open) => { if (!open) dialogs.closeDialog() }}
        publication={
          dialogs.activeDialog.index !== null
            ? resumeData.publications[dialogs.activeDialog.index]
            : null
        }
        onSave={dialogs.handleSavePublication}
        isNew={dialogs.activeDialog.isNew}
      />
    </div>
  )
}
