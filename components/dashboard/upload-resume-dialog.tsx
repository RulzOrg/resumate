"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, X, Loader2, CheckCircle } from "lucide-react"

interface UploadResumeDialogProps {
  children: React.ReactNode
}

interface ResumeAnalysis {
  personal_info: {
    name?: string
    email?: string
    phone?: string
    location?: string
    linkedin?: string
    portfolio?: string
  }
  experience_level: "entry" | "mid" | "senior" | "executive"
  skills: {
    technical: string[]
    soft: string[]
    languages: string[]
    certifications: string[]
  }
  work_experience: Array<{
    title: string
    company: string
    duration: string
    description: string
    achievements: string[]
  }>
  education: Array<{
    degree: string
    institution: string
    year?: string
    gpa?: string
  }>
  strengths: string[]
  improvement_areas: string[]
  keywords: string[]
  overall_score: number
  recommendations: string[]
}

export function UploadResumeDialog({ children }: UploadResumeDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null)
  const [jobUrl, setJobUrl] = useState("")
  const [step, setStep] = useState<"upload" | "analysis" | "job-url">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError("File size must be less than 10MB")
      return
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF or Word document")
      return
    }

    setFile(selectedFile)
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")) // Remove file extension
    setError("")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) return

    setIsUploading(true)
    setUploadProgress(0)
    setError("")

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title.trim())

      const response = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const result = await response.json()
        setUploadedResumeId(result.resume.id)
        setStep("analysis")
        setIsAnalyzing(true)

        try {
          const analysisResponse = await fetch("/api/resumes/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ resumeId: result.resume.id }),
          })

          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json()
            setAnalysis(analysisResult.analysis)
            setIsAnalyzing(false)
            setTimeout(() => {
              setStep("job-url")
            }, 1000)
          } else {
            const analysisResult = await analysisResponse.json()
            setError(analysisResult.error || "Analysis failed")
            setIsAnalyzing(false)
          }
        } catch (analysisErr) {
          setError("An error occurred during analysis")
          setIsAnalyzing(false)
        }
      } else {
        const result = await response.json()
        setError(result.error || "Upload failed")
      }
    } catch (err) {
      setError("An error occurred during upload")
    } finally {
      setIsUploading(false)
    }
  }

  const handleProceedToOptimization = () => {
    if (jobUrl.trim()) {
      // Navigate to optimization page with job URL
      router.push(`/dashboard/optimize?resumeId=${uploadedResumeId}&jobUrl=${encodeURIComponent(jobUrl.trim())}`)
    } else {
      // Navigate to optimization page without job URL
      router.push(`/dashboard/optimize?resumeId=${uploadedResumeId}`)
    }
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFile(null)
    setTitle("")
    setError("")
    setUploadProgress(0)
    setAnalysis(null)
    setUploadedResumeId(null)
    setJobUrl("")
    setStep("upload")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Upload Resume"}
            {step === "analysis" && "Analyzing Resume"}
            {step === "job-url" && "Ready to Optimize"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload your resume in PDF or Word format to start optimizing it for job applications."}
            {step === "analysis" &&
              "We're analyzing your resume to understand your skills, experience, and areas for improvement."}
            {step === "job-url" &&
              "Your resume has been analyzed! Provide a job URL to optimize your resume for a specific position."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Upload Step */}
          {step === "upload" && (
            <>
              {!file ? (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop your resume here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">Supports PDF and Word documents (max 10MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetForm} disabled={isUploading}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Resume Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for your resume"
                      disabled={isUploading}
                    />
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleUpload} disabled={!title.trim() || isUploading} className="flex-1">
                      {isUploading ? "Uploading..." : "Upload & Analyze Resume"}
                    </Button>
                    <Button variant="outline" onClick={resetForm} disabled={isUploading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Analysis Step */}
          {step === "analysis" && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div>
                      <p className="font-medium">Analyzing your resume...</p>
                      <p className="text-sm text-muted-foreground">This may take a few moments</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <div>
                      <p className="font-medium">Analysis Complete!</p>
                      <p className="text-sm text-muted-foreground">Your resume has been successfully analyzed</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Job URL Step */}
          {step === "job-url" && analysis && (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Resume Analysis Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Experience Level</p>
                    <p className="font-medium capitalize">{analysis.experience_level}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Overall Score</p>
                    <p className="font-medium">{analysis.overall_score}/100</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Technical Skills</p>
                    <p className="font-medium">{analysis.skills.technical.length} identified</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Work Experience</p>
                    <p className="font-medium">{analysis.work_experience.length} positions</p>
                  </div>
                </div>
              </div>

              {/* Job URL Input */}
              <div className="space-y-2">
                <Label htmlFor="jobUrl">Job URL (Optional)</Label>
                <Input
                  id="jobUrl"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="Paste the job posting URL to optimize your resume for this specific role"
                />
                <p className="text-xs text-muted-foreground">
                  Providing a job URL will help us tailor your resume specifically for that position
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleProceedToOptimization} className="flex-1">
                  {jobUrl.trim() ? "Optimize for This Job" : "Continue to Optimization"}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Upload Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
