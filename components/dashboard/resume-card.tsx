"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FileText, MoreHorizontal, Download, Edit, Trash2, Star, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useResumeStatus } from "@/hooks/use-resume-status"
import { ResumeStatusBadge } from "./resume-status-badge"
import type { Resume } from "@/lib/db"

interface ResumeCardProps {
  resume: Resume
}

export function ResumeCard({ resume }: ResumeCardProps) {
  const { status, isProcessing, isCompleted, isFailed } = useResumeStatus({
    resumeId: resume.id,
    initialStatus: resume.processing_status,
    enabled: resume.processing_status !== "completed" && resume.processing_status !== "failed",
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const currentStatus = status?.status || resume.processing_status

  return (
    <Card
      className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{resume.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {resume.is_primary && (
                  <Badge variant="secondary">
                    <Star className="w-3 h-3 mr-1" />
                    Primary
                  </Badge>
                )}
                <ResumeStatusBadge
                  status={currentStatus}
                  message={status?.message}
                />
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              {!resume.is_primary && (
                <DropdownMenuItem>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Primary
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>File:</span>
            <span className="truncate ml-2">{resume.file_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Size:</span>
            <span>{formatFileSize(resume.file_size)}</span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="uppercase">{resume.file_type}</span>
          </div>
          <div className="flex justify-between">
            <span>Uploaded:</span>
            <span>{formatDistanceToNow(new Date(resume.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Show error message if failed */}
        {isFailed && status?.error && (
          <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{status.error}</span>
            </div>
          </div>
        )}

        {/* Show warnings if any */}
        {status?.warnings && status.warnings.length > 0 && (
          <div className="mt-3 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{status.warnings.join(", ")}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!isCompleted}
                  >
                    Optimize
                  </Button>
                </div>
              </TooltipTrigger>
              {!isCompleted && (
                <TooltipContent>
                  <p>
                    {isProcessing
                      ? "Wait for processing to complete"
                      : isFailed
                      ? "Processing failed - cannot optimize"
                      : "Resume not ready"}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" variant="outline" disabled={!isCompleted}>
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
