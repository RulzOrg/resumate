import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getUserById, getUserResumes, getUserJobAnalyses } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { OptimizationWizard } from "@/components/optimization/optimization-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, FileText, Target, TrendingUp } from "lucide-react"

export default async function OptimizePage() {
  const session = await getSession()
  if (!session) {
    redirect("/auth/login")
  }

  const user = await getUserById(session.userId)
  if (!user) {
    redirect("/auth/login")
  }

  const resumes = await getUserResumes(user.id)
  const jobAnalyses = await getUserJobAnalyses(user.id)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Resume Optimization</h1>
          <p className="text-muted-foreground">
            Create tailored resume versions optimized for specific job postings using AI.
          </p>
        </div>

        {resumes.length === 0 || jobAnalyses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Ready to optimize?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {resumes.length === 0
                ? "You need to upload at least one resume before you can optimize it."
                : "You need to analyze at least one job posting before you can optimize your resume."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {resumes.length === 0 && (
                <Card className="p-6 text-center">
                  <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Upload Resume</h3>
                  <p className="text-sm text-muted-foreground mb-4">Upload your resume to get started</p>
                  <a href="/dashboard" className="text-primary hover:underline">
                    Go to Dashboard
                  </a>
                </Card>
              )}
              {jobAnalyses.length === 0 && (
                <Card className="p-6 text-center">
                  <Target className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Analyze Jobs</h3>
                  <p className="text-sm text-muted-foreground mb-4">Analyze job postings to understand requirements</p>
                  <a href="/dashboard/jobs" className="text-primary hover:underline">
                    Analyze Jobs
                  </a>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="w-5 h-5 mr-2 text-primary" />
                    Available Resumes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{resumes.length}</div>
                  <p className="text-sm text-muted-foreground">Ready for optimization</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Target className="w-5 h-5 mr-2 text-accent" />
                    Job Analyses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">{jobAnalyses.length}</div>
                  <p className="text-sm text-muted-foreground">Jobs analyzed</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <TrendingUp className="w-5 h-5 mr-2 text-chart-2" />
                    Optimization Ready
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-2">{resumes.length * jobAnalyses.length}</div>
                  <p className="text-sm text-muted-foreground">Possible combinations</p>
                </CardContent>
              </Card>
            </div>

            <OptimizationWizard resumes={resumes} jobAnalyses={jobAnalyses} />
          </div>
        )}
      </main>
    </div>
  )
}
