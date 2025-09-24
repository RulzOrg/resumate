import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getUserResumes, getUserJobAnalyses, getUserOptimizedResumes, getMasterResume } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { UploadResumeDialog } from "@/components/dashboard/upload-resume-dialog"
import { UploadMasterResumeDialog } from "@/components/dashboard/master-resume-dialog"
import { FileText, Download, Plus, RefreshCw, FileCheck } from "lucide-react"
import { TargetJobsEmptyState } from "@/components/dashboard/TargetJobsEmptyState"
import { AnalyzeJobDialog } from "@/components/jobs/analyze-job-dialog"
import { TargetJobsCompactList } from "@/components/dashboard/TargetJobsCompactList"
import { GeneratedResumesCompactList } from "@/components/optimization/GeneratedResumesCompactList"
import Link from "next/link"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { AccountStatusCard } from "@/components/dashboard/AccountStatusCard"
import { formatDistanceToNow } from "date-fns"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const user = await getAuthenticatedUser()
  const resumes = await getUserResumes(user.id)
  const jobAnalyses = await getUserJobAnalyses(user.id)
  const optimizedResumes = await getUserOptimizedResumes(user.id)
  const masterResume = await getMasterResume(user.id)

  const isDemo = (searchParams?.demo as string) === "1"
  const pageParam = parseInt((searchParams?.page as string) || "1", 10)
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
  const perPage = 5

  const demoJobAnalyses = [
    { id: "d1", job_title: "Senior Product Manager", company_name: "Vercel" },
    { id: "d2", job_title: "Frontend Engineer", company_name: "Stripe" },
  ] as any
  // Pagination state computed after demo arrays are defined
  const demos = isDemo ? demoJobAnalyses : jobAnalyses
  const allAnalyses = demos
  const totalAnalyses = allAnalyses.length
  const totalPages = Math.max(1, Math.ceil(totalAnalyses / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * perPage
  const paginatedAnalyses = allAnalyses.slice(start, start + perPage)

  const demoOptimized = [
    { id: "o1", title: "Linear", created_at: new Date().toISOString(), match_score: 92 },
    { id: "o2", title: "OpenAI", created_at: new Date().toISOString(), match_score: 88 },
  ] as any

  const totalGenerations = optimizedResumes.length
  const maxGenerations = user.subscription_plan === "pro" ? 50 : 5
  const usagePercentage = (totalGenerations / maxGenerations) * 100
  const isBrandNew = jobAnalyses.length === 0 && optimizedResumes.length === 0

  return (
    <div className="antialiased text-white bg-black font-geist min-h-screen">
      <div
        className="absolute top-0 left-0 w-full h-[400px] -z-10"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%,rgba(120,119,198,0.2),hsla(0,0%,100%,0))" }}
      ></div>

      <header className="sticky top-0 z-30 bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="inline-flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                  <RefreshCw className="h-4 w-4" />
                </span>
                <span className="text-base font-medium tracking-tighter">ResuMate AI</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <UploadResumeDialog>
                <Button className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full py-2 px-4 hover:bg-emerald-400 transition-colors">
                  <Plus className="h-4 w-4" />
                  New Generation
                </Button>
              </UploadResumeDialog>
              <div className="relative">
                <UserAvatar />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">Dashboard</h1>
            <p className="mt-1 text-base text-white/60">Welcome back, {user.name}. Let's land your next job.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                  <h2 className="text-xl font-medium tracking-tight font-space-grotesk">Target Jobs</h2>
                  <AnalyzeJobDialog existingAnalyses={jobAnalyses}>
                    <Button className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-4 hover:bg-white/20 transition-colors self-start sm:self-center">
                      <Plus className="h-4 w-4" />
                      Add Job
                    </Button>
                  </AnalyzeJobDialog>
                </div>
                {demos.length === 0 ? (
                  <div className="space-y-4">
                    <TargetJobsEmptyState existingAnalyses={jobAnalyses} />
                  </div>
                ) : (
                  <>
                    <TargetJobsCompactList analyses={paginatedAnalyses} limit={perPage} />
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between text-sm text-white/70">
                        <span>
                          Showing {Math.min(totalAnalyses === 0 ? 0 : start + 1, totalAnalyses)}–
                          {Math.min(start + perPage, totalAnalyses)} of {totalAnalyses}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard?${new URLSearchParams({ page: String(Math.max(1, safePage - 1)), ...(isDemo ? { demo: '1' } : {}) }).toString()}`}
                            className={`px-3 py-1 rounded border border-white/10 hover:bg-white/10 transition ${safePage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            Prev
                          </Link>
                          <span className="opacity-70">Page {safePage} / {totalPages}</span>
                          <Link
                            href={`/dashboard?${new URLSearchParams({ page: String(Math.min(totalPages, safePage + 1)), ...(isDemo ? { demo: '1' } : {}) }).toString()}`}
                            className={`px-3 py-1 rounded border border-white/10 hover:bg-white/10 transition ${safePage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            Next
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {(isDemo || optimizedResumes.length > 0) && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
                  <h2 className="text-xl font-medium tracking-tight font-space-grotesk mb-6">Generated Resumes</h2>
                  <GeneratedResumesCompactList resumes={isDemo ? demoOptimized : optimizedResumes} limit={3} />
                </div>
              )}
            </div>

            <div className="space-y-8 mt-8 lg:mt-0">
              {/* Account Status */}
              <AccountStatusCard
                plan={user.subscription_plan}
                status={user.subscription_status}
                periodEnd={(user as any).subscription_period_end}
                totalGenerations={totalGenerations}
                maxGenerations={maxGenerations}
              />

              {/* Master Resume */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-base font-medium text-white/90 mb-4">Master Resume</h3>
                {masterResume ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <FileCheck className="h-5 w-5 text-white/70 flex-shrink-0" />
                    <div className="flex flex-col gap-0.5 text-left">
                      <p className="text-sm font-medium truncate text-white/90">{masterResume.file_name}</p>
                      <p className="text-xs text-white/50">
                        {masterResume.processing_status === "completed"
                          ? `Last updated ${formatDistanceToNow(new Date(masterResume.updated_at), { addSuffix: true })}`
                          : masterResume.processing_status === "processing"
                          ? "Processing... this usually takes under a minute"
                          : masterResume.processing_status === "failed"
                          ? "Latest processing attempt failed"
                          : "Ready"}
                      </p>
                      {masterResume.processing_error && (
                        <p className="text-xs text-red-400">{masterResume.processing_error}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-center gap-3 p-4 rounded-lg bg-white/5 border border-dashed border-white/20">
                    <p className="text-sm text-white/60">Upload your master resume to get started.</p>
                  </div>
                )}
                <UploadMasterResumeDialog>
                  <button className="mt-4 w-full text-center text-sm font-medium text-white/80 hover:text-white transition bg-white/10 rounded-full py-2">
                    {masterResume ? "Replace Master Resume" : "Upload Master Resume"}
                  </button>
                </UploadMasterResumeDialog>
              </div>

              {/* Cover Letter CTA */}
              <div className="rounded-2xl border border-dashed border-white/20 bg-transparent p-6 text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-white/5 mb-2">
                  <FileText className="h-6 w-6 text-white/80" />
                </div>
                <h3 className="text-base font-medium text-white/90">Need a Cover Letter?</h3>
                <p className="text-sm text-white/60 mt-1 mb-4">Generate a tailored cover letter in seconds.</p>
                <Button className="w-full text-center text-sm font-medium text-black bg-emerald-500 rounded-full py-2 hover:bg-emerald-400 transition">
                  Generate Letter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/50">© {new Date().getFullYear()} ResuMate AI</p>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/settings" className="text-sm text-white/60 hover:text-white">
                Settings
              </Link>
              <Link href="/support" className="text-sm text-white/60 hover:text-white">
                Support
              </Link>
              <Link href="/auth/logout" className="text-sm text-white/60 hover:text-white">
                Logout
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
