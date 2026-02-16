"use client"

import { useState, useCallback, useRef } from "react"
import { CloudUpload, FileText, X, ArrowRight, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  MAX_RESUME_FILE_SIZE,
  SUPPORTED_RESUME_MIME_TYPES,
  normalizeMimeType,
} from "@/lib/resume-upload-config"

const SUPPORTED_MIME_SET = new Set<string>(SUPPORTED_RESUME_MIME_TYPES)

interface ResumeUploaderProps {
  onUploadStart: () => void
  onUploadProgress: (step: number) => void
  onUploadSuccess: (data: {
    checkId: string
    preview: {
      estimatedSections: number
      hasContactInfo: boolean
      hasExperience: boolean
      estimatedWordCount: number
    }
  }) => void
  onUploadError: (error: string) => void
}

export function ResumeUploader({
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
}: ResumeUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const normalizedMime = normalizeMimeType(file.type)
    if (!SUPPORTED_MIME_SET.has(normalizedMime)) {
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (!["pdf", "docx", "doc", "txt"].includes(ext || "")) {
        return "Please upload a PDF, DOCX, or TXT file."
      }
    }

    if (file.size > MAX_RESUME_FILE_SIZE) {
      return "File size must be under 10MB."
    }

    return null
  }

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      onUploadError(error)
      return
    }
    setSelectedFile(file)
  }, [onUploadError])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return

    setIsUploading(true)
    onUploadStart()

    try {
      // Step 1: Uploading
      onUploadProgress(0)

      const formData = new FormData()
      formData.append("file", selectedFile)

      // Add UTM params from URL if present
      const urlParams = new URLSearchParams(window.location.search)
      const utmSource = urlParams.get("utm_source")
      const utmMedium = urlParams.get("utm_medium")
      const utmCampaign = urlParams.get("utm_campaign")

      let url = "/api/public/ats-check"
      const queryParams = new URLSearchParams()
      if (utmSource) queryParams.set("utm_source", utmSource)
      if (utmMedium) queryParams.set("utm_medium", utmMedium)
      if (utmCampaign) queryParams.set("utm_campaign", utmCampaign)
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`
      }

      // Step 2: Extracting
      onUploadProgress(1)

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })

      // Step 3: Validating
      onUploadProgress(2)

      if (!response.ok) {
        let errorMessage = `Upload failed: ${response.status} ${response.statusText}`
        try {
          const errorText = await response.text()
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText)
              errorMessage = errorJson.userMessage || errorJson.message || errorMessage
            } catch {
              errorMessage = errorText || errorMessage
            }
          }
        } catch {
          // Use default errorMessage if reading response fails
        }
        onUploadError(errorMessage)
        setIsUploading(false)
        return
      }

      let result
      try {
        result = await response.json()
      } catch (error) {
        onUploadError("Failed to parse server response. Please try again.")
        setIsUploading(false)
        return
      }

      if (result.status === "error") {
        onUploadError(result.userMessage || "Upload failed")
        setIsUploading(false)
        return
      }

      // Step 4: Preparing
      onUploadProgress(3)

      // Small delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500))

      onUploadSuccess({
        checkId: result.data.checkId,
        preview: result.data.preview,
      })
    } catch (error) {
      console.error("Upload error:", error)
      onUploadError("Failed to upload resume. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="space-y-3">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-all cursor-pointer",
            isDragOver
              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
              : "border-border bg-card hover:border-border hover:bg-accent",
            selectedFile && "bg-primary/5 border-primary/30"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleInputChange}
            className="hidden"
          />

          {!selectedFile ? (
            <>
              <div className="flex items-center justify-center h-10 w-10 rounded-full border border-border bg-white dark:bg-card group-hover:bg-card transition-colors">
                <CloudUpload className="w-5 h-5 text-foreground/80" />
              </div>
              <div className="text-sm font-medium text-foreground/80 font-sans">
                Drag & drop your resume
              </div>
              <div className="text-xs text-muted-foreground/70 font-sans">
                PDF, DOC, DOCX · max 10 MB
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 border border-primary/30">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm text-foreground/90 truncate font-sans">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground/70 font-sans">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFile()
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={cn(
            "w-full inline-flex justify-center items-center gap-2 rounded-full text-sm font-medium px-6 py-3 transition-all",
            selectedFile && !isUploading
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              : "bg-muted text-muted-foreground/70 cursor-not-allowed"
          )}
        >
          <span className="font-sans">
            {isUploading ? "Analyzing..." : "Get my ATS report"}
          </span>
          {!isUploading && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Shield className="w-3.5 h-3.5 text-muted-foreground/70" />
        <p className="text-xs text-muted-foreground font-sans">
          We'll email a personalized report with actionable recommendations.
        </p>
      </div>
    </div>
  )
}
