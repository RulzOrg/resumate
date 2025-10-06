import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { AddJobPageClient } from "@/components/jobs/add-job-page-client"

export default async function AddJobPage() {
  const user = await getAuthenticatedUser()

  if (!user?.id) {
    redirect("/login")
  }

  if (!user.onboarding_completed_at) {
    redirect("/onboarding")
  }

  return <AddJobPageClient />
}
