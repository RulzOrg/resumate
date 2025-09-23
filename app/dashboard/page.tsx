import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getUserResumes, getUserJobAnalyses, getUserOptimizedResumes } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { UploadResumeDialog } from "@/components/dashboard/upload-resume-dialog"
import { AnalyzeJobDialog } from "@/components/jobs/analyze-job-dialog"
import { FileText, Download, Plus, Briefcase, RefreshCw, FileCheck, User } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()
  const resumes = await getUserResumes(user.id)
  const jobAnalyses = await getUserJobAnalyses(user.id)
  const optimizedResumes = await getUserOptimizedResumes(user.id)

  const totalGenerations = optimizedResumes.length
  const maxGenerations = user.subscription_plan === "pro" ? 50 : 5
  const usagePercentage = (totalGenerations / maxGenerations) * 100

  // Get the primary resume for the master resume section
  const primaryResume = resumes.find((r) => r.is_primary) || resumes[0]

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
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full ring-2 ring-white/10 bg-emerald-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                </div>
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
                  <AnalyzeJobDialog>
                    <Button className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 rounded-full py-2 px-4 hover:bg-white/20 transition-colors self-start sm:self-center">
                      <Plus className="h-4 w-4" />
                      Add Job
                    </Button>
                  </AnalyzeJobDialog>
                </div>
                <div className="space-y-4">
                  {jobAnalyses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/60 mb-4">No job analyses yet. Start by analyzing job postings.</p>
                      <AnalyzeJobDialog>
                        <Button variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                          Analyze Your First Job
                        </Button>
                      </AnalyzeJobDialog>
                    </div>
                  ) : (
                    jobAnalyses.slice(0, 2).map((job) => (
                      <div
                        key={job.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white/5">
                            <Briefcase className="h-5 w-5 text-white/70" />
                          </div>
                          <div>
                            <p className="font-medium">{job.job_title}</p>
                            <p className="text-sm text-white/60">{job.company_name || "Company"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <Link
                            href={`/dashboard/jobs`}
                            className="text-xs font-medium text-white/70 hover:text-white transition"
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/optimize`}
                            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
                          >
                            Generate
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
                <h2 className="text-xl font-medium tracking-tight font-space-grotesk mb-6">Generated Resumes</h2>
                <div className="divide-y divide-white/10">
                  {optimizedResumes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/60 mb-4">No optimized resumes yet. Generate your first one!</p>
                      <Link href="/dashboard/optimize">
                        <Button variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                          Optimize Resume
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    optimizedResumes.slice(0, 3).map((resume) => (
                      <div key={resume.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white/5">
                            <FileText className="h-5 w-5 text-white/70" />
                          </div>
                          <div>
                            <p className="font-medium">Resume for {resume.company_name || resume.job_title}</p>
                            <p className="text-sm text-white/60">
                              Generated{" "}
                              {new Date(resume.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 self-start sm:self-center">
                          <div className="text-center">
                            <p className="font-medium text-emerald-400">{resume.match_score || 88}%</p>
                            <p className="text-xs text-white/60">Match</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8 mt-8 lg:mt-0">
              {/* Account Status */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-base font-medium text-white/90">Account Status</h3>
                <p className="text-sm text-white/60 mt-1">
                  {user.subscription_plan === "pro" ? "Pro Plan" : "Free Plan"}
                </p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>Generations Used</span>
                    <span>
                      {totalGenerations} of {maxGenerations}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <Link href="/pricing">
                  <button className="mt-4 w-full text-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition">
                    {user.subscription_plan === "pro" ? "Manage Plan" : "Upgrade Plan"}
                  </button>
                </Link>
              </div>

              {/* Master Resume */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-base font-medium text-white/90 mb-4">Master Resume</h3>
                {primaryResume ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <FileCheck className="h-5 w-5 text-white/70 flex-shrink-0" />
                    <p className="text-sm font-medium truncate flex-1">{primaryResume.file_name}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-white/60 mb-3">No resume uploaded yet</p>
                  </div>
                )}
                <UploadResumeDialog>
                  <button className="mt-4 w-full text-center text-sm font-medium text-white/80 hover:text-white transition bg-white/10 rounded-full py-2">
                    {primaryResume ? "Update Resume" : "Upload Resume"}
                  </button>
                </UploadResumeDialog>
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
