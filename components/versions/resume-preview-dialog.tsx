"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Copy } from "lucide-react"
import { toast } from "sonner"

interface Resume {
  id: string
  title: string
  content: string
  created_at: string
  is_primary?: boolean
}

interface OptimizedResume {
  id: string
  original_resume_id: string
  job_analysis_id: string
  optimized_content: string
  optimization_summary: string
  match_score: number
  created_at: string
  job_title?: string
  company_name?: string
}

interface ResumePreviewDialogProps {
  resume: Resume | OptimizedResume
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResumePreviewDialog({ resume, open, onOpenChange }: ResumePreviewDialogProps) {
  const isOptimized = "optimized_content" in resume
  const content = isOptimized ? resume.optimized_content : resume.content
  const title = isOptimized ? resume.job_title || "Optimized Resume" : resume.title

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content)
    toast.success("Resume content copied to clipboard")
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Resume downloaded successfully")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              {isOptimized && <Badge variant="secondary">{resume.match_score}% Match</Badge>}
              {!isOptimized && resume.is_primary && <Badge variant="default">Primary</Badge>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {isOptimized && resume.company_name && `${resume.company_name} • `}
            Created {new Date(resume.created_at).toLocaleDateString()}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex gap-2 mb-4 flex-shrink-0">
            <Button onClick={handleCopyContent} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy Content
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="bg-muted/50 p-6 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{content}</pre>
            </div>
          </div>

          {isOptimized && resume.optimization_summary && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg flex-shrink-0">
              <h4 className="font-semibold mb-2">Optimization Summary</h4>
              <p className="text-sm text-muted-foreground">{resume.optimization_summary}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
