"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Eye } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface LivePreviewPanelProps {
  text: string
  diffHints: string[]
  fileName?: string
}

export function LivePreviewPanel({ text, diffHints, fileName }: LivePreviewPanelProps) {
  // Parse diff hints to determine which lines are new or edited
  const diffMap = useMemo(() => {
    const map: Record<number, "new" | "edited"> = {}
    
    diffHints.forEach((hint) => {
      const lineMatch = hint.match(/[Ll]ine\s+(\d+)/)
      const isNew = hint.includes("*new*")
      const isEdited = hint.includes("*edited*")
      
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1], 10) - 1 // Convert 1-based to 0-based
        if (!isNaN(lineNum) && lineNum >= 0) {
          if (isNew) map[lineNum] = "new"
          else if (isEdited) map[lineNum] = "edited"
        }
      }
    })
    
    return map
  }, [diffHints])

  // Split text into lines and add highlighting
  const highlightedLines = useMemo(() => {
    return text.split("\n").map((line, idx) => {
      const diffType = diffMap[idx]
      
      return (
        <div
          key={idx}
          className={cn(
            "whitespace-pre-wrap leading-relaxed",
            diffType === "new" && "bg-emerald-500/10 border-l-2 border-emerald-500 pl-3 -ml-3",
            diffType === "edited" && "bg-amber-500/10 border-l-2 border-amber-500 pl-3 -ml-3"
          )}
        >
          {line}
          {diffType && (
            <Badge
              variant="outline"
              className={cn(
                "ml-2 text-xs",
                diffType === "new" && "bg-emerald-500/20 text-emerald-500 border-emerald-500/40",
                diffType === "edited" && "bg-amber-500/20 text-amber-500 border-amber-500/40"
              )}
            >
              {diffType}
            </Badge>
          )}
        </div>
      )
    })
  }, [text, diffMap])

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/\//g, "&#x2F;")
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Resume copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handlePreview = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for this site to preview.")
      return
    }

    const escapedFileName = escapeHtml(fileName || "Resume Preview")
    const escapedText = escapeHtml(text)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapedFileName}</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            max-width: 8.5in;
            margin: 0.5in auto;
            color: #000;
            background: #fff;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <pre>${escapedText}</pre>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          ATS-friendly plain text format
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="font-mono text-sm leading-relaxed space-y-1">
            {highlightedLines}
          </div>
        </div>
        
        {diffHints.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Changes from original:</p>
            <div className="space-y-1">
              {diffHints.slice(0, 5).map((hint, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  • {hint}
                </p>
              ))}
              {diffHints.length > 5 && (
                <p className="text-xs text-muted-foreground italic">
                  + {diffHints.length - 5} more changes
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
