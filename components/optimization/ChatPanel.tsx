"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Send,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ParsedResume } from "@/lib/resume-parser"
import type {
  ResumeEditOperation,
  ChatMessage,
  ChatEditResult,
  DiffEntry,
} from "@/lib/chat-edit-types"
import { toast } from "sonner"

// ─── Props ──────────────────────────────────────────────────────

interface ChatPanelProps {
  resumeData: ParsedResume
  resumeId: string
  jobTitle?: string
  companyName?: string | null
  onApplyEdits: (operations: ResumeEditOperation[]) => void
}

// ─── Helpers ────────────────────────────────────────────────────

let msgCounter = 0
function createMessage(
  role: "user" | "assistant",
  content: string,
  status: ChatMessage["status"] = "complete"
): ChatMessage {
  return {
    id: `msg-${Date.now()}-${++msgCounter}`,
    role,
    content,
    timestamp: Date.now(),
    status,
  }
}

function getCommandSuggestions(
  resumeData: ParsedResume,
  jobTitle?: string
): string[] {
  const suggestions: string[] = []

  if (!resumeData.summary) {
    suggestions.push("Write a professional summary for me")
  } else {
    suggestions.push("Make my summary more concise and impactful")
  }

  if (resumeData.workExperience.length > 0) {
    const company = resumeData.workExperience[0].company
    suggestions.push(`Improve my ${company} bullet points`)
  }

  if (jobTitle) {
    suggestions.push(`Tailor my resume for ${jobTitle}`)
  }

  suggestions.push("Add Python to my skills")

  return suggestions.slice(0, 4)
}

// ─── SSE Parser ─────────────────────────────────────────────────

interface ParsedSSEEvent {
  type: string
  data: Record<string, unknown>
}

function parseSSEBuffer(buffer: string): {
  parsed: ParsedSSEEvent[]
  remaining: string
} {
  const events: ParsedSSEEvent[] = []
  const lines = buffer.split("\n")
  let currentType = ""
  let currentData = ""
  let lastProcessedIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("event: ")) {
      currentType = line.slice(7).trim()
    } else if (line.startsWith("data: ")) {
      currentData = line.slice(6)
    } else if (line === "" && currentType && currentData) {
      try {
        events.push({ type: currentType, data: JSON.parse(currentData) })
      } catch {
        // Ignore malformed events
      }
      currentType = ""
      currentData = ""
      lastProcessedIndex = i
    }
  }

  const remaining =
    lastProcessedIndex >= 0
      ? lines.slice(lastProcessedIndex + 1).join("\n")
      : buffer

  return { parsed: events, remaining }
}

// ─── Persistence helpers ────────────────────────────────────────

async function fetchChatHistory(resumeId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/resumes/optimized/${resumeId}/chat`)
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data.messages)) return []

  return data.messages.map((m: Record<string, unknown>) => ({
    id: m.id as string,
    role: m.role as "user" | "assistant",
    content: (m.content as string) || "",
    timestamp: new Date(m.created_at as string).getTime(),
    status: (m.status as ChatMessage["status"]) || "complete",
    editResult: m.edit_result as ChatEditResult | undefined,
    editStatus: m.edit_status as ChatMessage["editStatus"],
  }))
}

async function persistMessages(
  resumeId: string,
  userMsg: ChatMessage,
  assistantMsg: ChatMessage
): Promise<{ userDbId?: string; assistantDbId?: string }> {
  try {
    const res = await fetch(`/api/resumes/optimized/${resumeId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: userMsg.role, content: userMsg.content, status: userMsg.status },
          {
            role: assistantMsg.role,
            content: assistantMsg.content,
            status: assistantMsg.status,
            editResult: assistantMsg.editResult || null,
            editStatus: assistantMsg.editResult ? "pending" : null,
          },
        ],
      }),
    })
    if (!res.ok) return {}
    const data = await res.json()
    const saved = data.messages as { id: string }[]
    return {
      userDbId: saved[0]?.id,
      assistantDbId: saved[1]?.id,
    }
  } catch {
    return {}
  }
}

async function patchEditStatus(
  resumeId: string,
  messageId: string,
  editStatus: "applied" | "dismissed",
  content?: string
) {
  try {
    await fetch(`/api/resumes/optimized/${resumeId}/chat/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editStatus, content }),
    })
  } catch {
    // Non-blocking
  }
}

// ─── Sub-components ─────────────────────────────────────────────

function DiffPreview({ diffs }: { diffs: DiffEntry[] }) {
  return (
    <div className="mt-2 space-y-2">
      {diffs.map((diff, i) => (
        <div
          key={i}
          className="rounded-md border border-border bg-muted/30 p-2 text-xs"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1 py-0 h-4",
                diff.type === "added" && "border-green-500/50 text-green-600 dark:text-green-400",
                diff.type === "modified" && "border-amber-500/50 text-amber-600 dark:text-amber-400",
                diff.type === "removed" && "border-red-500/50 text-red-600 dark:text-red-400"
              )}
            >
              {diff.type}
            </Badge>
            <span className="text-muted-foreground truncate">
              {diff.section}
            </span>
          </div>

          {diff.before && (
            <p className="text-red-600 dark:text-red-400 line-through opacity-70 break-words">
              {diff.before}
            </p>
          )}
          {diff.after && (
            <p className="text-green-600 dark:text-green-400 break-words">
              {diff.after}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function EditActions({
  onApply,
  onDismiss,
}: {
  onApply: () => void
  onDismiss: () => void
}) {
  return (
    <div className="flex gap-2 mt-2">
      <Button size="sm" className="h-7 text-xs gap-1" onClick={onApply}>
        <Check className="h-3 w-3" />
        Apply Changes
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={onDismiss}
      >
        <X className="h-3 w-3" />
        Dismiss
      </Button>
    </div>
  )
}

function EditStatusBadge({ status }: { status: "applied" | "dismissed" | "expired" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 h-4 mt-2",
        status === "applied" && "border-green-500/50 text-green-600 dark:text-green-400",
        status === "dismissed" && "border-muted-foreground/50 text-muted-foreground",
        status === "expired" && "border-amber-500/50 text-amber-600 dark:text-amber-400"
      )}
    >
      {status === "applied" ? "Applied" : status === "dismissed" ? "Dismissed" : "Expired"}
    </Badge>
  )
}

function StreamingCursor() {
  return (
    <span className="inline-block w-1.5 h-3.5 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
  )
}

// ─── Main Component ─────────────────────────────────────────────

export function ChatPanel({
  resumeData,
  resumeId,
  jobTitle,
  companyName,
  onApplyEdits,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Maps client-generated message IDs to DB UUIDs for PATCH calls
  const dbIdMapRef = useRef<Map<string, string>>(new Map())

  const suggestions = getCommandSuggestions(resumeData, jobTitle)
  const hasContent =
    resumeData.workExperience.length > 0 ||
    resumeData.skills.length > 0 ||
    !!resumeData.summary

  // Load chat history on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      const history = await fetchChatHistory(resumeId)
      if (cancelled) return

      // For loaded messages, DB id IS the message id — store in map
      for (const msg of history) {
        dbIdMapRef.current.set(msg.id, msg.id)
      }

      // Mark stale pending edits as expired
      const processed = history.map((msg) => {
        if (msg.editResult && msg.editStatus === "pending") {
          return { ...msg, editStatus: "dismissed" as const, editResult: undefined }
        }
        return msg
      })

      setMessages(processed)
      setIsLoadingHistory(false)
    }
    load()
    return () => { cancelled = true }
  }, [resumeId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const updateAssistantMessage = useCallback(
    (updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last || last.role !== "assistant") return prev
        return [...prev.slice(0, -1), updater(last)]
      })
    },
    []
  )

  const handleSend = useCallback(
    async (command: string) => {
      const trimmed = command.trim()
      if (!trimmed || isStreaming) return

      setInputValue("")
      setIsStreaming(true)

      const userMsg = createMessage("user", trimmed)
      const assistantMsg = createMessage("assistant", "", "streaming")
      setMessages((prev) => [...prev, userMsg, assistantMsg])

      abortRef.current = new AbortController()

      let finalAssistantMsg: ChatMessage | null = null

      try {
        const response = await fetch("/api/resumes/chat-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            resumeId,
            command: trimmed,
            context: {
              resumeData,
              jobTitle,
              companyName: companyName ?? undefined,
            },
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Request failed" }))
          if (response.status === 429) {
            toast.error(`Rate limit reached. Try again in ${error.retryAfter || 60}s.`)
          }
          updateAssistantMessage((msg) => {
            const updated = {
              ...msg,
              content: error.error || "Something went wrong.",
              status: "error" as const,
              error: error.error,
            }
            finalAssistantMsg = updated
            return updated
          })
          return
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const { parsed, remaining } = parseSSEBuffer(buffer)
          buffer = remaining

          for (const event of parsed) {
            switch (event.type) {
              case "text":
                updateAssistantMessage((msg) => ({
                  ...msg,
                  content: msg.content + (event.data as { text: string }).text,
                }))
                break

              case "edit_result":
                updateAssistantMessage((msg) => ({
                  ...msg,
                  editResult: event.data as unknown as ChatEditResult,
                }))
                break

              case "error":
                updateAssistantMessage((msg) => ({
                  ...msg,
                  status: "error",
                  error: (event.data as { message: string }).message,
                }))
                break
            }
          }
        }

        updateAssistantMessage((msg) => {
          const updated = {
            ...msg,
            status: (msg.status === "error" ? "error" : "complete") as ChatMessage["status"],
          }
          finalAssistantMsg = updated
          return updated
        })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        updateAssistantMessage((msg) => {
          const updated = {
            ...msg,
            content: msg.content || "Connection failed. Please try again.",
            status: "error" as const,
            error: "Connection failed",
          }
          finalAssistantMsg = updated
          return updated
        })
      } finally {
        setIsStreaming(false)
        abortRef.current = null

        // Persist both messages to DB (fire-and-forget)
        if (finalAssistantMsg) {
          persistMessages(resumeId, userMsg, finalAssistantMsg).then((ids) => {
            if (ids.userDbId) dbIdMapRef.current.set(userMsg.id, ids.userDbId)
            if (ids.assistantDbId) dbIdMapRef.current.set(assistantMsg.id, ids.assistantDbId)
          })
        }
      }
    },
    [
      isStreaming,
      resumeId,
      resumeData,
      jobTitle,
      companyName,
      updateAssistantMessage,
    ]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(inputValue)
    }
  }

  const handleApply = useCallback(
    (msg: ChatMessage) => {
      if (!msg.editResult) return
      onApplyEdits(msg.editResult.operations)
      const newContent = msg.content + "\n\nChanges applied."
      updateAssistantMessage((m) => ({
        ...m,
        content: newContent,
        editResult: undefined,
        editStatus: "applied",
      }))
      toast.success("Edits applied to your resume")

      // Persist edit status
      const dbId = dbIdMapRef.current.get(msg.id)
      if (dbId) patchEditStatus(resumeId, dbId, "applied", newContent)
    },
    [onApplyEdits, updateAssistantMessage, resumeId]
  )

  const handleDismiss = useCallback(
    (msg: ChatMessage) => {
      const newContent = msg.content + "\n\nChanges dismissed."
      updateAssistantMessage((m) => ({
        ...m,
        content: newContent,
        editResult: undefined,
        editStatus: "dismissed",
      }))

      // Persist edit status
      const dbId = dbIdMapRef.current.get(msg.id)
      if (dbId) patchEditStatus(resumeId, dbId, "dismissed", newContent)
    },
    [updateAssistantMessage, resumeId]
  )

  const handleRetry = useCallback(
    (originalCommand: string) => {
      // Remove the last assistant message and re-send
      setMessages((prev) => prev.slice(0, -1))
      handleSend(originalCommand)
    },
    [handleSend]
  )

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-3 space-y-3">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : isEmpty ? (
            <EmptyState
              suggestions={suggestions}
              onSuggestionClick={(s) => handleSend(s)}
              hasContent={hasContent}
            />
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[95%] space-y-1">
                      {/* Explanation text */}
                      {(msg.content || msg.status === "streaming") && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                          {msg.content}
                          {msg.status === "streaming" &&
                            !msg.editResult && <StreamingCursor />}
                        </p>
                      )}

                      {/* Low confidence warning */}
                      {msg.editResult?.confidence === "low" && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>
                            I made some assumptions. Please review carefully.
                          </span>
                        </div>
                      )}

                      {/* Active diff preview with actions */}
                      {msg.editResult && !msg.editStatus && (
                        <>
                          <DiffPreview diffs={msg.editResult.diffs} />
                          <EditActions
                            onApply={() => handleApply(msg)}
                            onDismiss={() => handleDismiss(msg)}
                          />
                        </>
                      )}

                      {/* Historical edit status badge */}
                      {msg.editStatus === "applied" && (
                        <EditStatusBadge status="applied" />
                      )}
                      {msg.editStatus === "dismissed" && (
                        <EditStatusBadge status="dismissed" />
                      )}

                      {/* Error state */}
                      {msg.status === "error" && msg.error && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-destructive">
                            {msg.error}
                          </p>
                          {messages.length >= 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs gap-1 px-2"
                              onClick={() => {
                                const userMsg = messages[messages.length - 2]
                                if (userMsg?.role === "user") {
                                  handleRetry(userMsg.content)
                                }
                              }}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border p-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder='Try "Improve my summary" or "Add Python to my skills"'
            className="min-h-[60px] max-h-[120px] pr-10 resize-none text-sm"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1.5 bottom-1.5 h-7 w-7"
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {inputValue.length > 400 && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {inputValue.length}/500
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────

function EmptyState({
  suggestions,
  onSuggestionClick,
  hasContent,
}: {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
  hasContent: boolean
}) {
  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-2 text-center space-y-3">
        <div className="rounded-full bg-muted p-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No resume content yet</p>
          <p className="text-xs text-muted-foreground">
            Upload or paste your resume first, then I can help you edit it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 px-2 text-center space-y-4">
      <div className="rounded-full bg-primary/10 p-3">
        <MessageSquare className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Edit with AI</p>
        <p className="text-xs text-muted-foreground">
          Type a command to edit your resume using natural language.
        </p>
      </div>
      <div className="w-full space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Try asking
        </p>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full text-left text-xs px-3 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors text-foreground/80 hover:text-foreground"
          >
            <Sparkles className="h-3 w-3 inline-block mr-1.5 text-primary" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
