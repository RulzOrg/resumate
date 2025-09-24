"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
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
import { Loader2, Link2, X, Eye, Edit3, Trash2, Check, AlertTriangle, FileText, AlertCircle, Brain, Sparkles, TrendingUp, Save, Clock, Archive } from "lucide-react"
import type { JobAnalysis } from "@/lib/db"

interface AnalyzeJobDialogProps {
  children: React.ReactNode
  existingAnalyses?: JobAnalysis[]
}

export function AnalyzeJobDialog({ children, existingAnalyses = [] }: AnalyzeJobDialogProps) {
  // Disable URL import - users will manually provide job details
  const ENABLE_URL_IMPORT = false
  const [open, setOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")
  // URL
  const [jobUrl, setJobUrl] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [jobDescription, setJobDescription] = useState("")
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean
    message?: string
    suggestion?: string
  }>({ isValid: true })
  const [fetchedContent, setFetchedContent] = useState<{
    title: string | null
    company?: string
    content: string
    url: string
  } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [duplicateDetection, setDuplicateDetection] = useState<{
    isDuplicate: boolean
    duplicateJob?: JobAnalysis
    similarityScore?: number
  }>({ isDuplicate: false })
  const [detectedCompany, setDetectedCompany] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [contentValidation, setContentValidation] = useState<{
    isValid: boolean
    charCount: number
    message?: string
    level: 'info' | 'warning' | 'error'
  }>({ isValid: true, charCount: 0, level: 'info' })
  const [aiPreview, setAiPreview] = useState<{
    isAnalyzing: boolean
    analysis: any | null
    error: string | null
    lastAnalyzedContent: string
  }>({ isAnalyzing: false, analysis: null, error: null, lastAnalyzedContent: '' })
  const [showAiPreview, setShowAiPreview] = useState(false)
  const [autoSave, setAutoSave] = useState<{
    enabled: boolean
    saving: boolean
    lastSaved: Date | null
    currentDraftId: string | null
    availableDrafts: any[]
    showDraftSelector: boolean
  }>({ 
    enabled: true, 
    saving: false, 
    lastSaved: null, 
    currentDraftId: null,
    availableDrafts: [],
    showDraftSelector: false
  })

  const router = useRouter()

  // Debounce utility function
  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), delay)
    }
  }

  // Content validation constants
  const MIN_LENGTH = 100
  const RECOMMENDED_MIN_LENGTH = 300
  const IDEAL_MIN_LENGTH = 500
  const MAX_LENGTH = 10000

  // Auto-save functions
  const saveDraft = async (force: boolean = false) => {
    if (!autoSave.enabled && !force) return
    if (!jobDescription.trim() || jobDescription.trim().length < 50) return
    if (autoSave.saving) return

    setAutoSave(prev => ({ ...prev, saving: true }))

    try {
      const response = await fetch("/api/jobs/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobUrl: jobUrl.trim(),
          jobDescription: jobDescription.trim(),
          detectedCompany,
          jobTitle: jobTitle.trim() || undefined,
          autoSaveEnabled: autoSave.enabled
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAutoSave(prev => ({ 
          ...prev, 
          saving: false, 
          lastSaved: new Date(),
          currentDraftId: data.draft.id
        }))
      } else {
        setAutoSave(prev => ({ ...prev, saving: false }))
      }
    } catch (err) {
      setAutoSave(prev => ({ ...prev, saving: false }))
    }
  }

  const loadDrafts = async () => {
    try {
      const response = await fetch("/api/jobs/drafts")
      if (response.ok) {
        const data = await response.json()
        setAutoSave(prev => ({ ...prev, availableDrafts: data.drafts || [] }))
      }
    } catch (err) {
      // Silently fail for draft loading
    }
  }

  const loadDraft = (draft: any) => {
    setJobUrl(draft.jobUrl || '')
    setJobDescription(draft.jobDescription || '')
    setJobTitle(draft.jobTitle || '')
    setDetectedCompany(draft.detectedCompany || null)
    setAutoSave(prev => ({ 
      ...prev, 
      currentDraftId: draft.id,
      showDraftSelector: false,
      lastSaved: new Date(draft.lastSaved)
    }))
    
    // Trigger validation and other updates
    handleDescriptionChange(draft.jobDescription || '')
    if (draft.jobUrl) {
      handleUrlChange(draft.jobUrl)
    }
  }

  const deleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`/api/jobs/drafts?id=${draftId}`, {
        method: "DELETE"
      })
      if (response.ok) {
        setAutoSave(prev => ({ 
          ...prev, 
          availableDrafts: prev.availableDrafts.filter(d => d.id !== draftId),
          currentDraftId: prev.currentDraftId === draftId ? null : prev.currentDraftId
        }))
      }
    } catch (err) {
      // Silently fail
    }
  }

  // Debounced auto-save
  const autoSaveDebounced = useCallback(
    debounce(() => {
      saveDraft()
    }, 3000), // Save after 3 seconds of no changes
    [jobDescription, jobUrl, detectedCompany, jobTitle, autoSave.enabled]
  )

  // Load drafts when dialog opens
  useEffect(() => {
    if (open) {
      loadDrafts()
    }
  }, [open])

  // AI Preview Analysis function
  const performAiPreview = async (content: string) => {
    if (content.trim().length < 100) return // Don't analyze too short content
    if (aiPreview.lastAnalyzedContent === content.trim()) return // Don't re-analyze same content
    
    setAiPreview(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      error: null,
      lastAnalyzedContent: content.trim()
    }))

    try {
      const response = await fetch("/api/jobs/preview-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: content.trim(),
          job_title: jobTitle.trim() || (jobUrl ? extractTitleFromUrl(jobUrl) : undefined),
          company_name: detectedCompany
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiPreview(prev => ({ 
          ...prev, 
          analysis: data.analysis, 
          isAnalyzing: false,
          error: null
        }))
        setShowAiPreview(true)
        
        // Show truncation notice if content was truncated
        if (data.truncation_info?.was_truncated) {
          console.log("Content was truncated for preview analysis:", data.truncation_info)
        }
      } else {
        const result = await response.json()
        setAiPreview(prev => ({ 
          ...prev, 
          error: result.error || "Preview analysis failed", 
          isAnalyzing: false 
        }))
      }
    } catch (err) {
      setAiPreview(prev => ({ 
        ...prev, 
        error: "Failed to generate preview", 
        isAnalyzing: false 
      }))
    }
  }

  const extractTitleFromUrl = (url: string): string | undefined => {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      const lastPart = pathParts[pathParts.length - 1]
      if (lastPart && lastPart.length > 3) {
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim()
      }
    } catch {}
    return undefined
  }

  // Debounced AI preview trigger
  const triggerAiPreviewDebounced = useCallback(
    debounce((content: string) => {
      if (content.trim().length >= 200 && contentValidation.isValid) {
        performAiPreview(content)
      }
    }, 2000), // 2 second delay
    [contentValidation.isValid, detectedCompany, jobUrl, jobTitle]
  )

  // Content validation function
  const validateJobContent = (content: string): {
    isValid: boolean
    charCount: number
    message?: string
    level: 'info' | 'warning' | 'error'
  } => {
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

  // URL validation function
  const validateJobUrl = (url: string): { isValid: boolean; message?: string; suggestion?: string } => {
    if (!url.trim()) {
      return { isValid: true } // Empty is valid (no error shown)
    }

    try {
      const urlObj = new URL(url)
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { 
          isValid: false, 
          message: "URL must use http:// or https://",
          suggestion: `Try: https://${url.replace(/^[^:]+:\/\//, '')}`
        }
      }

      // Check for common job board domains and patterns
      const hostname = urlObj.hostname.toLowerCase()
      const pathname = urlObj.pathname.toLowerCase()
      
      // Common job board domains
      const jobBoardDomains = [
        'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
        'ziprecruiter.com', 'careerbuilder.com', 'simplyhired.com',
        'jobs.com', 'workable.com', 'lever.co', 'greenhouse.io',
        'smartrecruiters.com', 'bamboohr.com', 'breezy.hr'
      ]

      // Company career page patterns
      const careerPatterns = [
        '/careers', '/jobs', '/opportunities', '/positions',
        '/work-with-us', '/join-us', '/employment', '/openings'
      ]

      const isJobBoard = jobBoardDomains.some(domain => 
        hostname.includes(domain) || hostname.endsWith(`.${domain}`)
      )
      
      const hasCareerPath = careerPatterns.some(pattern => 
        pathname.includes(pattern)
      )

      // Warn for non-job URLs but don't block them
      if (!isJobBoard && !hasCareerPath) {
        return {
          isValid: true, // Still valid, just a warning
          message: "This doesn't look like a job posting URL. Make sure it links to a specific job listing.",
          suggestion: "Try URLs from job boards (LinkedIn, Indeed) or company career pages (/careers, /jobs)"
        }
      }

      return { isValid: true }
    } catch {
      return { 
        isValid: false, 
        message: "Please enter a valid URL",
        suggestion: "Example: https://company.com/careers/software-engineer"
      }
    }
  }

  // Duplicate detection functions
  const checkForDuplicates = (url?: string, content?: string) => {
    if (!existingAnalyses.length) {
      setDuplicateDetection({ isDuplicate: false })
      return
    }

    // Check for URL duplicates first (exact match)
    if (url?.trim()) {
      const normalizedUrl = normalizeUrl(url.trim())
      const urlDuplicate = existingAnalyses.find(analysis => 
        analysis.job_url && normalizeUrl(analysis.job_url) === normalizedUrl
      )
      
      if (urlDuplicate) {
        setDuplicateDetection({
          isDuplicate: true,
          duplicateJob: urlDuplicate,
          similarityScore: 100
        })
        return
      }
    }

    // Check for content similarity if we have content
    if (content?.trim() && content.length > 100) {
      const contentSimilarity = findMostSimilarJob(content.trim())
      if (contentSimilarity.score > 80) { // 80% similarity threshold
        setDuplicateDetection({
          isDuplicate: true,
          duplicateJob: contentSimilarity.job,
          similarityScore: contentSimilarity.score
        })
        return
      }
    }

    setDuplicateDetection({ isDuplicate: false })
  }

  const normalizeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      // Remove common tracking parameters and fragments
      urlObj.search = ''
      urlObj.hash = ''
      // Normalize trailing slashes
      let pathname = urlObj.pathname.replace(/\/+$/, '')
      if (!pathname) pathname = '/'
      urlObj.pathname = pathname
      return urlObj.toString().toLowerCase()
    } catch {
      return url.toLowerCase().trim()
    }
  }

  const findMostSimilarJob = (content: string): { job: JobAnalysis; score: number } => {
    let mostSimilar = { job: existingAnalyses[0], score: 0 }
    
    const contentWords = extractKeywords(content)
    
    for (const job of existingAnalyses) {
      const jobWords = extractKeywords(job.job_description)
      const similarity = calculateSimilarity(contentWords, jobWords)
      
      if (similarity > mostSimilar.score) {
        mostSimilar = { job, score: similarity }
      }
    }
    
    return mostSimilar
  }

  const extractKeywords = (text: string): Set<string> => {
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
    return new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word))
    )
  }

  const calculateSimilarity = (set1: Set<string>, set2: Set<string>): number => {
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    return union.size > 0 ? (intersection.size / union.size) * 100 : 0
  }

  // Enhanced company name extraction
  const extractCompanyFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      
      // Remove common prefixes and TLDs
      let domain = hostname
        .replace(/^(www\.|careers\.|jobs\.|apply\.|workday\.|greenhouse\.|lever\.|bamboohr\.|smartrecruiters\.)/, '')
        .replace(/\.(com|org|net|io|co|jobs|careers)(\.[a-z]{2})?$/, '')
      
      // Handle specific patterns
      if (domain.includes('.')) {
        const parts = domain.split('.')
        // For domains like "company.workday.com" or "company.greenhouse.io"
        if (parts.length >= 2 && ['workday', 'greenhouse', 'lever', 'bamboohr', 'smartrecruiters'].includes(parts[1])) {
          domain = parts[0]
        } else {
          // Take the main domain part
          domain = parts[parts.length - 2] || parts[0]
        }
      }
      
      // Clean up and format
      domain = domain
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim()
      
      // Skip if it's too generic or too short
      if (domain.length < 2 || ['Jobs', 'Careers', 'Apply', 'Work'].includes(domain)) {
        return null
      }
      
      return domain
    } catch {
      return null
    }
  }

  const extractCompanyFromContent = (content: string, title?: string): string | null => {
    const text = `${title || ''} ${content}`.toLowerCase()
    
    // Common patterns for company names in job descriptions
    const patterns = [
      // "Join [Company]" or "About [Company]"
      /(?:join|about)\s+([A-Z][a-zA-Z\s&.,-]{2,40})(?:\s|,|\.|\n)/gi,
      // "[Company] is seeking" or "[Company] is looking for"
      /^([A-Z][a-zA-Z\s&.,-]{2,40})\s+(?:is|are)\s+(?:seeking|looking|hiring)/gmi,
      // "At [Company]," or "At [Company] you will"
      /(?:at|with)\s+([A-Z][a-zA-Z\s&.,-]{2,40})(?:,|\s+you|\s+we|\s+our)/gi,
      // "[Company] - Job Title" format
      /^([A-Z][a-zA-Z\s&.,-]{2,40})\s*[-–—]\s*/gmi,
      // "We are [Company]" or "We're [Company]"
      /(?:we\s+are|we're)\s+([A-Z][a-zA-Z\s&.,-]{2,40})(?:\s|,|\.|\n)/gi,
    ]
    
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern))
      for (const match of matches) {
        let company = match[1]?.trim()
        if (company && isValidCompanyName(company)) {
          return formatCompanyName(company)
        }
      }
    }
    
    return null
  }

  const isValidCompanyName = (name: string): boolean => {
    // Filter out common false positives
    const invalidWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'job', 'position', 'role', 'opportunity', 'career', 'work', 'employment',
      'candidate', 'applicant', 'employee', 'team', 'department', 'company',
      'looking', 'seeking', 'hiring', 'join', 'about', 'we', 'our', 'you', 'your'
    ]
    
    const lowercaseName = name.toLowerCase()
    
    // Check if it's too short or too long
    if (name.length < 2 || name.length > 50) return false
    
    // Check if it's all common words
    const words = lowercaseName.split(/\s+/)
    if (words.every(word => invalidWords.includes(word))) return false
    
    // Check for suspicious patterns
    if (/^\d+$/.test(name)) return false // All numbers
    if (/^[^a-zA-Z]*$/.test(name)) return false // No letters
    
    return true
  }

  const formatCompanyName = (name: string): string => {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      // Capitalize first letter of each word, but preserve existing capitals
      .replace(/\b\w/g, (match, offset, string) => {
        const prevChar = offset > 0 ? string[offset - 1] : ''
        if (prevChar === prevChar.toUpperCase() && prevChar !== ' ') {
          return match // Don't change if previous char suggests it might be an acronym
        }
        return match.toUpperCase()
      })
  }

  const getSmartCompanyName = (url?: string, content?: string, title?: string, providedCompany?: string): string | undefined => {
    // 1. Use provided company if it exists and looks good
    if (providedCompany && isValidCompanyName(providedCompany)) {
      return formatCompanyName(providedCompany)
    }
    
    // 2. Try to extract from URL
    if (url) {
      const urlCompany = extractCompanyFromUrl(url)
      if (urlCompany) return urlCompany
    }
    
    // 3. Try to extract from content
    if (content) {
      const contentCompany = extractCompanyFromContent(content, title)
      if (contentCompany) return contentCompany
    }
    
    return undefined
  }

  // Handle URL input changes with validation
  const handleUrlChange = (url: string) => {
    setJobUrl(url)
    const validation = validateJobUrl(url)
    setUrlValidation(validation)
    
    // Check for duplicates when URL changes
    checkForDuplicates(url, jobDescription)
    
    // Clear general error if URL becomes valid
    if (validation.isValid && error.includes("URL")) {
      setError("")
    }
    
    // Trigger auto-save if we have content
    if (jobDescription.trim().length >= 50) {
      autoSaveDebounced()
    }
  }

  // Handle job description changes
  const handleDescriptionChange = (content: string) => {
    setJobDescription(content)
    
    // Validate content length and provide feedback
    const validation = validateJobContent(content)
    setContentValidation(validation)
    
    // Clear general error if content becomes valid
    if (validation.isValid && error.includes("description")) {
      setError("")
    }
    
    
    // Check for duplicates when content changes
    if (content.length > 100) {
      checkForDuplicates(jobUrl, content)
    } else {
      setDuplicateDetection({ isDuplicate: false })
    }
    
    // Trigger AI preview analysis with debounce
    if (content.trim().length >= 200) {
      triggerAiPreviewDebounced(content)
    } else {
      // Clear preview if content gets too short
      setAiPreview(prev => ({ 
        ...prev, 
        analysis: null, 
        error: null,
        lastAnalyzedContent: ''
      }))
      setShowAiPreview(false)
    }
    
    // Trigger auto-save with debounce
    if (content.trim().length >= 50) {
      autoSaveDebounced()
    }
  }

  const handleFetchFromUrl = async () => {
    if (!jobUrl.trim()) return

    // Validate URL before attempting fetch
    const validation = validateJobUrl(jobUrl)
    if (!validation.isValid) {
      setError(validation.message || "Invalid URL")
      return
    }

    // Warn if content already exists
    if (jobDescription.trim() && !confirm("This will replace your current job description. Continue?")) {
      return
    }

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
        const detectedTitle: string = typeof data.title === "string" ? data.title : ""
        // Store fetched content for preview
        const content = data.content || ""
        
        // Enhanced company name extraction
        const smartCompanyName = getSmartCompanyName(
          jobUrl.trim(),
          content,
          detectedTitle,
          data.company
        )

        setJobTitle((prev) => (detectedTitle ? detectedTitle : prev))
        setUrlValidation((prev) => ({
          ...prev,
          isValid: true,
          message: detectedTitle
            ? prev.isValid ? undefined : prev.message
            : "We couldn't detect the job title automatically. Please add it manually below.",
        }))

        setFetchedContent({
          title: detectedTitle || null,
          company: smartCompanyName,
          content: content,
          url: jobUrl.trim()
        })
        setShowPreview(true)
        
        // Check for duplicates with fetched content
        checkForDuplicates(jobUrl.trim(), content)
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
    // Validate content before proceeding
    const validation = validateJobContent(jobDescription)
    if (!validation.isValid) {
      setError(validation.message || "Please provide a valid job description")
      return
    }

    setIsAnalyzing(true)
    setError("")

    const deriveTitle = () => {
      if (jobTitle.trim()) {
        return jobTitle.trim()
      }
      try {
        if (jobUrl.trim()) {
          const u = new URL(jobUrl.trim())
          const last = u.pathname.split("/").filter(Boolean).pop() || ""
          const fromPath = last
            .replace(/[-_]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
          if (fromPath) {
            return fromPath
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          }
          const hostPart = u.hostname.split(".")[0]
          return hostPart ? `${hostPart.charAt(0).toUpperCase() + hostPart.slice(1)} Role` : "Target Role"
        }
      } catch {}
      const firstLine = jobDescription.split(/\n|\r/)[0]?.trim()
      if (firstLine && firstLine.length > 0) return firstLine.slice(0, 80)
      return "Target Role"
    }

    // Require user-provided company
    const finalCompany = company.trim()
    if (!finalCompany) {
      setIsAnalyzing(false)
      setError("Company is required")
      return
    }

    try {
      const response = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: deriveTitle(),
          company_name: finalCompany,
          job_url: jobUrl.trim() || undefined,
          job_description: jobDescription.trim(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Check if there were any warnings (e.g., resume generation failed)
        if (result.warning) {
          console.warn("Analysis completed with warning:", result.warning)
          // Still close dialog but could show a toast notification
        }
        
        setOpen(false)
        resetForm()
        router.refresh()
      } else {
        const result = await response.json()
        
        // Provide more specific error messages
        if (result.error?.includes("confidence too low")) {
          setError("The job description appears too brief or unclear for reliable analysis. Please add more details about requirements, skills, and responsibilities.")
        } else if (result.error?.includes("too short")) {
          setError("Please provide a more detailed job description with requirements and responsibilities.")
        } else if (result.error?.includes("validation failed")) {
          setError("The analysis could not be completed. Please check your job description and try again.")
        } else {
          setError(result.error || "Analysis failed")
        }
      }
    } catch (err) {
      setError("An error occurred during analysis")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle preview actions
  const handleUseContent = () => {
    if (fetchedContent) {
      setJobDescription(fetchedContent.content)
      if (fetchedContent.title) {
        setJobTitle(fetchedContent.title)
      }
      setShowPreview(false)
      
      // Validate the content we're about to use
      const validation = validateJobContent(fetchedContent.content)
      setContentValidation(validation)
      
      // Check duplicates with the content we're about to use
      checkForDuplicates(jobUrl, fetchedContent.content)
    }
  }

  const handleEditContent = () => {
    if (fetchedContent) {
      setJobDescription(fetchedContent.content)
      if (fetchedContent.title) {
        setJobTitle(fetchedContent.title)
      }
      setShowPreview(false)
      
      // Validate the content we're about to edit
      const validation = validateJobContent(fetchedContent.content)
      setContentValidation(validation)
      
      // Check duplicates with the content we're about to edit
      checkForDuplicates(jobUrl, fetchedContent.content)
      
      // Focus the textarea for editing
      setTimeout(() => {
        const textarea = document.getElementById('job-description') as HTMLTextAreaElement
        if (textarea) {
          textarea.focus()
          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }

  const handleDiscardContent = () => {
    setFetchedContent(null)
    setShowPreview(false)
  }

  const resetForm = () => {
    setJobUrl("")
    setJobDescription("")
    setJobTitle("")
    setCompany("")
    setError("")
    setUrlValidation({ isValid: true })
    setContentValidation({ isValid: true, charCount: 0, level: 'info' })
    setFetchedContent(null)
    setShowPreview(false)
    setDuplicateDetection({ isDuplicate: false })
    setDetectedCompany(null)
    setAiPreview({ isAnalyzing: false, analysis: null, error: null, lastAnalyzedContent: '' })
    setShowAiPreview(false)
    setAutoSave(prev => ({ 
      ...prev, 
      currentDraftId: null, 
      lastSaved: null,
      showDraftSelector: false
    }))
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
      <DialogContent
        overlayClassName="bg-black/80 backdrop-blur-sm"
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-white/10 bg-[#111111] p-0"
        showCloseButton={false}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl tracking-tight">Add Target Job</DialogTitle>
                <DialogDescription className="mt-1 text-white/60 text-sm">
                  Enter the job details and description to analyze.
                </DialogDescription>
              </DialogHeader>
              
              {/* Auto-save status */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAutoSave(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      autoSave.enabled 
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                  >
                    <Save className="w-3 h-3" />
                    Auto-save {autoSave.enabled ? 'ON' : 'OFF'}
                  </button>
                  
                  {autoSave.saving && (
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </div>
                  )}
                  
                  {autoSave.lastSaved && !autoSave.saving && (
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Clock className="w-3 h-3" />
                      Saved {autoSave.lastSaved.toLocaleTimeString()}
                    </div>
                  )}
                </div>
                
                {/* Draft selector */}
                {autoSave.availableDrafts.length > 0 && (
                  <button
                    onClick={() => setAutoSave(prev => ({ ...prev, showDraftSelector: !prev.showDraftSelector }))}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10"
                  >
                    <Archive className="w-3 h-3" />
                    {autoSave.availableDrafts.length} Draft{autoSave.availableDrafts.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Draft Selector */}
          {autoSave.showDraftSelector && autoSave.availableDrafts.length > 0 && (
            <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-300 flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Saved Drafts
                </h4>
                <button
                  onClick={() => setAutoSave(prev => ({ ...prev, showDraftSelector: false }))}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {autoSave.availableDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`flex items-center justify-between p-2 rounded border transition-colors ${
                      autoSave.currentDraftId === draft.id
                        ? 'bg-blue-500/20 border-blue-500/40'
                        : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
                    }`}
                  >
                    <button
                      onClick={() => loadDraft(draft)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm text-blue-200">
                        {draft.jobUrl ? new URL(draft.jobUrl).hostname : 'Manual Entry'}
                      </div>
                      <div className="text-xs text-blue-300/60 truncate">
                        {draft.jobDescription.substring(0, 60)}...
                      </div>
                      <div className="text-xs text-blue-300/50 mt-1">
                        {new Date(draft.lastSaved).toLocaleDateString()} at{' '}
                        {new Date(draft.lastSaved).toLocaleTimeString()}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-2 bg-blue-500/10 rounded text-xs text-blue-300">
                💡 Click on a draft to load it. Drafts are automatically saved as you type.
              </div>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {ENABLE_URL_IMPORT && (
              <>
                <Label htmlFor="job-url" className="mb-2 block text-white/80">Job Post URL</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Link2 className="h-5 w-5 text-white/40" />
                  </div>
                  <Input
                    id="job-url"
                    type="url"
                    placeholder="https://example.com/careers/..."
                    value={jobUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    disabled={isFetching}
                    className={`bg-white/5 border-white/10 text-white placeholder-white/40 pl-10 pr-24 ${
                      !urlValidation.isValid ? 'border-red-500/50 focus:border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromUrl}
                    disabled={!jobUrl.trim() || isFetching || !urlValidation.isValid}
                    className="absolute right-1 top-1 bottom-1 inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 px-3 text-sm text-white/90 disabled:opacity-50"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching
                      </>
                    ) : (
                      <>Preview</>
                    )}
                  </button>
                </div>
                {/* URL Validation Feedback */}
                {urlValidation.message && (
                  <div className={`mt-2 text-sm ${
                    urlValidation.isValid ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    <p>{urlValidation.message}</p>
                    {urlValidation.suggestion && (
                      <p className="text-white/50 mt-1">{urlValidation.suggestion}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Content Preview */}
            {ENABLE_URL_IMPORT && showPreview && fetchedContent && (
              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-emerald-400" />
                      <h4 className="font-medium text-white">Content Preview</h4>
                    </div>
                    <button
                      onClick={handleDiscardContent}
                      className="text-white/50 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-white/60">Job Title:</p>
                      <p className={`font-medium ${fetchedContent.title ? 'text-white' : 'text-yellow-400'}`}>
                        {fetchedContent.title || 'Not detected automatically'}
                      </p>
                    </div>
                    
                    {fetchedContent.company && (
                      <div>
                        <p className="text-sm text-white/60">Company:</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{fetchedContent.company}</p>
                          <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">
                            Auto-detected
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-white/60">Content Preview:</p>
                      <div className="mt-1 max-h-32 overflow-y-auto rounded bg-white/5 p-3">
                        <p className="text-sm text-white/80 whitespace-pre-wrap">
                          {fetchedContent.content.slice(0, 500)}
                          {fetchedContent.content.length > 500 && "..."}
                        </p>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        {fetchedContent.content.length} characters
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleUseContent}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black"
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Use This Content
                    </Button>
                    <Button
                      onClick={handleEditContent}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                      size="sm"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit & Use
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Detection Warning */}
            {duplicateDetection.isDuplicate && duplicateDetection.duplicateJob && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium text-yellow-300">Potential Duplicate Detected</h4>
                      <p className="text-sm text-yellow-200/80">
                        This job appears similar to one you've already analyzed 
                        ({Math.round(duplicateDetection.similarityScore || 0)}% match).
                      </p>
                    </div>
                    
                    <div className="bg-yellow-500/5 rounded p-3 space-y-1">
                      <p className="text-sm font-medium text-yellow-300">
                        Existing Job: {duplicateDetection.duplicateJob.job_title}
                      </p>
                      {duplicateDetection.duplicateJob.company_name && (
                        <p className="text-sm text-yellow-200/60">
                          Company: {duplicateDetection.duplicateJob.company_name}
                        </p>
                      )}
                      <p className="text-xs text-yellow-200/50">
                        Analyzed {new Date(duplicateDetection.duplicateJob.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20"
                        onClick={() => setDuplicateDetection({ isDuplicate: false })}
                      >
                        Continue Anyway
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20"
                        onClick={() => {
                          setOpen(false)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="job-title" className="mb-2 block text-white/80">Job Title</Label>
              <Input
                id="job-title"
                placeholder="e.g., Senior Frontend Engineer"
                value={jobTitle}
                onChange={(e) => {
                  const value = e.target.value
                  setJobTitle(value)
                  if (value.trim()) {
                    setUrlValidation((prev) => {
                      if (prev.message && prev.message.includes("couldn't detect")) {
                        return { ...prev, message: undefined }
                      }
                      return prev
                    })
                  }
                }}
                disabled={isAnalyzing}
                className="bg-white/5 border-white/10 text-white placeholder-white/40"
              />
              {jobTitle.trim() ? (
                <p className="mt-2 text-xs text-white/40">
                  You can tweak the title before running the analysis.
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="company" className="mb-2 block text-white/80">Company</Label>
              <Input
                id="company"
                placeholder="e.g., Meta"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={isAnalyzing}
                className="bg-white/5 border-white/10 text-white placeholder-white/40"
              />
            </div>

            {ENABLE_URL_IMPORT && (
              <div className="flex items-center py-1">
                <div className="flex-grow border-t border-white/10" />
                <span className="mx-4 text-xs text-white/50 uppercase">
                  {showPreview ? "Or Edit Manually" : "Or"}
                </span>
                <div className="flex-grow border-t border-white/10" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="job-description">Job Description</Label>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <FileText className="w-3 h-3" />
                  <span>
                    {contentValidation.charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <Textarea
                  id="job-description"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  disabled={isAnalyzing}
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
                
                {/* Character count progress bar */}
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
              
              {/* Content Length Feedback */}
              {contentValidation.message && contentValidation.charCount > 0 && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  contentValidation.level === 'error'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : contentValidation.level === 'warning'
                    ? 'bg-yellow-500/10 border border-yellow-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
                }`}>
                  {contentValidation.level === 'error' ? (
                    <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      contentValidation.level === 'error' ? 'text-red-400' : 'text-yellow-400'
                    }`} />
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
                    
                    {/* Progress milestones and AI Preview button */}
                    <div className="flex items-center justify-between">
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
                      
                      {/* Manual AI Preview Button */}
                      {contentValidation.charCount >= 200 && !showAiPreview && !aiPreview.isAnalyzing && (
                        <button
                          onClick={() => performAiPreview(jobDescription)}
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Brain className="w-3 h-3" />
                          Preview AI Analysis
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              
              {/* AI Preview Analysis */}
              {showAiPreview && aiPreview.analysis && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-400" />
                        <h4 className="font-medium text-white">AI Analysis Preview</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                            <Sparkles className="w-3 h-3" />
                            {aiPreview.analysis.analysis_confidence}% confidence
                          </div>
                          {aiPreview.analysis.content_info?.was_truncated && (
                            <div className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              Truncated
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAiPreview(false)}
                        className="text-white/50 hover:text-blue-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Key Skills */}
                      {aiPreview.analysis.required_skills?.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-blue-300 mb-2 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Required Skills ({aiPreview.analysis.required_skills.length})
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {aiPreview.analysis.required_skills.map((skill: string, index: number) => (
                              <span
                                key={index}
                                className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded border border-blue-500/30"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Keywords */}
                      {aiPreview.analysis.keywords?.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-blue-300 mb-2">
                            Keywords ({aiPreview.analysis.keywords.length})
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {aiPreview.analysis.keywords.map((keyword: string, index: number) => (
                              <span
                                key={index}
                                className="text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Experience Level */}
                      {aiPreview.analysis.experience_level && (
                        <div>
                          <h5 className="text-sm font-medium text-blue-300 mb-2">Experience Level</h5>
                          <span className="text-sm bg-blue-500/20 text-blue-200 px-3 py-1 rounded border border-blue-500/30">
                            {aiPreview.analysis.experience_level}
                          </span>
                        </div>
                      )}
                      
                      {/* Location & Salary */}
                      <div className="space-y-2">
                        {aiPreview.analysis.location && (
                          <div>
                            <h5 className="text-sm font-medium text-blue-300">Location</h5>
                            <p className="text-sm text-blue-200">{aiPreview.analysis.location}</p>
                          </div>
                        )}
                        {aiPreview.analysis.salary_range && (
                          <div>
                            <h5 className="text-sm font-medium text-blue-300">Salary Range</h5>
                            <p className="text-sm text-blue-200">{aiPreview.analysis.salary_range}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Requirements Preview */}
                    {aiPreview.analysis.key_requirements?.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-blue-300 mb-2">Key Requirements</h5>
                        <ul className="text-sm text-blue-200 space-y-1">
                          {aiPreview.analysis.key_requirements.slice(0, 2).map((req: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                              {req}
                            </li>
                          ))}
                          {aiPreview.analysis.key_requirements.length > 2 && (
                            <li className="text-xs text-blue-300/60">
                              +{aiPreview.analysis.key_requirements.length - 2} more requirements
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <div className="mt-4 p-3 bg-blue-500/10 rounded border border-blue-500/20">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-blue-300">
                            💡 This preview shows what AI can extract from your job description.
                          </p>
                          <button
                            onClick={() => performAiPreview(jobDescription)}
                            disabled={aiPreview.isAnalyzing}
                            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                          >
                            Refresh Analysis
                          </button>
                        </div>
                        {aiPreview.analysis.content_info?.was_truncated && (
                          <div className="text-xs text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                            ⚠️ Content was intelligently truncated from {aiPreview.analysis.content_info.original_length.toLocaleString()} to {aiPreview.analysis.content_info.processed_length.toLocaleString()} characters for preview. Full analysis will use complete content.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* AI Preview Loading */}
              {aiPreview.isAnalyzing && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-blue-300">AI is analyzing the job description...</span>
                </div>
              )}
              
              {/* AI Preview Error */}
              {aiPreview.error && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-300">{aiPreview.error}</span>
                  </div>
                  <button
                    onClick={() => setAiPreview(prev => ({ ...prev, error: null }))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-4 bg-black/30 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:justify-between gap-3 rounded-b-2xl">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 bg-white/10 hover:bg-white/20"
              variant="secondary"
            >
              Cancel
            </Button>
            
            {/* Manual Save Button */}
            {jobDescription.trim().length >= 50 && (
              <Button
                type="button"
                onClick={() => saveDraft(true)}
                disabled={autoSave.saving}
                className="text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30"
                variant="outline"
                size="sm"
              >
                {autoSave.saving ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-1" />
                    Save Draft
                  </>
                )}
              </Button>
            )}
          </div>
          
          <Button
            onClick={handleAnalyze}
            disabled={!contentValidation.isValid || isAnalyzing}
            className="w-full sm:w-auto text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Add Job'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
