"use client"

import type React from "react"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Link, FileText } from "lucide-react"

interface AnalyzeJobDialogProps {
  children: React.ReactNode
}

export function AnalyzeJobDialog({ children }: AnalyzeJobDialogProps) {
  const [open, setOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("url")

  // URL tab state
  const [jobUrl, setJobUrl] = useState("")
  const [isFetching, setIsFetching] = useState(false)

  // Manual tab state
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")

  const router = useRouter()

  const handleFetchFromUrl = async () => {
    if (!jobUrl.trim()) return

    setIsFetching(true)
    setError("")

    try {
      const response = await fetch("/api/jobs/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setJobTitle(data.title)
        setJobDescription(data.content)
        setActiveTab("manual") // Switch to manual tab to review
      } else {
        const result = await response.json()
        setError(result.error || "Failed to fetch job posting")
      }
    } catch (err) {
      setError("Failed to fetch job posting")
    } finally {
      setIsFetching(false)
    }
  }

  const handleAnalyze = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setError("Job title and description are required")
      return
    }

    setIsAnalyzing(true)
    setError("")

    try {
      const response = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          company_name: companyName.trim() || undefined,
          job_url: activeTab === "url" ? jobUrl.trim() : undefined,
          job_description: jobDescription.trim(),
        }),
      })

      if (response.ok) {
        setOpen(false)
        resetForm()
        router.refresh()
      } else {
        const result = await response.json()
        setError(result.error || "Analysis failed")
      }
    } catch (err) {
      setError("An error occurred during analysis")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetForm = () => {
    setJobUrl("")
    setJobTitle("")
    setCompanyName("")
    setJobDescription("")
    setError("")
    setActiveTab("url")
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analyze Job Posting</DialogTitle>
          <DialogDescription>
            Analyze a job posting to extract keywords, requirements, and skills for resume optimization.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center">
              <Link className="w-4 h-4 mr-2" />
              From URL
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-url">Job Posting URL</Label>
              <div className="flex gap-2">
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://company.com/jobs/position"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={isFetching}
                />
                <Button onClick={handleFetchFromUrl} disabled={!jobUrl.trim() || isFetching} variant="outline">
                  {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the URL of a job posting to automatically extract the content.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-title">Job Title *</Label>
                <Input
                  id="job-title"
                  placeholder="e.g., Senior Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="e.g., Tech Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description *</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isAnalyzing}
                rows={12}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Include the complete job description with requirements, responsibilities, and qualifications.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleAnalyze}
            disabled={!jobTitle.trim() || !jobDescription.trim() || isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Job Posting"
            )}
          </Button>
          <Button variant="outline" onClick={resetForm} disabled={isAnalyzing}>
            Clear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
