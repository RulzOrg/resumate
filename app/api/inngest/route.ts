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

// Ensure signing key is present in production
if (process.env.NODE_ENV === 'production' && !process.env.INNGEST_SIGNING_KEY) {
  throw new Error('INNGEST_SIGNING_KEY is required in production')
}

// Suppress Inngest dev server body parsing errors in development
const handler = serve({
  client: inngest,
  functions: [processResumeJob],
  streaming: false,
  // Only enable signing in production to avoid body parsing errors in dev
  ...(process.env.NODE_ENV === 'production' && process.env.INNGEST_SIGNING_KEY
    ? { signingKey: process.env.INNGEST_SIGNING_KEY }
    : {}),
})

export const { GET, POST, PUT } = handler
