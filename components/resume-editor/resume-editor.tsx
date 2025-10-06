"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Undo2, Redo2 } from 'lucide-react'
import { EditorProvider, useEditor } from './editor-provider'
import { PreviewPanel } from './preview-panel'
import { ContactSection } from './sections/contact-section'
import { TargetTitleSection } from './sections/target-title-section'
import { SummarySection } from './sections/summary-section'
import { SkillsSection } from './sections/skills-section'
import { InterestsSection } from './sections/interests-section'
import { ExperienceSection } from './sections/experience-section'
import { EducationSection } from './sections/education-section'
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import type { EditorState } from '@/lib/resume-editor-utils'

interface ResumeEditorProps {
  initialState: EditorState
  resumeId: string
  resumeTitle: string
}

function EditorContent({ resumeTitle }: { resumeTitle: string }) {
  const { save, isSaving, isDirty, lastSaved, undo, redo, canUndo, canRedo } = useEditor()
  const router = useRouter()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 's',
      ctrl: true,
      callback: (e) => {
        e.preventDefault()
        handleSave()
      },
      description: 'Save resume'
    },
    {
      key: 'z',
      ctrl: true,
      callback: (e) => {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      },
      description: 'Undo/Redo'
    }
  ])

  const handleSave = async () => {
    setSaveError(null)
    try {
      await save()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save. Please try again.')
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
              title="Back to resumes"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight font-geist">{resumeTitle}</h1>
              <div className="flex items-center gap-2 text-xs text-white/60 font-geist">
                {isDirty && <span className="text-amber-400">Unsaved changes</span>}
                {!isDirty && lastSaved && (
                  <span>Last saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
                {saveError && <span className="text-red-400">{saveError}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo buttons */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (⌘Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="h-4 w-4" />
            </button>

            {/* Keyboard shortcuts help */}
            <KeyboardShortcutsHelp />

            {/* Manual save button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition font-geist"
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
