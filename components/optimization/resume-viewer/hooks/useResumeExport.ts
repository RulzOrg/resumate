"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { ParsedResume } from "@/lib/resume-parser"
import { formatResumeForWord } from "../utils/word-export"

export function useResumeExport(
  resumeData: ParsedResume,
  optimizedContent: string,
  optimizedId: string,
  layout: string
) {
  const [copySuccess, setCopySuccess] = useState(false)

  const copyText = useCallback(async () => {
    try {
      const { html, text } = formatResumeForWord(resumeData)
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })
      await navigator.clipboard.write([clipboardItem])
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      toast.success("Copied to clipboard")
    } catch {
      // Fallback: try copying plain text
      try {
        const { text } = formatResumeForWord(resumeData)
        await navigator.clipboard.writeText(text)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
        toast.success("Copied to clipboard")
      } catch {
        // Last resort: try raw content
        try {
          await navigator.clipboard.writeText(optimizedContent)
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
          toast.success("Copied to clipboard")
        } catch {
          toast.error("Copy failed. Try again.")
        }
      }
    }
  }, [resumeData, optimizedContent])

  const download = useCallback((format: "docx" | "html") => {
    try {
      const link = document.createElement("a")
      const encodedId = encodeURIComponent(optimizedId)
      link.href = `/api/resumes/export?resume_id=${encodedId}&format=${format}&layout=${layout}`
      link.target = "_blank"
      link.rel = "noopener"
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Download started")
    } catch {
      toast.error("Download failed. Try again.")
    }
  }, [optimizedId, layout])

  return { copySuccess, copyText, download }
}
