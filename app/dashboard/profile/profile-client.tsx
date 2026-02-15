"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadMasterResumeDialog } from "@/components/dashboard/master-resume-dialog"
import { MasterResumePreviewDialog } from "@/components/dashboard/master-resume-preview-dialog"
import type { Resume, JobAnalysis } from "@/lib/db"
import {
  User,
  FileText,
  Briefcase,
  BarChart3,
  Calendar,
  Mail,
  Crown,
  Upload,
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
  ExternalLink,
  Building2,
  MapPin,
  Clock,
  TrendingUp,
  FileCheck,
  Sparkles,
  ChevronRight,
  Download,
  Settings,
  Camera,
  Loader2,
} from "lucide-react"

interface ProfileClientProps {
  user: {
    id: string
    name: string
    email: string
    imageUrl: string | null
    avatarUrl: string | null
    createdAt: string
  }
  subscription: any
  usageLimits: any
  masterResumes: Resume[]
  optimizedResumes: any[]
  jobAnalyses: JobAnalysis[]
}

export function ProfileClient({
  user,
  subscription,
  usageLimits,
  masterResumes,
  optimizedResumes,
  jobAnalyses,
}: ProfileClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  // Resume management state
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<{ id: string; message: string } | null>(null)
  const [previewResume, setPreviewResume] = useState<Resume | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const isFreeUser = subscription?.plan === "free" || !subscription?.plan

  // Determine which avatar to display: custom avatar > Clerk image > placeholder
  const displayAvatarUrl = user.avatarUrl || user.imageUrl

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, WebP, or GIF.")
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.")
      return
    }

    setIsUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload avatar")
      }

      toast.success("Avatar updated successfully")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar")
    } finally {
      setIsUploadingAvatar(false)
      // Reset the input so the same file can be selected again
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ""
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary/20 text-primary border-primary/30"
      case "trialing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "past_due":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "canceled":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-surface-muted text-muted-foreground border-border"
    }
  }

  const handleStartEdit = (resumeId: string, currentTitle: string) => {
    setEditingId(resumeId)
    setEditingTitle(currentTitle)
    setUpdateError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle("")
    setUpdateError(null)
  }

  const handleSaveEdit = async (resumeId: string) => {
    if (!editingTitle.trim()) {
      setUpdateError({ id: resumeId, message: "Resume title cannot be empty" })
      return
    }

    setIsUpdating(resumeId)
    setUpdateError(null)

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() })
      })

      if (response.ok) {
        setEditingId(null)
        setEditingTitle("")
        toast.success("Resume title updated successfully")
        router.refresh()
      } else {
        const error = await response.json()
        setUpdateError({
          id: resumeId,
          message: error.error || error.message || 'Failed to update resume title.',
        })
      }
    } catch (error) {
      setUpdateError({
        id: resumeId,
        message: 'Failed to update resume title. Please try again.',
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDelete = async (resumeId: string) => {
    setIsDeleting(resumeId)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setConfirmingDeleteId(null)
        toast.success("Resume deleted successfully")
        router.refresh()
      } else {
        const error = await response.json()
        setDeleteError({
          id: resumeId,
          message: error.error || error.message || 'Failed to delete resume.',
        })
      }
    } catch (error) {
      setDeleteError({
        id: resumeId,
        message: 'Failed to delete resume. Please try again.',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handlePreview = (resume: Resume) => {
    setPreviewResume(resume)
    setIsPreviewOpen(true)
  }

  // Stats calculations
  const totalOptimizations = optimizedResumes.length
  const totalJobAnalyses = jobAnalyses.length
  const recentActivity = [...optimizedResumes, ...jobAnalyses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Get unique companies from job analyses
  const uniqueCompanies = [...new Set(jobAnalyses.map(j => j.company_name).filter(Boolean))]

  return (
    <div className="space-y-8">
      {/* Profile Overview Card */}
      <Card className="rounded-2xl border-border bg-surface-subtle">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              {displayAvatarUrl ? (
                <Image
                  src={displayAvatarUrl}
                  alt={user.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border-2 border-border object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border-2 border-border bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              {/* Avatar upload overlay */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                aria-label="Upload avatar"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {!isFreeUser && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1 pointer-events-none">
                  <Crown className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">{user.name}</h2>
                  <div className="flex items-center gap-4 mt-0.5 text-muted-foreground">
                    <span className="text-sm truncate">{user.email}</span>
                    <span className="text-xs hidden sm:inline">Member since {format(new Date(user.createdAt), 'MMM yyyy')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`${getStatusColor(subscription?.status || "free")} border text-xs px-2.5 py-0.5`}>
                    {subscription?.plan === "pro" ? "Pro" : "Free"}
                  </Badge>
                  <Link href="/dashboard/settings">
                    <Button variant="outline" size="sm" className="h-8 ">
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats - Inline */}
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-sm text-muted-foreground">Resumes</span>
              <span className="text-sm font-semibold text-foreground">{masterResumes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-sm text-muted-foreground">Optimized</span>
              <span className="text-sm font-semibold text-foreground">{totalOptimizations}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-sm text-muted-foreground">Jobs</span>
              <span className="text-sm font-semibold text-foreground">{totalJobAnalyses}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-sm text-muted-foreground">Companies</span>
              <span className="text-sm font-semibold text-foreground">{uniqueCompanies.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12 bg-surface-muted border border-border rounded-xl p-1.5 gap-1">
          <TabsTrigger
            value="overview"
            className="rounded-lg h-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
          >
            <BarChart3 className="w-4 h-4 mr-2 hidden sm:inline" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="resumes"
            className="rounded-lg h-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
          >
            <FileText className="w-4 h-4 mr-2 hidden sm:inline" />
            Resumes
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-lg h-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
          >
            <Clock className="w-4 h-4 mr-2 hidden sm:inline" />
            History
          </TabsTrigger>
          <TabsTrigger
            value="usage"
            className="rounded-lg h-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
          >
            <TrendingUp className="w-4 h-4 mr-2 hidden sm:inline" />
            Usage
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card className="rounded-2xl border-border bg-surface-subtle">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your latest resume optimizations and job analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((item: any) => {
                      const isOptimizedResume = item.original_resume_id
                      const href = isOptimizedResume
                        ? `/dashboard/optimized/${item.id}`
                        : item.job_url || null

                      const content = (
                        <>
                          <div className={`p-2 rounded-lg ${isOptimizedResume ? 'bg-primary/20' : 'bg-blue-500/20'}`}>
                            {isOptimizedResume ? (
                              <Sparkles className="h-4 w-4 text-primary" />
                            ) : (
                              <Briefcase className="h-4 w-4 text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.job_title || 'Resume Optimization'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.company_name && `${item.company_name} • `}
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
                        </>
                      )

                      if (isOptimizedResume && href) {
                        return (
                          <Link
                            key={item.id}
                            href={href}
                            className="group flex items-center gap-3 p-3 rounded-lg bg-surface-muted border border-border hover:bg-surface-strong transition-colors cursor-pointer"
                          >
                            {content}
                          </Link>
                        )
                      }

                      if (!isOptimizedResume && href) {
                        return (
                          <a
                            key={item.id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 p-3 rounded-lg bg-surface-muted border border-border hover:bg-surface-strong transition-colors cursor-pointer"
                          >
                            {content}
                          </a>
                        )
                      }

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted border border-border"
                        >
                          {content}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No recent activity yet</p>
                    <p className="text-xs mt-1">Start by optimizing a resume for a job</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="rounded-2xl border-border bg-surface-subtle">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Get started with common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard" className="block">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Optimize Resume</p>
                      <p className="text-xs text-muted-foreground">Tailor your resume for a specific job</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </div>
                </Link>

                {masterResumes.length < 3 && (
                  <UploadMasterResumeDialog currentResumeCount={masterResumes.length}>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-muted border border-border hover:bg-surface-strong transition-colors cursor-pointer">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Upload className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Upload Resume</p>
                        <p className="text-xs text-muted-foreground">Add a new master resume ({3 - masterResumes.length} slots available)</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                  </UploadMasterResumeDialog>
                )}

                <Link href="/dashboard/settings" className="block">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-muted border border-border hover:bg-surface-strong transition-colors cursor-pointer">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Settings className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Account Settings</p>
                      <p className="text-xs text-muted-foreground">Manage your subscription and preferences</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Companies Applied To */}
          {uniqueCompanies.length > 0 && (
            <Card className="rounded-2xl border-border bg-surface-subtle">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                  <Building2 className="h-5 w-5 text-primary" />
                  Companies You've Targeted
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Companies you've analyzed jobs for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {uniqueCompanies.slice(0, 15).map((company, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-surface-muted border-border text-foreground/80 px-3 py-1"
                    >
                      {company}
                    </Badge>
                  ))}
                  {uniqueCompanies.length > 15 && (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 border-primary/20 text-primary px-3 py-1"
                    >
                      +{uniqueCompanies.length - 15} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Resumes Tab */}
        <TabsContent value="resumes" className="space-y-6">
          {/* Master Resumes */}
          <Card className="rounded-2xl border-border bg-surface-subtle">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                    <FileCheck className="h-5 w-5 text-primary" />
                    Master Resumes
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-1">
                    Your base resumes used for optimization ({masterResumes.length}/3)
                  </CardDescription>
                </div>
                {masterResumes.length < 3 && (
                  <UploadMasterResumeDialog currentResumeCount={masterResumes.length}>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New
                    </Button>
                  </UploadMasterResumeDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {masterResumes.length > 0 ? (
                <div className="space-y-3">
                  {masterResumes.map((resume) => (
                    <div
                      key={resume.id}
                      className="group rounded-xl bg-surface-muted border border-border p-4 transition-colors hover:bg-surface-strong"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="cursor-pointer transition-opacity hover:opacity-80 p-2 rounded-lg bg-primary/10"
                          onClick={() => handlePreview(resume)}
                        >
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingId === resume.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="w-full text-sm font-medium bg-surface-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                                disabled={isUpdating === resume.id}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(resume.id)
                                  else if (e.key === 'Escape') handleCancelEdit()
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(resume.id)}
                                  disabled={isUpdating === resume.id}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                  {isUpdating === resume.id ? "Saving..." : <><Check className="h-3 w-3 mr-1" /> Save</>}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  disabled={isUpdating === resume.id}
                                  className=""
                                >
                                  <X className="h-3 w-3 mr-1" /> Cancel
                                </Button>
                              </div>
                              {updateError?.id === resume.id && (
                                <p className="text-xs text-red-400">{updateError.message}</p>
                              )}
                            </div>
                          ) : (
                            <>
                              <h4
                                className="text-base font-medium text-foreground cursor-pointer hover:text-primary/90 transition-colors truncate"
                                onClick={() => handlePreview(resume)}
                              >
                                {resume.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {resume.file_name} • {(resume.file_size / 1024).toFixed(1)} KB
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-muted-foreground/70">
                                  Updated {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
                                </span>
                                {resume.is_primary && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                    Primary
                                  </Badge>
                                )}
                                <Badge
                                  className={`text-xs ${
                                    resume.processing_status === 'completed'
                                      ? 'bg-primary/20 text-primary border-primary/30'
                                      : resume.processing_status === 'processing'
                                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                      : resume.processing_status === 'failed'
                                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : 'bg-surface-muted text-muted-foreground border-border'
                                  }`}
                                >
                                  {resume.processing_status}
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                        {editingId !== resume.id && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handlePreview(resume)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEdit(resume.id, resume.title)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setConfirmingDeleteId(prev => prev === resume.id ? null : resume.id)
                                setDeleteError(null)
                              }}
                              disabled={isDeleting === resume.id}
                              className="h-8 w-8 text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 className={`h-4 w-4 ${isDeleting === resume.id ? 'animate-pulse' : ''}`} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {confirmingDeleteId === resume.id && (
                        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                          <p className="text-sm text-red-200">Delete "{resume.title}"? This action cannot be undone.</p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDelete(resume.id)}
                              disabled={isDeleting === resume.id}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              {isDeleting === resume.id ? "Deleting..." : "Delete"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setConfirmingDeleteId(null)
                                setDeleteError(null)
                              }}
                              className=""
                            >
                              Cancel
                            </Button>
                          </div>
                          {deleteError?.id === resume.id && (
                            <p className="mt-2 text-xs text-red-300">{deleteError.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No master resumes uploaded yet</p>
                  <UploadMasterResumeDialog currentResumeCount={0}>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Resume
                    </Button>
                  </UploadMasterResumeDialog>
                </div>
              )}

              {masterResumes.length >= 3 && (
                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-900 dark:text-amber-200 text-center">
                    You've reached the maximum of 3 master resumes. Delete an existing resume to upload a new one.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimized Resumes */}
          <Card className="rounded-2xl border-border bg-surface-subtle">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                <Sparkles className="h-5 w-5 text-primary" />
                Optimized Resumes
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Resumes tailored for specific job applications ({optimizedResumes.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizedResumes.length > 0 ? (
                <div className="space-y-3">
                  {optimizedResumes.slice(0, 10).map((resume: any) => (
                    <div
                      key={resume.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface-muted border border-border"
                    >
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {resume.job_title || 'Optimized Resume'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {resume.company_name && `${resume.company_name} • `}
                          {formatDistanceToNow(new Date(resume.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className=""
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                  {optimizedResumes.length > 10 && (
                    <Link href="/dashboard/optimized" className="block">
                      <Button variant="outline" className="w-full ">
                        View All {optimizedResumes.length} Optimized Resumes
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No optimized resumes yet</p>
                  <Link href="/dashboard">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Optimize Your First Resume
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="rounded-2xl border-border bg-surface-subtle">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                <Briefcase className="h-5 w-5 text-primary" />
                Job Analysis History
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Jobs you've analyzed for resume optimization ({jobAnalyses.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobAnalyses.length > 0 ? (
                <div className="space-y-3">
                  {jobAnalyses.slice(0, 20).map((analysis) => (
                    <div
                      key={analysis.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-surface-muted border border-border"
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 mt-0.5">
                        <Briefcase className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {analysis.job_title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              {analysis.company_name}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                            {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {analysis.location && (
                            <Badge variant="outline" className="text-xs bg-surface-strong border-border">
                              <MapPin className="h-3 w-3 mr-1" />
                              {analysis.location}
                            </Badge>
                          )}
                          {analysis.experience_level && (
                            <Badge variant="outline" className="text-xs bg-surface-strong border-border">
                              {analysis.experience_level}
                            </Badge>
                          )}
                        </div>
                        {analysis.job_url && (
                          <a
                            href={analysis.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary/90 transition-colors"
                          >
                            View Job Posting <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {jobAnalyses.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground/70 py-2">
                      Showing 20 of {jobAnalyses.length} job analyses
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No job analyses yet</p>
                  <p className="text-sm text-muted-foreground/70">
                    Start by pasting a job URL in the dashboard to analyze
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscription Info */}
            <Card className="rounded-2xl border-border bg-surface-subtle">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Subscription
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your current plan and billing status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-border">
                  <div>
                    <p className="text-2xl font-bold capitalize text-foreground">
                      {subscription?.plan || "Free"}
                    </p>
                    <Badge className={`${getStatusColor(subscription?.status || "free")} border mt-1`}>
                      {subscription?.status || "Free"}
                    </Badge>
                  </div>
                  <Link href="/dashboard/settings">
                    <Button
                      variant="outline"
                      className=""
                    >
                      {isFreeUser ? "Upgrade" : "Manage"}
                    </Button>
                  </Link>
                </div>

                {subscription?.periodEnd && (
                  <div className="p-4 rounded-xl bg-surface-muted border border-border">
                    <p className="text-sm text-muted-foreground">
                      {subscription.status === "canceled" ? "Access ends" : "Next billing date"}
                    </p>
                    <p className="text-lg font-medium text-foreground mt-1">
                      {format(new Date(subscription.periodEnd), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}

                {isFreeUser && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-primary">
                          Upgrade to Pro
                        </p>
                        <p className="text-sm text-primary/80 mt-1">
                          Get unlimited resume optimizations and advanced features.
                        </p>
                        <Link href="/pricing">
                          <Button size="sm" className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground">
                            View Plans
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card className="rounded-2xl border-border bg-surface-subtle">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2 font-space-grotesk">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Usage This Month
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track your feature usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {usageLimits ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Resume Optimizations</span>
                        <span className="font-medium text-foreground">
                          {usageLimits.resumeOptimizations?.used || 0} / {usageLimits.resumeOptimizations?.limit || '∞'}
                        </span>
                      </div>
                      <Progress
                        value={
                          usageLimits.resumeOptimizations?.limit
                            ? (usageLimits.resumeOptimizations.used / usageLimits.resumeOptimizations.limit) * 100
                            : 0
                        }
                        className="h-2 bg-surface-muted"
                      />
                    </div>

                    {usageLimits.jobAnalyses && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Job Analyses</span>
                          <span className="font-medium text-foreground">
                            {usageLimits.jobAnalyses.used} / {usageLimits.jobAnalyses.limit || '∞'}
                          </span>
                        </div>
                        <Progress
                          value={
                            usageLimits.jobAnalyses.limit
                              ? (usageLimits.jobAnalyses.used / usageLimits.jobAnalyses.limit) * 100
                              : 0
                          }
                          className="h-2 bg-surface-muted"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading usage data...</p>
                )}

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">All-Time Statistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-surface-muted">
                      <p className="text-2xl font-bold text-primary">{totalOptimizations}</p>
                      <p className="text-xs text-muted-foreground">Total Optimizations</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-surface-muted">
                      <p className="text-2xl font-bold text-blue-500">{totalJobAnalyses}</p>
                      <p className="text-xs text-muted-foreground">Jobs Analyzed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Resume Preview Dialog */}
      <MasterResumePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        resume={previewResume}
      />
    </div>
  )
}
