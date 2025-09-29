import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getUserById, getUserResumes, getUserJobAnalyses } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import OptimizerUiOnly from "@/components/optimization/optimizer-ui-only"

type SearchParams = { [key: string]: string | string[] | undefined }

function getParamValue(param?: string | string[]): string | undefined {
  if (!param) return undefined
  if (Array.isArray(param)) return param[0]
  return param
}

export default async function OptimizePage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const session = await getSession()
  if (!session) {
    redirect("/auth/login")
  }

  const user = await getUserById(session.userId)
  if (!user) {
    redirect("/auth/login")
  }

  const [resumes, jobAnalyses] = await Promise.all([
    getUserResumes(user.id).catch(() => []),
    getUserJobAnalyses(user.id).catch(() => []),
  ])

  const masterResumes = resumes.filter((resume) =>
    resume.kind === "master" || resume.kind === "uploaded"
  )

  const resumeOptions = masterResumes.map((resume) => {
    const rawFileSize =
      typeof resume.file_size === "number"
        ? resume.file_size
        : resume.file_size != null
          ? Number(resume.file_size)
          : undefined

    return {
      id: resume.id,
      label: resume.title || resume.file_name || "Untitled resume",
      fileName: resume.file_name || undefined,
      updatedAt: resume.updated_at || undefined,
      fileType: resume.file_type || undefined,
      fileSize: Number.isFinite(rawFileSize) ? rawFileSize : undefined,
      isPrimary: resume.is_primary,
    }
  })

  const jobOptions = jobAnalyses.map((analysis) => ({
    id: analysis.id,
    jobTitle: analysis.job_title,
    companyName: analysis.company_name || undefined,
    jobDescription: analysis.job_description,
    keywords: Array.isArray(analysis.keywords) && analysis.keywords.length > 0
      ? analysis.keywords
      : Array.isArray(analysis.analysis_result?.keywords)
        ? analysis.analysis_result.keywords
        : [],
    requiredSkills: Array.isArray(analysis.required_skills) && analysis.required_skills.length > 0
      ? analysis.required_skills
      : Array.isArray(analysis.analysis_result?.required_skills)
        ? analysis.analysis_result.required_skills
        : [],
    niceToHave: Array.isArray(analysis.analysis_result?.nice_to_have)
      ? analysis.analysis_result.nice_to_have
      : [],
    location: analysis.location || analysis.analysis_result?.location || undefined,
    experienceLevel: analysis.experience_level || analysis.analysis_result?.experience_level || undefined,
    category: (analysis.analysis_result as any)?.category || undefined,
    matchScore: analysis.analysis_result?.match_score,
  }))

  const resumeIdParam = getParamValue(searchParams?.resumeId)
  const jobIdParam = getParamValue(searchParams?.jobId)

  const initialResume = resumeOptions.find((r) => r.id === resumeIdParam)
    || resumeOptions.find((r) => r.isPrimary)
    || resumeOptions[0]
    || null

  const initialJob = jobOptions.find((job) => job.id === jobIdParam)
    || jobOptions[0]
    || null

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="py-8">
        <OptimizerUiOnly
          resumes={resumeOptions}
          initialResume={initialResume}
          jobOptions={jobOptions}
          initialJob={initialJob}
        />
      </main>
    </div>
  )
}
