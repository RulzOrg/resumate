import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { processEditCommand } from "@/lib/resume-chat-agent"
import { computeDiffs, validateOperations } from "@/lib/resume-diff"
import { chatEditToolSchema } from "@/lib/chat-edit-types"
import type { ChatEditRequest } from "@/lib/chat-edit-types"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimitResult = await rateLimit(`chat-edit:${userId}`, 15, 60000)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before trying again.", retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  const body: ChatEditRequest = await request.json()

  if (!body.command?.trim()) {
    return NextResponse.json({ error: "Command is required" }, { status: 400 })
  }
  if (!body.context?.resumeData) {
    return NextResponse.json({ error: "Resume data is required" }, { status: 400 })
  }

  const stream = processEditCommand(
    body.command,
    body.context.resumeData,
    { jobTitle: body.context.jobTitle, companyName: body.context.companyName }
  )

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let toolInputChunks = ""
      let currentBlockType: string | null = null

      try {
        for await (const event of stream) {
          // Stream text blocks incrementally (the explanation)
          if (
            event.type === "content_block_start" &&
            event.content_block.type === "text"
          ) {
            currentBlockType = "text"
          }

          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `event: text\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            )
          }

          // Accumulate tool_use JSON (structured edits)
          if (
            event.type === "content_block_start" &&
            event.content_block.type === "tool_use"
          ) {
            currentBlockType = "tool_use"
            toolInputChunks = ""
          }

          if (
            event.type === "content_block_delta" &&
            event.delta.type === "input_json_delta"
          ) {
            toolInputChunks += event.delta.partial_json
          }

          // When tool block completes, parse and validate
          if (event.type === "content_block_stop" && currentBlockType === "tool_use") {
            try {
              const parsed = chatEditToolSchema.parse(JSON.parse(toolInputChunks))
              const validation = validateOperations(body.context.resumeData, parsed.operations)

              if (!validation.valid) {
                controller.enqueue(
                  encoder.encode(
                    `event: error\ndata: ${JSON.stringify({ message: `Invalid edit operations: ${validation.errors.join("; ")}` })}\n\n`
                  )
                )
              } else {
                const diffs = computeDiffs(body.context.resumeData, parsed.operations)
                controller.enqueue(
                  encoder.encode(
                    `event: edit_result\ndata: ${JSON.stringify({
                      operations: parsed.operations,
                      diffs,
                      explanation: parsed.explanation,
                      confidence: parsed.confidence,
                    })}\n\n`
                  )
                )
              }
            } catch {
              controller.enqueue(
                encoder.encode(
                  `event: error\ndata: ${JSON.stringify({ message: "Failed to parse edit operations from the AI response. Try rephrasing your command." })}\n\n`
                )
              )
            }
            currentBlockType = null
          }

          if (event.type === "content_block_stop" && currentBlockType === "text") {
            currentBlockType = null
          }
        }

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred"
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message })}\n\n`
          )
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
