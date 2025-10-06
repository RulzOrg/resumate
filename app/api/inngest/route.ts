/**
 * Inngest webhook endpoint
 * Handles background job execution for resume processing
 */

import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { processResumeJob } from "@/lib/inngest/functions/process-resume"
import { 
  emailVerificationCleanup, 
  emailVerificationCleanupManual 
} from "@/lib/inngest/functions/email-verification-cleanup"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processResumeJob,
    emailVerificationCleanup,
    emailVerificationCleanupManual,
  ],
})
