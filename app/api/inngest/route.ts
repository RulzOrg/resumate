/**
 * Inngest webhook endpoint
 * Handles background job execution for resume processing
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { processResumeJob } from "@/lib/inngest/functions/process-resume"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processResumeJob],
})
