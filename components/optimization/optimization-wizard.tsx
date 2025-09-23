"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { FileText, Target, Zap, Loader2, CheckCircle, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Resume, JobAnalysis } from "@/lib/db"

interface OptimizationWizardProps {
  resumes: Resume[]
  jobAnalyses: JobAnalysis[]
}

export function OptimizationWizard({ resumes, jobAnalyses }: OptimizationWizardProps) {
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [selectedJobAnalysis, setSelectedJobAnalysis] = useState<JobAnalysis | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationProgress, setOptimizationProgress] = useState(0)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleOptimize = async () => {
    if (!selectedResume || !selectedJobAnalysis) return

    setIsOptimizing(true)
    setOptimizationProgress(0)
    setError("")

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setOptimizationProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch("/api/resumes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: selectedResume.id,
          job_analysis_id: selectedJobAnalysis.id,
        }),
      })

      clearInterval(progressInterval)
      setOptimizationProgress(100)

      if (response.ok) {
        const result = await response.json()
        setTimeout(() => {
          router.push(`/dashboard/optimized/${result.optimized_resume.id}`)
        }, 1000)
      } else {
        const result = await response.json()
        setError(result.error || "Optimization failed")
      }
    } catch (err) {
      setError("An error occurred during optimization")
    } finally {
      setIsOptimizing(false)
    }
  }

  const canOptimize = selectedResume && selectedJobAnalysis && !isOptimizing

  return (
    <div className="space-y-8">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-primary" />
            Resume Optimization Wizard
          </CardTitle>
          <CardDescription>
            Select a resume and job analysis to create an optimized version tailored for that specific position.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Select Resume */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <h3 className="text-lg font-semibold">Select Resume</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {resumes.map((resume) => (
                <Card
                  key={resume.id}
                  className={`cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedResume?.id === resume.id ? "ring-2 ring-primary bg-accent/30" : "border-border/50"
                  }`}
                  onClick={() => setSelectedResume(resume)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{resume.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(resume.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {resume.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Step 2: Select Job Analysis */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h3 className="text-lg font-semibold">Select Job Analysis</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {jobAnalyses.map((analysis) => (
                <Card
                  key={analysis.id}
                  className={`cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedJobAnalysis?.id === analysis.id ? "ring-2 ring-primary bg-accent/30" : "border-border/50"
                  }`}
                  onClick={() => setSelectedJobAnalysis(analysis)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-accent" />
                        <p className="font-medium truncate">{analysis.job_title}</p>
                      </div>
                      {analysis.company_name && (
                        <p className="text-sm text-muted-foreground">{analysis.company_name}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {analysis.required_skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {analysis.required_skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{analysis.required_skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Step 3: Optimize */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <h3 className="text-lg font-semibold">Generate Optimization</h3>
            </div>

            {selectedResume && selectedJobAnalysis && (
              <Card className="border-border/50 bg-muted/20">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Selected Resume:</span>
                      <span className="text-sm text-muted-foreground">{selectedResume.title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Target Job:</span>
                      <span className="text-sm text-muted-foreground">{selectedJobAnalysis.job_title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Keywords to Target:</span>
                      <span className="text-sm text-muted-foreground">
                        {selectedJobAnalysis.keywords.length} keywords
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isOptimizing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Optimizing resume...</span>
                  <span>{optimizationProgress}%</span>
                </div>
                <Progress value={optimizationProgress} />
                <p className="text-sm text-muted-foreground">
                  AI is analyzing your resume and tailoring it for the selected job posting.
                </p>
              </div>
            )}

            <Button onClick={handleOptimize} disabled={!canOptimize} size="lg" className="w-full">
              {isOptimizing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Optimizing Resume...
                </>
              ) : optimizationProgress === 100 ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Optimization Complete
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Optimize Resume
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
