import { test } from "node:test"
import assert from "node:assert/strict"
import { z } from "zod"
import { fromError } from "@/lib/api-response"

test("fromError serializes ZodError as VALIDATION_ERROR", async () => {
  let captured: unknown
  try {
    z.object({ contact: z.object({ location: z.string() }) }).parse({
      contact: { location: null },
    })
  } catch (error) {
    captured = error
  }

  const response = fromError(captured)
  assert.equal(response.status, 400)

  const body = (await response.json()) as {
    code: string
    message: string
    error: string
    retryable: boolean
    details?: unknown
  }

  assert.equal(body.code, "VALIDATION_ERROR")
  assert.equal(body.retryable, false)
  assert.ok(Array.isArray(body.details))
})
