/**
 * Inngest client configuration for background job processing
 * Used for async resume processing to improve UX
 */

import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "ai-resume",
  name: "AI Resume Optimizer",
  // Event key for development - in production, use Inngest Cloud
  eventKey: process.env.INNGEST_EVENT_KEY,
})
