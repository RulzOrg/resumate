"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Loader2, Eraser, FileText, AlertCircle, AlertTriangle, ListChecks, Lightbulb, ShieldCheck, TrendingUp, Bookmark, BookmarkCheck, Wand2, Upload, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { KeywordChip } from "./keyword-chip"
import { BusyIndicator } from "./busy-indicator"
import { ATSCheckItem } from "./ats-check-item"
import { ResumePickerDialog } from "./resume-picker-dialog"
import { AnalysisSkeleton } from "./analysis-skeleton"
import {
  buildATSChecks,
  calculateQuickMetrics,
  type ATSCheck,
  type QuickMetrics
} from "@/lib/client-analysis"
import { toast } from "sonner"

const MIN_LENGTH = 100
const RECOMMENDED_MIN_LENGTH = 300
const IDEAL_MIN_LENGTH = 500
const MAX_LENGTH = 10000

interface ContentValidation {
  isValid: boolean
  charCount: number
  message?: string
  level: 'info' | 'warning' | 'error'
}

export function AddJobPageClient() {
  const router = useRouter()
  
  // Form state
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  
  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [contentValidation, setContentValidation] = useState<ContentValidation>({
    isValid: true,
    charCount: 0,
    level: 'info'
  })
  const [showResumePicker, setShowResumePicker] = useState(false)
  const [savedJobId, setSavedJobId] = useState<string | null>(null)
  const [optimizationProgress, setOptimizationProgress] = useState(0)
  
  // Analysis state
  const [matchScore, setMatchScore] = useState<{ pct: number | null; color: string; hint: string; needsProfile?: boolean } | null>(null)
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [preferredSkills, setPreferredSkills] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [atsChecks, setATSChecks] = useState<ATSCheck[]>([])
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [semanticDetails, setSemanticDetails] = useState<any>(null)
  
  // Loading states for each section
  const [loadingStates, setLoadingStates] = useState({
    match: false,
    metrics: false,
    keywords: false,
    suggestions: false,
    ats: false
  })
  
  // Debounce utility
  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), delay)
    }
  }
  
  // Content validation
  const validateJobContent = (content: string): ContentValidation => {
    const trimmed = content.trim()
    const charCount = trimmed.length
    
    if (charCount === 0) {
      return {
        isValid: false,
        charCount,
        message: "Job description is required for analysis",
        level: 'error'
      }
    }
    
    if (charCount < MIN_LENGTH) {
      return {
        isValid: false,
        charCount,
        message: `Job description is too short. Add ${MIN_LENGTH - charCount} more characters for better analysis.`,
        level: 'error'
      }
    }
    
    if (charCount < RECOMMENDED_MIN_LENGTH) {
      return {
        isValid: true,
        charCount,
        message: `Consider adding more details (${RECOMMENDED_MIN_LENGTH - charCount} more characters) for optimal analysis.`,
        level: 'warning'
      }
    }
    
    if (charCount < IDEAL_MIN_LENGTH) {
      return {
        isValid: true,
        charCount,
        message: "Good length! More details will improve analysis accuracy.",
        level: 'info'
      }
    }
    
    if (charCount > MAX_LENGTH) {
      return {
        isValid: false,
        charCount,
        message: `Job description is too long. Please reduce by ${charCount - MAX_LENGTH} characters.`,
        level: 'error'
      }
    }
    
    return {
      isValid: true,
      charCount,
      message: "Excellent! This length provides comprehensive analysis.",
      level: 'info'
    }
  }
  
  // Perform AI analysis with profile-based semantic matching
  const performAnalysis = useCallback(async () => {
    const text = jobDescription.trim()
    if (!text || text.length < MIN_LENGTH) {
      setShowAnalysis(false)
      return
    }
    
    // Show analysis container and reset states
    setShowAnalysis(true)
    setLoadingStates({
      match: true,
      metrics: true,
      keywords: true,
      suggestions: true,
      ats: true
    })
    
    // Step 1: Quick Metrics (immediate - client-side)
    const metricsResult = calculateQuickMetrics(text)
    setMetrics(metricsResult)
    setLoadingStates(prev => ({ ...prev, metrics: false }))
    
    // Step 2: ATS Checks (immediate - client-side)
    const checks = buildATSChecks(text)
    setATSChecks(checks)
    setLoadingStates(prev => ({ ...prev, ats: false }))
    
    // Step 3: Call AI API for real analysis
    try {
      const response = await fetch("/api/jobs/preview-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: text,
          job_title: jobTitle.trim() || undefined,
          company_name: company.trim() || undefined
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const analysis = data.analysis
        
        // Set AI-extracted keywords
        setKeywords(analysis.keywords || [])
        setRequiredSkills(analysis.required_skills || [])
        setPreferredSkills(analysis.preferred_skills || [])
        setAiConfidence(analysis.analysis_confidence || null)
        setLoadingStates(prev => ({ ...prev, keywords: false }))
        
        // Generate suggestions from preferred skills
        const suggestions = (analysis.preferred_skills || []).slice(0, 6)
        setSuggestions(suggestions)
        setLoadingStates(prev => ({ ...prev, suggestions: false }))
        
        // Auto-save job after successful analysis
        const jobId = await autoSaveJob()
        if (jobId) {
          // Job saved successfully, savedJobId state will update
        }
        
        // Step 4: Fetch user skills
        const userSkillsRes = await fetch("/api/user/skills")
        const userSkillsData = await userSkillsRes.json()
        
        if (userSkillsData.needsProfile) {
          // Show "Upload resume" state
          setMatchScore({
            pct: null,
            color: 'bg-gray-400',
            hint: 'Upload your master resume to see personalized match scores',
            needsProfile: true
          })
          setSemanticDetails(null)
          setLoadingStates(prev => ({ ...prev, match: false }))
          return
        }
        
        // Step 5: Calculate semantic match
        const semanticRes = await fetch("/api/jobs/semantic-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_skills: userSkillsData.skills,
            job_skills: analysis.keywords,
            required_skills: analysis.required_skills,
            preferred_skills: analysis.preferred_skills
          })
        })
        
        const semanticData = await semanticRes.json()
        setSemanticDetails(semanticData)
        
        // Set match score with breakdown
        const finalScore = semanticData.final_score
        let color = 'bg-emerald-400'
        let hint = 'Strong match! Your skills align well with this role.'
        
        if (finalScore < 40) {
          color = 'bg-rose-400'
          hint = `Lower match (${semanticData.required_overlap}/${semanticData.required_total} required skills). Consider upskilling or targeting better-fit roles.`
        } else if (finalScore < 70) {
          color = 'bg-amber-400'
          hint = `Moderate match (${semanticData.required_overlap}/${semanticData.required_total} required skills). Add missing skills to your resume.`
        } else {
          hint = `Excellent match! You have ${semanticData.required_overlap}/${semanticData.required_total} required skills.`
        }
        
        setMatchScore({ pct: finalScore, color, hint, needsProfile: false })
        setLoadingStates(prev => ({ ...prev, match: false }))
      } else {
        // Fallback: show error state
        setLoadingStates({
          match: false,
          metrics: false,
          keywords: false,
          suggestions: false,
          ats: false
        })
        toast.error("Failed to analyze job description. Please try again.")
      }
    } catch (error) {
      console.error("Analysis error:", error)
      setLoadingStates({
        match: false,
        metrics: false,
        keywords: false,
        suggestions: false,
        ats: false
      })
      toast.error("An error occurred during analysis")
    }
  }, [jobDescription, jobTitle, company])
  

  
  // Debounced analysis
  const debouncedAnalyze = useCallback(
    debounce(() => {
      performAnalysis()
    }, 600),
    [performAnalysis]
  )
  
  // Handle description change
  const handleDescriptionChange = (content: string) => {
    setJobDescription(content)
    
    const validation = validateJobContent(content)
    setContentValidation(validation)
    
    if (content.trim().length >= 40) {
      debouncedAnalyze()
    } else {
      setShowAnalysis(false)
    }
  }
  
  // Clear form
  const handleClear = () => {
    setJobTitle("")
    setCompany("")
    setJobDescription("")
    setContentValidation({ isValid: true, charCount: 0, level: 'info' })
    setShowAnalysis(false)
    setMatchScore(null)
    setMetrics(null)
    setKeywords([])
    setSuggestions([])
    setATSChecks([])
  }
  
  // Auto-save job after analysis (background save)
  // Returns the job ID if successful, null otherwise
  const autoSaveJob = useCallback(async (showToast: boolean = true) => {
    // Only auto-save if we have all required fields and haven't saved yet
    if (savedJobId) {
      return savedJobId // Return existing ID if already saved
    }
    
    if (!jobTitle.trim() || !company.trim() || !jobDescription.trim()) {
      return null
    }
    
    try {
      const response = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          company_name: company.trim(),
          job_description: jobDescription.trim()
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        const jobId = result.analysis?.id  // Fixed: was job_analysis, should be analysis
        setSavedJobId(jobId)
        
        // Subtle success notification
        if (showToast) {
          toast.success("Job saved automatically", { 
            duration: 3000,
            position: 'bottom-right',
            className: 'font-geist'
          })
        }
        
        return jobId // Return the new job ID
      }
    } catch (error) {
      // Fail silently - user can still manually save
      console.error("Auto-save failed:", error)
    }
    
    return null // Return null if save failed
  }, [savedJobId, jobTitle, company, jobDescription])
  
  // Handle save job (manual save, stays on page)
  const handleSaveJob = async () => {
    if (!contentValidation.isValid || !jobTitle.trim() || !company.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    
    // If already saved, just show confirmation
    if (savedJobId) {
      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-medium">Job already saved!</p>
          <Link 
            href="/dashboard/jobs"
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            View in Jobs Dashboard →
          </Link>
        </div>,
        { duration: 4000 }
      )
      return
    }
    
    setIsAnalyzing(true)
    
    try {
      const response = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          company_name: company.trim(),
          job_description: jobDescription.trim()
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSavedJobId(result.analysis?.id)  // Fixed: was job_analysis, should be analysis
        
        // Show success with link to jobs page (stays on current page)
        toast.success(
          <div className="flex flex-col gap-1">
            <p className="font-medium">Job saved successfully!</p>
            <Link 
              href="/dashboard/jobs"
              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              View in Jobs Dashboard →
            </Link>
          </div>,
          { duration: 5000 }
        )
        // Stay on page (no redirect!)
      } else {
        const result = await response.json()
        toast.error(result.error || "Failed to save job")
      }
    } catch (error) {
      toast.error("An error occurred while saving the job")
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  // Handle unsave job (remove from saved jobs)
  const handleUnsaveJob = async () => {
    if (!savedJobId) return
    
    try {
      const response = await fetch(`/api/jobs/${savedJobId}`, {
        method: "DELETE"
      })
      
      if (response.ok) {
        setSavedJobId(null)
        toast.success("Job removed from saved jobs", {
        className: 'font-geist'
      })
      } else {
        toast.error("Failed to remove job")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }
  
  // Handle generate resume (saves if needed, then opens picker immediately)
  const handleGenerateResume = async () => {
    if (!showAnalysis) {
      toast.error("Please analyze the job description first")
      return
    }
    
    // Save the job if not already saved (auto-save might have failed or not completed)
    let jobIdToUse = savedJobId
    
    if (!jobIdToUse) {
      // Save now before opening picker (don't show toast since we're in the flow)
      jobIdToUse = await autoSaveJob(false)
      
      // If save failed, show error
      if (!jobIdToUse) {
        toast.error("Failed to save job. Please try the Save Job button.")
        return
      }
    }
    
    // Open resume picker (we have a valid job ID now)
    setShowResumePicker(true)
  }
  
  // Handle optimization
  const handleOptimize = async (resumeId: string) => {
    if (!savedJobId) {
      toast.error("Job must be saved first")
      return
    }
    
    setIsAnalyzing(true)
    setOptimizationProgress(0)
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => Math.min(prev + 10, 90))
      }, 1000)
      
      const response = await fetch("/api/resumes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: resumeId,
          job_analysis_id: savedJobId
        })
      })
      
      clearInterval(progressInterval)
      setOptimizationProgress(100)
      
      if (response.ok) {
        const result = await response.json()
        toast.success("Resume optimized successfully!")
        
        // Short delay to show 100% progress
        setTimeout(() => {
          router.push(`/dashboard/optimized/${result.optimized_resume.id}`)
        }, 500)
      } else {
        const result = await response.json()
        toast.error(result.error || "Optimization failed")
        setShowResumePicker(false)
      }
    } catch (error) {
      toast.error("An error occurred during optimization")
      setShowResumePicker(false)
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  return (
    <section className="sm:px-6 lg:px-8 pt-6 pr-4 pb-6 pl-4">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl tracking-tight font-space-grotesk font-semibold">
          Add Job Description
        </h1>
        <p className="mt-1 text-sm text-white/60 font-geist">
          Paste a job description to analyze keywords, match score, and generate a tailored CV.
        </p>
      </div>
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-lg font-medium tracking-tight font-geist">Job details</h2>
          </div>
          
          <form className="px-4 py-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <Label htmlFor="jobTitle" className="text-xs text-white/70 mb-1.5 font-geist">
                Job Title
              </Label>
              <Input
                id="jobTitle"
                type="text"
                placeholder="e.g. Frontend Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-white/40"
              />
            </div>
            
            <div>
              <Label htmlFor="company" className="text-xs text-white/70 mb-1.5 font-geist">
                Company
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="e.g. Lumina"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-white/40"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="jobDescription" className="text-xs text-white/70 font-geist">
                  Job Description
                </Label>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <FileText className="w-3 h-3" />
                  <span>
                    {contentValidation.charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  rows={10}
                  className={`resize-none bg-white/5 border-white/10 text-white placeholder-white/40 ${
                    !contentValidation.isValid && contentValidation.level === 'error' 
                      ? 'border-red-500/50 focus:border-red-500' 
                      : contentValidation.level === 'warning'
                      ? 'border-yellow-500/30 focus:border-yellow-500'
                      : contentValidation.charCount >= IDEAL_MIN_LENGTH
                      ? 'border-emerald-500/30 focus:border-emerald-500'
                      : ''
                  }`}
                />
                
                {/* Progress bar */}
                <div className="absolute bottom-2 right-2 left-2">
                  <div className="bg-black/20 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        contentValidation.level === 'error' 
                          ? 'bg-red-500' 
                          : contentValidation.level === 'warning'
                          ? 'bg-yellow-500'
                          : contentValidation.charCount >= IDEAL_MIN_LENGTH
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.min((contentValidation.charCount / MAX_LENGTH) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <p className="mt-1.5 text-[11px] text-white/50 font-geist">
                Analysis runs as you type or when you click Analyze.
              </p>
              
              {/* Content feedback */}
              {contentValidation.message && contentValidation.charCount > 0 && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm mt-2 ${
                  contentValidation.level === 'error'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : contentValidation.level === 'warning'
                    ? 'bg-yellow-500/10 border border-yellow-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
                }`}>
                  {contentValidation.level === 'error' ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  ) : contentValidation.level === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                  ) : (
                    <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                  )}
                  <div className="space-y-1">
                    <p className={
                      contentValidation.level === 'error'
                        ? 'text-red-300'
                        : contentValidation.level === 'warning'
                        ? 'text-yellow-300'
                        : 'text-blue-300'
                    }>
                      {contentValidation.message}
                    </p>
                    
                    {/* Milestones */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className={`flex items-center gap-1 ${
                        contentValidation.charCount >= MIN_LENGTH ? 'text-emerald-400' : 'text-white/40'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          contentValidation.charCount >= MIN_LENGTH ? 'bg-emerald-400' : 'bg-white/20'
                        }`} />
                        Minimum ({MIN_LENGTH})
                      </div>
                      <div className={`flex items-center gap-1 ${
                        contentValidation.charCount >= RECOMMENDED_MIN_LENGTH ? 'text-emerald-400' : 'text-white/40'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          contentValidation.charCount >= RECOMMENDED_MIN_LENGTH ? 'bg-emerald-400' : 'bg-white/20'
                        }`} />
                        Good ({RECOMMENDED_MIN_LENGTH})
                      </div>
                      <div className={`flex items-center gap-1 ${
                        contentValidation.charCount >= IDEAL_MIN_LENGTH ? 'text-emerald-400' : 'text-white/40'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          contentValidation.charCount >= IDEAL_MIN_LENGTH ? 'bg-emerald-400' : 'bg-white/20'
                        }`} />
                        Ideal ({IDEAL_MIN_LENGTH})
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <Button
                type="button"
                onClick={handleClear}
                variant="outline"
                className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              >
                <Eraser className="w-4 h-4 mr-2" />
                Clear
              </Button>
              
              <Button
                type="button"
                onClick={performAnalysis}
                disabled={!contentValidation.isValid}
                className="bg-emerald-500 hover:bg-emerald-400 text-black"
              >
                {isAnalyzing && <Loader2 className="w-4.5 h-4.5 mr-2 animate-spin" />}
                {!isAnalyzing && <Sparkles className="w-4.5 h-4.5 mr-2" />}
                Analyze
              </Button>
            </div>
          </form>
        </div>
        
        {/* Right: Analysis */}
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium tracking-tight font-geist">AI analysis</h2>
              {aiConfidence !== null && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                  {aiConfidence}% confidence
                </span>
              )}
            </div>
            
            {/* Status or Action Buttons */}
            {!showAnalysis && (
              <span className="text-[11px] text-white/50 font-geist">
                Waiting for input
              </span>
            )}
            
            {showAnalysis && Object.values(loadingStates).some(v => v) && (
              <span className="text-[11px] text-white/50 font-geist">
                AI analyzing...
              </span>
            )}
            
            {showAnalysis && !Object.values(loadingStates).some(v => v) && (
              <div className="flex items-center gap-3">
                {/* Save Status Indicator */}
                {savedJobId ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Saved</span>
                    <Link 
                      href="/dashboard/jobs"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      View →
                    </Link>
                  </div>
                ) : null}
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={savedJobId ? handleUnsaveJob : handleSaveJob}
                    disabled={isAnalyzing || !jobTitle.trim() || !company.trim()}
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    {savedJobId ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />
                        Unsave job
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                        Save job
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerateResume}
                    disabled={isAnalyzing || !jobTitle.trim() || !company.trim()}
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-400 text-black"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                        Generate resume
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 space-y-4">
            {/* Skeleton while analyzing */}
            {isAnalyzing && !showAnalysis && (
              <AnalysisSkeleton />
            )}
            
            {/* Empty state */}
            {!showAnalysis && !isAnalyzing && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-sm font-medium font-geist">No description yet</p>
                    <p className="text-xs text-white/60 font-geist mt-0.5">
                      Paste a job description on the left to see keywords, match score, and suggestions here.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Analysis content */}
            {showAnalysis && (
              <div className="space-y-4">
                {/* Match score */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium font-geist">Match score</p>
                      <p className="text-xs text-white/60 font-geist mt-0.5">
                        AI-calculated alignment with your profile
                      </p>
                      {loadingStates.match && (
                        <div className="mt-1.5">
                          <BusyIndicator text="AI analyzing skills match..." />
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-semibold font-space-grotesk tracking-tight">
                      {matchScore?.pct !== null && matchScore?.pct !== undefined ? `${matchScore.pct}%` : '—'}
                    </span>
                  </div>
                  
                  {loadingStates.match && (
                    <div className="mt-3 animate-pulse">
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-1/3 bg-white/20"></div>
                      </div>
                      <div className="mt-2 h-3 w-24 rounded bg-white/10"></div>
                    </div>
                  )}
                  
                  {/* Missing profile state */}
                  {!loadingStates.match && matchScore?.needsProfile && (
                    <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-300 font-medium">
                            Upload your resume for personalized match scores
                          </p>
                          <p className="text-xs text-blue-300/70 mt-1">
                            We'll analyze your skills and show how well you match this job.
                          </p>
                          <Link 
                            href="/dashboard/master-resume"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
                          >
                            <Upload className="w-3 h-3" />
                            Upload Master Resume
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Match score with breakdown */}
                  {!loadingStates.match && matchScore && !matchScore.needsProfile && matchScore.pct !== null && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${matchScore.color}`}
                            style={{ width: `${matchScore.pct}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Match breakdown */}
                      {semanticDetails && (
                        <details className="mt-2 text-[11px] text-white/50">
                          <summary className="cursor-pointer hover:text-white/70">
                            View match breakdown
                          </summary>
                          <div className="mt-2 space-y-1 pl-3">
                            <div className="flex justify-between">
                              <span>Keyword match:</span>
                              <span className="text-white/70">{semanticDetails.keyword_match}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Semantic similarity:</span>
                              <span className="text-white/70">{semanticDetails.semantic_match}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Required skills match:</span>
                              <span className="text-white/70">
                                {semanticDetails.required_overlap}/{semanticDetails.required_total}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Preferred skills match:</span>
                              <span className="text-white/70">
                                {semanticDetails.preferred_overlap}/{semanticDetails.preferred_total}
                              </span>
                            </div>
                          </div>
                        </details>
                      )}
                      
                      <p className="mt-2 text-[11px] text-white/50 font-geist">{matchScore.hint}</p>
                    </div>
                  )}
                </div>
                
                {/* Quick metrics */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium font-geist">Quick metrics</p>
                      {loadingStates.metrics && (
                        <div className="mt-1">
                          <BusyIndicator text="Parsing sections and estimating length" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {loadingStates.metrics && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3 animate-pulse">
                          <div className="h-3 w-14 bg-white/10 rounded"></div>
                          <div className="mt-2 h-5 w-16 bg-white/10 rounded"></div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!loadingStates.metrics && metrics && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-white/60 font-geist">Words</p>
                        <p className="mt-1 text-base font-semibold font-space-grotesk tracking-tight">
                          {metrics.words}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-white/60 font-geist">Reading time</p>
                        <p className="mt-1 text-base font-semibold font-space-grotesk tracking-tight">
                          {metrics.readingTime}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-white/60 font-geist">Sections</p>
                        <p className="mt-1 text-base font-semibold font-space-grotesk tracking-tight">
                          {metrics.sections}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Keywords */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                      <ListChecks className="w-4.5 h-4.5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-geist">Top keywords</p>
                      <p className="text-xs text-white/60 font-geist -mt-[1px]">
                        AI-extracted from job description
                      </p>
                      {loadingStates.keywords && (
                        <div className="mt-1">
                          <BusyIndicator text="AI extracting keywords..." />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {loadingStates.keywords && (
                    <div className="mt-3 animate-pulse flex flex-wrap gap-1.5">
                      {[14, 10, 20, 12].map((w, i) => (
                        <span key={i} className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <span className={`h-3 bg-white/10 rounded`} style={{ width: `${w * 4}px` }}></span>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {!loadingStates.keywords && keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {keywords.map((kw, i) => (
                        <KeywordChip key={i} text={kw} variant="neutral" />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Suggestions */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                      <Lightbulb className="w-4.5 h-4.5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-geist">Preferred Skills</p>
                      <p className="text-xs text-white/60 font-geist -mt-[1px]">
                        Nice-to-have skills identified by AI
                      </p>
                      {loadingStates.suggestions && (
                        <div className="mt-1">
                          <BusyIndicator text="AI identifying preferred skills..." />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {loadingStates.suggestions && (
                    <div className="mt-3 animate-pulse flex flex-wrap gap-1.5">
                      {[16, 10, 14].map((w, i) => (
                        <span key={i} className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <span className={`h-3 bg-white/10 rounded`} style={{ width: `${w * 4}px` }}></span>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {!loadingStates.suggestions && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {suggestions.length > 0 ? (
                        suggestions.map((sug, i) => (
                          <KeywordChip key={i} text={sug} variant="good" />
                        ))
                      ) : (
                        <KeywordChip text="No preferred skills specified" variant="info" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* ATS checks */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-geist">ATS checks</p>
                      <p className="text-xs text-white/60 font-geist -mt-[1px]">
                        Parsing, readability, formatting flags
                      </p>
                      {loadingStates.ats && (
                        <div className="mt-1">
                          <BusyIndicator text="Running formatting and parsing checks" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {loadingStates.ats && (
                    <div className="mt-3 space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 animate-pulse">
                          <div className="h-4 w-40 bg-white/10 rounded"></div>
                          <div className="mt-2 h-3 w-56 bg-white/10 rounded"></div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!loadingStates.ats && atsChecks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {atsChecks.map((check, i) => (
                        <ATSCheckItem key={i} check={check} />
                      ))}
                    </div>
                  )}
                </div>
                

              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Resume Picker Dialog */}
      <ResumePickerDialog
        open={showResumePicker}
        onOpenChange={setShowResumePicker}
        onOptimize={handleOptimize}
        jobTitle={jobTitle}
        isOptimizing={isAnalyzing}
        optimizationProgress={optimizationProgress}
      />
    </section>
  )
}
