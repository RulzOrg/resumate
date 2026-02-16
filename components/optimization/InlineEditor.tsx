"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"

interface InlineEditorProps {
  value: string
  onSave: (newValue: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
  inputClassName?: string
  displayClassName?: string
}

export function InlineEditor({
  value,
  onSave,
  multiline = false,
  placeholder = "Click to edit",
  className,
  inputClassName,
  displayClassName,
}: InlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const saveGuardRef = useRef(false)

  // Sync draft when value prop changes while not editing
  useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [value, isEditing])

  // Auto-focus and select all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const save = useCallback(() => {
    if (saveGuardRef.current) return
    saveGuardRef.current = true

    const trimmed = draft.trim()
    if (trimmed !== value) {
      onSave(trimmed)
    }
    setIsEditing(false)

    // Reset guard after a tick to prevent double-save from Enter + blur race
    setTimeout(() => {
      saveGuardRef.current = false
    }, 50)
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setDraft(value)
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        cancel()
        return
      }

      if (multiline) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          save()
        }
      } else {
        if (e.key === "Enter") {
          e.preventDefault()
          save()
        }
      }
    },
    [multiline, save, cancel]
  )

  if (isEditing) {
    const sharedClasses = cn(
      "w-full bg-transparent outline-none",
      "ring-1 ring-primary/30 rounded-md px-2 py-1",
      "text-inherit font-inherit",
      className,
      inputClassName
    )

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          rows={3}
          className={cn(sharedClasses, "resize-y min-h-[4rem]")}
        />
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={sharedClasses}
      />
    )
  }

  const DisplayTag = multiline ? "p" : "span"
  const isEmpty = !value || value.trim().length === 0

  return (
    <DisplayTag
      role="button"
      tabIndex={0}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
      className={cn(
        "cursor-text rounded-md px-2 py-1 -mx-2 -my-1",
        "transition-colors duration-150",
        "hover:bg-muted/50 hover:ring-1 hover:ring-border",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30",
        isEmpty ? "text-muted-foreground italic" : "",
        className,
        displayClassName
      )}
    >
      {isEmpty ? placeholder : value}
    </DisplayTag>
  )
}
