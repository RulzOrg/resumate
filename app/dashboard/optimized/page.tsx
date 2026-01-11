import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getUserById, getUserOptimizedResumes } from "@/lib/db"
import { OptimizedResumeList } from "@/components/optimization/optimized-resume-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Plus, TrendingUp, FileText, Target, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function OptimizedResumesPage() {
  const session = await getSession()
  if (!session) {
    redirect("/auth/login")
  }

  const user = await getUserById(session.userId)
  if (!user) {
    redirect("/auth/login")
  }

  const optimizedResumes = await getUserOptimizedResumes(user.id)

  return (
    <main className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl tracking-tight font-space-grotesk font-semibold">Optimized Resumes</h1>
          <p className="mt-1 text-base text-foreground/60 dark:text-white/60">
            View and manage your AI-optimized resume versions tailored for specific job applications.
          </p>
        </div>

        {optimizedResumes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">No optimized resumes yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first AI-optimized resume by selecting a resume and job analysis to tailor it for specific
              positions.
            </p>
            <Button size="lg" asChild>
              <Link href="/dashboard">
                <Zap className="w-5 h-5 mr-2" />
                Create Optimized Resume
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-medium tracking-tight font-space-grotesk">Your Optimized Resumes</h2>
              <Button asChild>
                <Link href="/dashboard">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Link>
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="rounded-2xl border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-space-grotesk text-foreground dark:text-white">
                    <FileText className="w-5 h-5 mr-2 text-emerald-500" />
                    Total Optimized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-500">{optimizedResumes.length}</div>
                  <p className="text-sm text-foreground/60 dark:text-white/60">Resume versions created</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-space-grotesk text-foreground dark:text-white">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                    Avg Match Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">
                    {optimizedResumes.length > 0
                      ? Math.round(
                          optimizedResumes
                            .filter((r) => r.match_score)
                            .reduce((sum, r) => sum + (r.match_score || 0), 0) /
                            optimizedResumes.filter((r) => r.match_score).length,
                        )
                      : 0}
                    %
                  </div>
                  <p className="text-sm text-foreground/60 dark:text-white/60">Job match accuracy</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border dark:border-white/20 bg-surface-subtle dark:bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-space-grotesk text-foreground dark:text-white">
                    <Target className="w-5 h-5 mr-2 text-purple-500" />
                    Jobs Targeted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-500">
                    {new Set(optimizedResumes.map((r) => r.job_analysis_id)).size}
                  </div>
                  <p className="text-sm text-foreground/60 dark:text-white/60">Unique positions</p>
                </CardContent>
              </Card>
            </div>

            <OptimizedResumeList optimizedResumes={optimizedResumes} />
          </div>
        )}
      </div>
    </main>
  )
}
