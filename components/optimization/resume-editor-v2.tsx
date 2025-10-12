"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Save, AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import type { SystemPromptV1Output } from "@/lib/schemas-v2"
import { ContactInfoSection } from "./sections/contact-info-section"
import { TargetTitleSection } from "./sections/target-title-section"
import { ProfessionalSummarySection } from "./sections/professional-summary-section"
import { WorkExperienceSection } from "./sections/work-experience-section"
import { EducationSection } from "./sections/education-section"
import { CertificationsSection } from "./sections/certifications-section"
import { SkillsSection } from "./sections/skills-section"
import { InterestsSection } from "./sections/interests-section"
import { LivePreviewPanel } from "./live-preview-panel"
import { QAPanel } from "./qa-panel"

interface ResumeEditorV2Props {
  optimizedId: string
  structuredOutput: SystemPromptV1Output
  jobTitle: string
  companyName?: string
  onSave?: (updates: Partial<SystemPromptV1Output>) => Promise<void | any>
}

export function ResumeEditorV2({
  optimizedId,
  structuredOutput,
  jobTitle,
  companyName,
  onSave,
}: ResumeEditorV2Props) {
  // Track if this is the initial mount and if we just saved
  const isInitialMount = useRef(true)
  const justSaved = useRef(false)
  
  // Local state management for UI updates
  const [localUI, setLocalUI] = useState(structuredOutput.ui)
  const [livePreview, setLivePreview] = useState(structuredOutput.ui.preview.live_preview_text)
  const [diffHints, setDiffHints] = useState(structuredOutput.ui.preview.diff_hints)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Generate live preview whenever UI state changes
  const generateLivePreview = useCallback(() => {
    const lines: string[] = []

    // Contact Information
    if (localUI.contact_information.include) {
      const contact = localUI.contact_information.fields
      const contactLine = [
        `${contact.first_name} ${contact.last_name}`,
        contact.location,
        contact.email,
        contact.phone,
        contact.linkedin,
      ]
        .filter(Boolean)
        .join(" | ")
      lines.push(contactLine)
      lines.push("")
    }

    // Target Title
    if (localUI.target_title.include && localUI.target_title.primary) {
      lines.push(localUI.target_title.primary.toUpperCase())
      lines.push("")
    }

    // Professional Summary
    if (localUI.professional_summary.include && localUI.professional_summary.primary) {
      lines.push("PROFESSIONAL SUMMARY")
      lines.push(localUI.professional_summary.primary)
      lines.push("")
    }

    // Skills
    if (localUI.skills.include) {
      lines.push("SKILLS")
      Object.entries(localUI.skills.groups).forEach(([category, skills]) => {
        if (skills.length > 0) {
          const categoryLabel = category
            .replace(/([A-Z])/g, " $1")
            .trim()
            .replace(/^./, (c) => c.toUpperCase())
          lines.push(`${categoryLabel}: ${skills.join(", ")}`)
        }
      })
      lines.push("")
    }

    // Work Experience
    if (localUI.work_experience.include) {
      lines.push("WORK EXPERIENCE")
      lines.push("")
      localUI.work_experience.items.forEach((item) => {
        if (item.include) {
          lines.push(`${item.company} — ${item.location}`)
          lines.push(`${item.title} | ${item.start_date} – ${item.end_date}`)
          item.bullets.primary.forEach((bullet) => {
            lines.push(`• ${bullet}`)
          })
          lines.push("")
        }
      })
    }

    // Education
    if (localUI.education.include && localUI.education.items.length > 0) {
      lines.push("EDUCATION")
      lines.push("")
      localUI.education.items.forEach((item) => {
        lines.push(`${item.degree} — ${item.institution}`)
        if (item.notes) {
          lines.push(item.notes)
        }
        lines.push("")
      })
    }

    // Certifications
    if (localUI.certifications.include && localUI.certifications.items.length > 0) {
      lines.push("CERTIFICATIONS")
      lines.push("")
      localUI.certifications.items.forEach((item) => {
        lines.push(`${item.name} — ${item.issuer}`)
      })
      lines.push("")
    }

    // Interests
    if (localUI.interests_or_extras.include && localUI.interests_or_extras.items.length > 0) {
      lines.push("INTERESTS")
      lines.push(localUI.interests_or_extras.items.join(", "))
      lines.push("")
    }

    return lines.join("\n").trim()
  }, [localUI])

  // Update preview when local state changes
  useEffect(() => {
    const newPreview = generateLivePreview()
    setLivePreview(newPreview)
    
    // Don't mark as unsaved if this is the initial mount or we just saved
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else if (justSaved.current) {
      justSaved.current = false
    } else {
      setHasUnsavedChanges(true)
    }
  }, [localUI, generateLivePreview])

  // Section update handlers
  const handleSectionUpdate = useCallback(
    (section: keyof typeof localUI, updates: any) => {
      setLocalUI((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...updates,
        },
      }))
    },
    []
  )

  // Save changes
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Build updated structured output
      const updatedOutput: SystemPromptV1Output = {
        ...structuredOutput,
        ui: {
          ...localUI,
          preview: {
            live_preview_text: livePreview,
            diff_hints: diffHints,
          },
        },
        tailored_resume_text: {
          ...structuredOutput.tailored_resume_text,
          ats_plain_text: livePreview,
        },
      }

      // Save via API
      const response = await fetch(`/api/resumes/optimized/${optimizedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structured_output: updatedOutput,
          optimized_content: livePreview,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to save resume")
      }

      const { resume } = await response.json()
      console.log("Resume saved:", resume)

      // Call optional onSave callback if provided
      if (onSave) {
        await onSave(updatedOutput)
      }

      // Mark as saved and set the flag to prevent immediate unsaved marking
      justSaved.current = true
      setHasUnsavedChanges(false)
      toast.success("Resume saved successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to save resume")
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Export handlers
  const handleExport = async (format: "docx" | "pdf" | "html") => {
    try {
      const toastId = toast.loading(`Generating ${format.toUpperCase()}...`)
      
      const response = await fetch("/api/resumes/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: optimizedId,
          format,
          job_title: jobTitle,
          company: companyName,
        }),
      })

      toast.dismiss(toastId)

      if (!response.ok) {
        // Handle fallback for PDF
        if (format === "pdf" && response.status === 503) {
          const errorData = await response.json()
          toast.error("PDF generation unavailable. Try DOCX format instead.")
          console.error("PDF generation error:", errorData.message)
          return
        }
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // For HTML format, open in new tab
      if (format === "html") {
        const html = await response.text()
        const newWindow = window.open()
        if (newWindow) {
          newWindow.document.write(html)
          newWindow.document.close()
        }
        toast.success("HTML preview opened in new tab")
        return
      }

      // For DOCX/PDF, download the file
      const blob = await response.blob()
      const fileName = structuredOutput.tailored_resume_text.file_name_suggestion || "resume"
      const fullFileName = `${fileName}.${format}`
      
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = fullFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast.success(`${format.toUpperCase()} downloaded successfully`)
    } catch (error: any) {
      toast.error(error?.message || `Failed to export ${format.toUpperCase()}`)
      console.error("Export error:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/dashboard/optimized"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Resume Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            For {jobTitle}
            {companyName && ` at ${companyName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            onClick={() => handleExport("docx")}
            disabled={hasUnsavedChanges}
            className="bg-[#10b981] hover:bg-[#059669] text-white rounded-full px-6"
          >
            <Download className="h-4 w-4 mr-2" />
            Export DOCX
          </Button>
        </div>
      </div>

      {/* Info about saving before export */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Save your resume before exporting to include your latest edits.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Form Sections */}
        <div className="space-y-6">
          <ContactInfoSection
            data={localUI.contact_information}
            onChange={(updates) => handleSectionUpdate("contact_information", updates)}
          />

          <TargetTitleSection
            data={localUI.target_title}
            onChange={(updates) => handleSectionUpdate("target_title", updates)}
            jobContext={{
              jobTitle: jobTitle,
              seniority: structuredOutput.analysis?.job?.seniority,
              keywords: structuredOutput.analysis?.job?.must_have_skills,
            }}
          />

          <ProfessionalSummarySection
            data={localUI.professional_summary}
            onChange={(updates) => handleSectionUpdate("professional_summary", updates)}
          />

          <WorkExperienceSection
            data={localUI.work_experience}
            onChange={(updates) => handleSectionUpdate("work_experience", updates)}
          />

          <EducationSection
            data={localUI.education}
            onChange={(updates) => handleSectionUpdate("education", updates)}
          />

          <CertificationsSection
            data={localUI.certifications}
            onChange={(updates) => handleSectionUpdate("certifications", updates)}
          />

          <SkillsSection
            data={localUI.skills}
            onChange={(updates) => handleSectionUpdate("skills", updates)}
          />

          <InterestsSection
            data={localUI.interests_or_extras}
            onChange={(updates) => handleSectionUpdate("interests_or_extras", updates)}
          />
        </div>

        {/* RIGHT: Live Preview & QA */}
        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <LivePreviewPanel
            text={livePreview}
            diffHints={diffHints}
            fileName={structuredOutput.tailored_resume_text.file_name_suggestion}
          />

          <QAPanel
            metrics={structuredOutput.qa}
            jobAnalysis={structuredOutput.analysis}
          />

          {/* Export Options Card */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Export Options</h3>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleExport("docx")}
                disabled={hasUnsavedChanges}
                className="w-full justify-start bg-[#10b981] hover:bg-[#059669] text-white rounded-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download DOCX (Recommended)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("pdf")}
                disabled={hasUnsavedChanges}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("html")}
                disabled={hasUnsavedChanges}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Preview HTML
              </Button>
            </div>
            {hasUnsavedChanges && (
              <p className="text-xs text-muted-foreground mt-2">
                💡 Save your changes before exporting
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Files follow ATS-friendly single-column format
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
