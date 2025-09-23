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
import { FileText, MoreHorizontal, Download, Edit, Trash2, Star } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Resume } from "@/lib/db"

interface ResumeListProps {
  resumes: Resume[]
}

export function ResumeList({ resumes }: ResumeListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {resumes.map((resume) => (
        <Card
          key={resume.id}
          className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{resume.title}</CardTitle>
                  {resume.is_primary && (
                    <Badge variant="secondary" className="mt-1">
                      <Star className="w-3 h-3 mr-1" />
                      Primary
                    </Badge>
                  )}
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
            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1">
                Optimize
              </Button>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
