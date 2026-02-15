import { test } from "node:test"
import assert from "node:assert/strict"
import { buildApiErrorMessage, parseApiResponse } from "@/lib/quick-optimize-api"

test("buildApiErrorMessage maps structured validation path to user-friendly copy", () => {
  const message = buildApiErrorMessage(
    {
      details: [
        {
          path: ["workExperience", 0, "location"],
          message: "Expected string, received null",
        },
      ],
    },
    "",
    "Fallback",
    true
  )

  assert.equal(
    message,
    "One work experience item has an invalid location. Please review and try again."
  )
})

test("buildApiErrorMessage returns friendly message for HTML response bodies", () => {
  const message = buildApiErrorMessage(
    null,
    "<!DOCTYPE html><html><body>Error</body></html>",
    "Fallback",
    true
  )

  assert.equal(
    message,
    "Optimization failed. Please retry. If it persists, refresh and try again."
  )
})

test("parseApiResponse safely parses JSON and non-JSON responses", async () => {
  const jsonResponse = new Response(JSON.stringify({ code: "X" }), {
    status: 400,
    headers: { "content-type": "application/json" },
  })

  const parsedJson = await parseApiResponse(jsonResponse)
  assert.equal(parsedJson.data?.code, "X")

  const htmlResponse = new Response("<!DOCTYPE html><html></html>", {
    status: 500,
    headers: { "content-type": "text/html" },
  })

  const parsedHtml = await parseApiResponse(htmlResponse)
  assert.equal(parsedHtml.data, null)
  assert.match(parsedHtml.rawText, /DOCTYPE/) 
})
