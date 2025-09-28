import OptimizerUiOnly from "@/components/optimization/optimizer-ui-only"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default function E2EOptimizerPage() {
  if (process.env.E2E_TEST_MODE !== "1") {
    return notFound()
  }
  return (
    <div className="min-h-screen bg-background p-6">
      <OptimizerUiOnly />
    </div>
  )
}
