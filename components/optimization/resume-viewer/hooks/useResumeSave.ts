"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { ParsedResume } from "@/lib/resume-parser"
import { toStructuredDocument } from "@/lib/optimized-resume-document"
import { normalizeRevisionToken } from "../helpers"
import type { SaveStatus } from "../types"

interface UseResumeSaveOptions {
  optimizedId: string
  revisionToken?: string
  matchScore?: number | null
  debounceMs?: number
}

export function useResumeSave(
  resumeData: ParsedResume,
  hasChanges: boolean,
  setHasChanges: (v: boolean) => void,
  options: UseResumeSaveOptions
) {
  const { optimizedId, matchScore, debounceMs = 2000 } = options
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [serverRevision, setServerRevision] = useState<string | undefined>(
    normalizeRevisionToken(options.revisionToken)
  )
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Keep saveStatus in sync with hasChanges
  useEffect(() => {
    if (hasChanges && saveStatus === "saved") {
      setSaveStatus("unsaved")
    }
  }, [hasChanges, saveStatus])

  const save = useCallback(async () => {
    if (!hasChanges && saveStatus !== "conflict") return

    setIsSaving(true)
    setSaveStatus("saving")
    try {
      const structuredOutput = toStructuredDocument(resumeData, {
        provenanceDefault: "user_edited",
      })

      const response = await fetch(`/api/resumes/optimized/${optimizedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structured_output: structuredOutput,
          client_revision: serverRevision,
          match_score: matchScore,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setServerRevision(
          normalizeRevisionToken(
            result?.optimized_resume?.revision_token || result?.optimized_resume?.updated_at
          )
        )
        setHasChanges(false)
        setSaveStatus("saved")
        toast.success("Changes saved")
      } else if (response.status === 409) {
        const conflictPayload = await response.json().catch(() => null)
        const latestServerRevision = normalizeRevisionToken(
          conflictPayload?.details?.server_revision
        )
        if (latestServerRevision) {
          setServerRevision(latestServerRevision)
        }
        setSaveStatus("conflict")
        toast.error("Save conflict detected. Review and save again.")
      } else {
        setSaveStatus("unsaved")
        toast.error("Save failed. Try again.")
      }
    } catch {
      setSaveStatus("unsaved")
      toast.error("Save failed. Try again.")
    } finally {
      setIsSaving(false)
    }
  }, [hasChanges, saveStatus, resumeData, optimizedId, serverRevision, matchScore, setHasChanges])

  // Autosave with proper cleanup
  useEffect(() => {
    if (!hasChanges || isSaving || saveStatus === "conflict") return
    timerRef.current = setTimeout(() => {
      void save()
    }, debounceMs)
    return () => clearTimeout(timerRef.current)
  }, [resumeData, hasChanges, isSaving, saveStatus, save, debounceMs])

  // beforeunload warning + sendBeacon fallback
  useEffect(() => {
    if (!hasChanges) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
      // Best-effort save via sendBeacon
      try {
        const structuredOutput = toStructuredDocument(resumeData, {
          provenanceDefault: "user_edited",
        })
        navigator.sendBeacon(
          `/api/resumes/optimized/${optimizedId}`,
          new Blob(
            [JSON.stringify({
              structured_output: structuredOutput,
              client_revision: serverRevision,
              match_score: matchScore,
            })],
            { type: "application/json" }
          )
        )
      } catch {
        // Ignore sendBeacon failures
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasChanges, resumeData, optimizedId, serverRevision, matchScore])

  return {
    isSaving,
    saveStatus,
    save,
    serverRevision,
    setServerRevision,
    setSaveStatus,
  }
}
