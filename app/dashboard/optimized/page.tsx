import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getUserById, getUserOptimizedResumes } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { OptimizedResumeList } from "@/components/optimization/optimized-resume-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Plus, TrendingUp, FileText, Target } from "lucide-react"
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
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Optimized Resumes</h1>
          <p className="text-muted-foreground">
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
              <Link href="/dashboard/optimize">
                <Zap className="w-5 h-5 mr-2" />
                Create Optimized Resume
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Optimized Resumes</h2>
              <Button asChild>
                <Link href="/dashboard/optimize">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Link>
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="w-5 h-5 mr-2 text-primary" />
                    Total Optimized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{optimizedResumes.length}</div>
                  <p className="text-sm text-muted-foreground">Resume versions created</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <TrendingUp className="w-5 h-5 mr-2 text-accent" />
                    Avg Match Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">
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
                  <p className="text-sm text-muted-foreground">Job match accuracy</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Target className="w-5 h-5 mr-2 text-chart-2" />
                    Jobs Targeted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-2">
                    {new Set(optimizedResumes.map((r) => r.job_analysis_id)).size}
                  </div>
                  <p className="text-sm text-muted-foreground">Unique positions</p>
                </CardContent>
              </Card>
            </div>

            <OptimizedResumeList optimizedResumes={optimizedResumes} />
          </div>
        )}
      </main>
    </div>
  )
}
