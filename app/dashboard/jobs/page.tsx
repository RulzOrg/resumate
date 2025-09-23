import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getUserJobAnalyses } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { JobAnalysisList } from "@/components/jobs/job-analysis-list"
import { AnalyzeJobDialog } from "@/components/jobs/analyze-job-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Plus, TrendingUp, Search } from "lucide-react"

export default async function JobsPage() {
  const user = await getAuthenticatedUser()

  const jobAnalyses = await getUserJobAnalyses(user.id)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Job Analysis</h1>
          <p className="text-muted-foreground">
            Analyze job postings to understand requirements and optimize your resume accordingly.
          </p>
        </div>

        {jobAnalyses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">No job analyses yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start by analyzing job postings to understand what employers are looking for and optimize your resume.
            </p>
            <AnalyzeJobDialog>
              <Button size="lg">
                <Search className="w-5 h-5 mr-2" />
                Analyze Your First Job
              </Button>
            </AnalyzeJobDialog>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Job Analyses</h2>
              <AnalyzeJobDialog>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Analyze Job
                </Button>
              </AnalyzeJobDialog>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Target className="w-5 h-5 mr-2 text-primary" />
                    Total Analyzed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{jobAnalyses.length}</div>
                  <p className="text-sm text-muted-foreground">Job postings analyzed</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <TrendingUp className="w-5 h-5 mr-2 text-accent" />
                    Top Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">
                    {Array.from(new Set(jobAnalyses.flatMap((j) => j.required_skills))).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Unique skills identified</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Search className="w-5 h-5 mr-2 text-chart-2" />
                    Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-2">
                    {Array.from(new Set(jobAnalyses.flatMap((j) => j.keywords))).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Keywords discovered</p>
                </CardContent>
              </Card>
            </div>

            <JobAnalysisList analyses={jobAnalyses} />
          </div>
        )}
      </main>
    </div>
  )
}
