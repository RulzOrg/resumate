import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-utils'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export const metadata = {
  title: 'Analytics | AI Resume',
  description: 'View your resume optimization analytics and insights',
}

export default async function AnalyticsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-geist">Analytics & Insights</h1>
        <p className="text-white/60 font-geist mt-2">
          Track your resume optimization performance and discover trends
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  )
}
