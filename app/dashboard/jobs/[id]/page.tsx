import Link from "next/link"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getJobAnalysisById } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink, Zap } from "lucide-react"

export default async function JobViewPage({ params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  const analysis = await getJobAnalysisById(params.id, user.id)

  if (!analysis) return notFound()

  const analysisData = analysis.analysis_result

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{analysis.job_title}</h1>
          {analysis.company_name && (
            <p className="mt-1 text-lg text-muted-foreground">at {analysis.company_name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
          {/* Job Description */}
          <Card className="lg:col-span-2 border-border/50 bg-card/50">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight mb-6">Job Description</h2>
              <div className="prose prose-invert max-w-none text-muted-foreground">
                {/* Render as pre-wrapped text to preserve formatting */}
                <pre className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{analysis.job_description}</pre>
              </div>
              {analysis.job_url && (
                <div className="mt-6">
                  <Button asChild variant="outline">
                    <a href={analysis.job_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> View Original Posting
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis & Actions */}
          <div className="space-y-8 mt-8 lg:mt-0">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Ready to Apply?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Generate a resume tailored for this role.</p>
                </div>
                <Link
                  href="/dashboard/optimize"
                  className="inline-flex gap-2 hover:bg-emerald-400 transition-colors text-base font-medium text-black bg-emerald-500 w-full rounded-full pt-3 pr-4 pb-3 pl-4 items-center justify-center"
                >
                  <Zap className="h-5 w-5" />
                  Generate Resume
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <h3 className="text-base font-medium mb-4">AI Analysis</h3>

                <div className="space-y-6">
                  {/* Keywords */}
                  {analysisData.keywords?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Keywords Identified</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisData.keywords.slice(0, 15).map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {analysisData.keywords.length > 15 && (
                          <Badge variant="secondary" className="text-xs">+{analysisData.keywords.length - 15} more</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border/50" />

                  {/* Skills & Experience */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Skills & Experience</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {analysisData.experience_level && (
                        <li className="flex items-start gap-2">
                          <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>Experience Level: {analysisData.experience_level}</span>
                        </li>
                      )}
                      {analysisData.required_skills?.slice(0, 3)?.map((skill, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>Required: {skill}</span>
                        </li>
                      ))}
                      {analysisData.location && (
                        <li className="flex items-start gap-2">
                          <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>Location: {analysisData.location}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}


