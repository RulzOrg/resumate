"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Star, StarOff, Trash2, Copy, FileText } from "lucide-react"
import { toast } from "sonner"
import { ResumeComparisonDialog } from "./resume-comparison-dialog"
import { ResumePreviewDialog } from "./resume-preview-dialog"

interface Resume {
  id: string
  title: string
  content: string
  created_at: string
  is_primary: boolean
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
  original_title?: string
}

interface ResumeVersionManagerProps {
  userId: string
}

export function ResumeVersionManager({ userId }: ResumeVersionManagerProps) {
  const [originalResumes, setOriginalResumes] = useState<Resume[]>([])
  const [optimizedResumes, setOptimizedResumes] = useState<OptimizedResume[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResume, setSelectedResume] = useState<string>("all")
  const [previewResume, setPreviewResume] = useState<Resume | OptimizedResume | null>(null)
  const [compareResumes, setCompareResumes] = useState<{
    original: Resume | OptimizedResume | null
    optimized: Resume | OptimizedResume | null
  }>({
    original: null,
    optimized: null,
  })

  useEffect(() => {
    fetchResumes()
  }, [])

  const fetchResumes = async () => {
    try {
      const [originalRes, optimizedRes] = await Promise.all([fetch("/api/resumes"), fetch("/api/resumes/optimized")])

      if (originalRes.ok && optimizedRes.ok) {
        const originalData = await originalRes.json()
        const optimizedData = await optimizedRes.json()
        setOriginalResumes(originalData.resumes || [])
        setOptimizedResumes(optimizedData.resumes || [])
      }
    } catch (error) {
      console.error("Error fetching resumes:", error)
      toast.error("Failed to load resumes")
    } finally {
      setLoading(false)
    }
  }

  const handleSetPrimary = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}/primary`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Primary resume updated")
        fetchResumes()
      } else {
        toast.error("Failed to update primary resume")
      }
    } catch (error) {
      toast.error("Failed to update primary resume")
    }
  }

  const handleDeleteResume = async (resumeId: string, isOptimized = false) => {
    try {
      const endpoint = isOptimized ? `/api/resumes/optimized/${resumeId}` : `/api/resumes/${resumeId}`
      const response = await fetch(endpoint, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Resume deleted successfully")
        fetchResumes()
      } else {
        toast.error("Failed to delete resume")
      }
    } catch (error) {
      toast.error("Failed to delete resume")
    }
  }

  const handleDuplicateResume = async (resume: Resume | OptimizedResume) => {
    try {
      const content = "optimized_content" in resume ? resume.optimized_content : resume.content
      const title =
        "optimized_content" in resume ? `Copy of ${resume.job_title || "Optimized Resume"}` : `Copy of ${resume.title}`

      const response = await fetch("/api/resumes/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
      })

      if (response.ok) {
        toast.success("Resume duplicated successfully")
        fetchResumes()
      } else {
        toast.error("Failed to duplicate resume")
      }
    } catch (error) {
      toast.error("Failed to duplicate resume")
    }
  }

  const filteredOptimizedResumes =
    selectedResume !== "all"
      ? optimizedResumes.filter((resume) => resume.original_resume_id === selectedResume)
      : optimizedResumes

  if (loading) {
    return <div className="text-center py-8">Loading your resume versions...</div>
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Versions</TabsTrigger>
          <TabsTrigger value="original">Original Resumes</TabsTrigger>
          <TabsTrigger value="optimized">Optimized Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Original Resumes */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Original Resumes ({originalResumes.length})
              </h3>
              <div className="space-y-3">
                {originalResumes.map((resume) => (
                  <Card key={resume.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{resume.title}</CardTitle>
                        {resume.is_primary && (
                          <Badge variant="default" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground mb-3">
                        Created {new Date(resume.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setPreviewResume(resume)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetPrimary(resume.id)}
                          disabled={resume.is_primary}
                        >
                          {resume.is_primary ? <Star className="h-3 w-3 mr-1" /> : <StarOff className="h-3 w-3 mr-1" />}
                          {resume.is_primary ? "Primary" : "Set Primary"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDuplicateResume(resume)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteResume(resume.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Optimized Resumes */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5" />
                Optimized Versions ({optimizedResumes.length})
              </h3>
              <div className="space-y-3">
                {optimizedResumes.slice(0, 5).map((resume) => (
                  <Card key={resume.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{resume.job_title || "Optimized Resume"}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {resume.match_score}% Match
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground mb-3">
                        {resume.company_name && `${resume.company_name} • `}
                        {new Date(resume.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setPreviewResume(resume)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDuplicateResume(resume)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteResume(resume.id, true)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="original" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {originalResumes.map((resume) => (
              <Card key={resume.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{resume.title}</CardTitle>
                    {resume.is_primary && <Badge variant="default">Primary</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setPreviewResume(resume)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetPrimary(resume.id)}
                      disabled={resume.is_primary}
                    >
                      {resume.is_primary ? <Star className="h-4 w-4 mr-1" /> : <StarOff className="h-4 w-4 mr-1" />}
                      {resume.is_primary ? "Primary" : "Set Primary"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateResume(resume)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteResume(resume.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimized" className="space-y-4">
          <div className="mb-4">
            <Select value={selectedResume} onValueChange={setSelectedResume}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Filter by original resume" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All optimized resumes</SelectItem>
                {originalResumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOptimizedResumes.map((resume) => (
              <Card key={resume.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{resume.job_title || "Optimized Resume"}</CardTitle>
                    <Badge variant="secondary">{resume.match_score}% Match</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {resume.company_name && `${resume.company_name} • `}
                    {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setPreviewResume(resume)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateResume(resume)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteResume(resume.id, true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {previewResume && (
        <ResumePreviewDialog
          resume={previewResume}
          open={!!previewResume}
          onOpenChange={() => setPreviewResume(null)}
        />
      )}

      {/* Comparison Dialog */}
      {(compareResumes.original || compareResumes.optimized) && (
        <ResumeComparisonDialog
          originalResume={compareResumes.original}
          optimizedResume={compareResumes.optimized}
          open={!!(compareResumes.original || compareResumes.optimized)}
          onOpenChange={() => setCompareResumes({ original: null, optimized: null })}
        />
      )}
    </div>
  )
}
