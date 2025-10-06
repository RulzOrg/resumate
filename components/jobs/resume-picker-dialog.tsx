"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Loader2, Wand2, AlertCircle, Upload, Search, FileText, Briefcase } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"

interface RecentOptimization {
  job_title: string
  company_name: string
  created_at: string
  match_score: number
}

interface Resume {
  id: string
  title: string
  file_name: string
  kind: string
  is_primary: boolean
  created_at: string
  updated_at: string
  file_size?: number
  page_count?: number
  optimization_count?: number
  recent_optimizations?: RecentOptimization[]
  parsed_sections?: any
}

interface ResumePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOptimize: (resumeId: string) => Promise<void>
  jobTitle: string
  isOptimizing: boolean
  optimizationProgress: number
}

export function ResumePickerDialog({
  open,
  onOpenChange,
  onOptimize,
  jobTitle,
  isOptimizing,
  optimizationProgress
}: ResumePickerDialogProps) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // Debounce search for performance

  useEffect(() => {
    if (open) {
      fetchResumes()
    }
  }, [open])

  const fetchResumes = async () => {
    setLoading(true)
    try {
      // Fetch only master resumes (not optimized resumes)
      const response = await fetch("/api/resumes/master")
      if (response.ok) {
        const data = await response.json()
        const resumeList = data.resumes || []
        setResumes(resumeList)
        
        // Auto-select master resume if exists
        const masterResume = resumeList.find((r: Resume) => r.is_primary)
        if (masterResume) {
          setSelectedResume(masterResume)
        } else if (resumeList.length === 1) {
          // Auto-select if only one resume
          setSelectedResume(resumeList[0])
        }
      } else {
        console.error("Failed to fetch master resumes:", response.status)
        toast.error("Failed to load resumes. Please try again.")
      }
    } catch (error) {
      console.error("Failed to fetch master resumes:", error)
      toast.error("Failed to load resumes. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = async () => {
    if (!selectedResume) return
    await onOptimize(selectedResume.id)
  }

  // Filter resumes based on search query (debounced for performance)
  const filteredResumes = useMemo(() => 
    resumes.filter(resume =>
      resume.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      resume.file_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ),
    [resumes, debouncedSearchQuery]
  )

  // Helper to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={isOptimizing ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-geist">
            Select Base Resume
          </DialogTitle>
          <DialogDescription className="text-sm text-white/60 font-geist">
            Choose which resume to optimize for{" "}
            <span className="font-medium text-white">{jobTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        {!loading && resumes.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search resumes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 font-geist"
              disabled={isOptimizing}
            />
          </div>
        )}

        <div className="min-h-[200px] flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-white/50" />
            </div>
          ) : resumes.length === 0 ? (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-300 font-medium font-geist">
                    No master resumes found
                  </p>
                  <p className="text-xs text-blue-300/70 mt-1 font-geist">
                    Add a resume to your Master Resume collection to get started.
                  </p>
                  <Link 
                    href="/dashboard/master-resume"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 font-geist"
                  >
                    <Upload className="w-3 h-3" />
                    Add Master Resume
                  </Link>
                </div>
              </div>
            </div>
          ) : filteredResumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-sm text-white/60 font-geist">
                No resumes found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto pr-2">
              {/* Resume List */}
              <div className="space-y-2">
                {filteredResumes.map((resume) => (
                  <button
                    key={resume.id}
                    onClick={() => !isOptimizing && setSelectedResume(resume)}
                    className={cn(
                      "w-full text-left rounded-lg border transition-all",
                      "px-3 py-2.5",
                      "border-white/10 bg-white/5",
                      "hover:bg-white/10",
                      selectedResume?.id === resume.id && "bg-emerald-500/10 border-emerald-500/30",
                      isOptimizing && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Radio indicator */}
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        selectedResume?.id === resume.id
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-white/30"
                      )}>
                        {selectedResume?.id === resume.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </div>
                      
                      {/* Resume info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm font-geist truncate">
                            {resume.title}
                          </p>
                          {resume.is_primary && (
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              Master
                            </Badge>
                          )}
                        </div>
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40 font-geist">
                          {resume.file_size && (
                            <span>{formatFileSize(resume.file_size)}</span>
                          )}
                          {resume.page_count && (
                            <span>• {resume.page_count} page{resume.page_count > 1 ? 's' : ''}</span>
                          )}
                          {resume.optimization_count !== undefined && resume.optimization_count > 0 && (
                            <span>• Used {resume.optimization_count}x</span>
                          )}
                        </div>
                        
                        <p className="text-xs text-white/50 font-geist mt-1">
                          Updated {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Selected Resume Details */}
              {selectedResume && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 h-fit sticky top-0">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-medium font-geist">Resume Details</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-white/40 font-geist mb-1">File</p>
                      <p className="text-sm text-white/80 font-geist truncate">{selectedResume.file_name}</p>
                    </div>
                    
                    {selectedResume.recent_optimizations && selectedResume.recent_optimizations.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Briefcase className="w-3 h-3 text-white/40" />
                          <p className="text-xs text-white/40 font-geist">Recently used for</p>
                        </div>
                        <div className="space-y-2">
                          {selectedResume.recent_optimizations.map((opt, idx) => (
                            <div key={idx} className="rounded border border-white/5 bg-white/5 px-2 py-1.5">
                              <p className="text-xs font-medium font-geist text-white/80">{opt.job_title}</p>
                              <p className="text-[10px] text-white/40 font-geist">
                                {opt.company_name} • {formatDistanceToNow(new Date(opt.created_at), { addSuffix: true })}
                              </p>
                              {opt.match_score && (
                                <p className="text-[10px] text-emerald-400 font-geist mt-0.5">
                                  {Math.round(opt.match_score)}% match
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!selectedResume.recent_optimizations || selectedResume.recent_optimizations.length === 0) && (
                      <div className="text-center py-4">
                        <p className="text-xs text-white/40 font-geist">Not used for any jobs yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isOptimizing && (
          <div className="space-y-2">
            <Progress value={optimizationProgress} className="h-1.5" />
            <p className="text-xs text-center text-white/50 font-geist">
              Optimizing your resume... 10-15 seconds
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isOptimizing}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleOptimize}
            disabled={!selectedResume || isOptimizing || resumes.length === 0}
            className="bg-emerald-500 hover:bg-emerald-400 text-black"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                Generate Resume
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
