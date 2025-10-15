/**
 * Inngest webhook endpoint
 * Handles background job execution for resume processing
 */

import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { processResumeJob } from "@/lib/inngest/functions/process-resume"

// Configure route to handle larger payloads
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Suppress Inngest dev server body parsing errors
const handler = serve({
  client: inngest,
  functions: [processResumeJob],
  streaming: false,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // Custom body handler to prevent double-parsing
  landingPage: process.env.NODE_ENV === 'development',
})

export const { GET, POST, PUT } = handler
