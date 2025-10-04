"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft } from 'lucide-react'
import { EditorProvider, useEditor } from './editor-provider'
import { PreviewPanel } from './preview-panel'
import { ContactSection } from './sections/contact-section'
import { TargetTitleSection } from './sections/target-title-section'
import { SummarySection } from './sections/summary-section'
import { SkillsSection } from './sections/skills-section'
import { InterestsSection } from './sections/interests-section'
import { ExperienceSection } from './sections/experience-section'
import { EducationSection } from './sections/education-section'
import type { EditorState } from '@/lib/resume-editor-utils'

interface ResumeEditorProps {
  initialState: EditorState
  resumeId: string
  resumeTitle: string
}

function EditorContent({ resumeTitle }: { resumeTitle: string }) {
  const { save, isSaving, isDirty, lastSaved } = useEditor()
  const router = useRouter()
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaveError(null)
    try {
      await save()
      // Optionally redirect or show success message
    } catch (error) {
      setSaveError('Failed to save. Please try again.')
    }
  }

  const handleBack = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Do you want to leave without saving?')) {
        router.push('/dashboard/master-resume')
      }
    } else {
      router.push('/dashboard/master-resume')
    }
  }

  return (
    <>
      {/* Header Bar */}
      <div className="sticky top-0 z-20 border-b border-neutral-800 bg-black/50 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{resumeTitle}</h1>
              {lastSaved && (
                <p className="text-xs text-neutral-500">
                  Last saved {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-neutral-400 hidden sm:inline">Unsaved changes</span>
            )}
            {saveError && (
              <span className="text-xs text-red-400">{saveError}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <section className="px-8 pt-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Panel - 50% width */}
            <section className="space-y-6">
              <ContactSection />
              <TargetTitleSection />
              <SummarySection />
              <ExperienceSection />
              <EducationSection />
              <SkillsSection />
              <InterestsSection />
            </section>

            {/* Preview Panel - 50% width */}
            <PreviewPanel />
          </div>
        </section>
      </main>
    </>
  )
}

export function ResumeEditor({ initialState, resumeId, resumeTitle }: ResumeEditorProps) {
  return (
    <EditorProvider initialState={initialState} resumeId={resumeId}>
      <div className="flex flex-col h-screen">
        <EditorContent resumeTitle={resumeTitle} />
      </div>
    </EditorProvider>
  )
}
