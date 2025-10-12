import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { getOptimizedResumeById, getResumeById, updateOptimizedResumeV2 } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { OptimizedDetailView } from "@/components/optimization/OptimizedDetailView"
import { ResumeEditorV2 } from "@/components/optimization/resume-editor-v2"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import type { SystemPromptV1Output } from "@/lib/schemas-v2"

// Type for optimized resume with structured output
type OptimizedResumeWithStructuredOutput = Awaited<ReturnType<typeof getOptimizedResumeById>> & {
  structured_output?: Record<string, unknown> | null
}

// Disable caching to ensure fresh data on every page load
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OptimizedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/auth/login")

  const { id } = await params
  
  let optimized
  let original
  
  try {
    optimized = await getOptimizedResumeById(id, user.id)
    
    if (!optimized) {
      console.error(`[Resume Editor] Optimized resume not found: ${id}`)
      redirect("/dashboard/optimized")
    }
    
    console.log(`[Resume Editor] Successfully loaded resume: ${id}`)
    
    original = await getResumeById(optimized.original_resume_id, user.id)
  } catch (error) {
    console.error(`[Resume Editor] Error loading resume:`, error)
    redirect("/dashboard/optimized")
  }

  // Check if this is a v2 optimized resume with structured output
  const optimizedWithStructured = optimized as OptimizedResumeWithStructuredOutput
  const structuredOutput = optimizedWithStructured.structured_output
  const hasStructuredOutput = structuredOutput !== undefined && 
                               structuredOutput !== null &&
                               typeof structuredOutput === 'object' && 
                               !Array.isArray(structuredOutput)
  
  console.log('[Resume Editor] Has structured_output:', !!structuredOutput)
  console.log('[Resume Editor] Structured output type:', typeof structuredOutput)
  console.log('[Resume Editor] Will show V2 editor:', hasStructuredOutput)

  async function saveOptimizedResume(
    resumeId: string,
    ownerId: string,
    fallbackContent: string,
    updates: Partial<SystemPromptV1Output>
  ) {
    "use server"

    if (!updates) return

    console.log('[Server Action] Saving resume:', resumeId)

    const optimizedContent = updates.tailored_resume_text?.ats_plain_text || fallbackContent

    const updated = await updateOptimizedResumeV2(resumeId, ownerId, {
      structured_output: updates as SystemPromptV1Output,
      optimized_content: optimizedContent,
    })

    console.log('[Server Action] Save result:', updated ? 'Success' : 'Failed')

    // Revalidate the page to ensure fresh data on next load
    revalidatePath(`/dashboard/optimized/${resumeId}`)
    
    return updated
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user as any} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasStructuredOutput ? (
          // Use new V2 editor with structured output
          <ResumeEditorV2
            optimizedId={optimized.id}
            structuredOutput={structuredOutput}
            jobTitle={optimized.job_title || "Target Role"}
            companyName={optimized.company_name}
          />
        ) : (
          // Fallback to V1 view for legacy resumes
          <>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  This resume was generated with the legacy optimizer. 
                  For the best editing experience with form-based controls, re-optimize using the new system.
                </span>
                <Button 
                  asChild 
                  size="sm" 
                  className="ml-4 shrink-0"
                >
                  <Link href={`/dashboard/optimize?resumeId=${optimized.original_resume_id}&jobId=${optimized.job_analysis_id}`}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-optimize with v2
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Optimized Resume</h1>
              <p className="text-muted-foreground text-sm">
                For {optimized.job_title}{optimized.company_name ? ` at ${optimized.company_name}` : ''}
              </p>
            </div>
            <OptimizedDetailView
              optimizedId={optimized.id}
              title={optimized.title}
              optimizedContent={optimized.optimized_content}
              originalContent={original?.content_text || ''}
              matchScore={optimized.match_score}
            />
          </>
        )}
      </main>
    </div>
  )
}
