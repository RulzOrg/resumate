/**
 * Background job for processing uploaded resumes
 * Runs asynchronously to avoid blocking user during long extraction operations
 */

import { inngest } from "../client"
import { primaryExtract, fallbackExtract } from "@/lib/extract"
import type { ExtractResult } from "@/lib/llamaparse"
import { getSignedDownloadUrl } from "@/lib/storage"
import { updateResumeAnalysis } from "@/lib/db"
import { openai } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import { z } from "zod"

// Structured resume schema (simplified from master upload)
const StructuredResumeSchema = z.object({
  personal_info: z
    .object({
      full_name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
  summary: z.string().optional(),
  experience: z
    .array(
      z.object({
        job_title: z.string().optional(),
        company: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        highlights: z.array(z.string()).optional(),
      })
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string().optional(),
        degree: z.string().optional(),
      })
    )
    .optional(),
  skills: z
    .object({
      technical: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
    })
    .optional(),
})

export const processResumeJob = inngest.createFunction(
  {
    id: "process-resume",
    name: "Process Resume Upload",
    retries: 2, // Retry up to 2 times on failure
    concurrency: {
      limit: 5, // Process max 5 resumes concurrently
    },
  },
  { event: "resume/uploaded" },
  async ({ event, step }) => {
    const { resumeId, userId, fileKey, fileType, fileSize } = event.data

    console.log("[Inngest] Starting resume processing:", {
      resumeId: resumeId.substring(0, 8),
      userId: userId.substring(0, 8),
      fileType,
      fileSize,
    })

    // Step 1: Update status to processing
    await step.run("update-status-processing", async () => {
      await updateResumeAnalysis(resumeId, userId, {
        processing_status: "processing",
        processing_error: null,
      })
      console.log("[Inngest] Status updated to processing")
    })

    // Step 2: Extract content (with generous timeout)
    const extractResult: ExtractResult = await step.run(
      "extract-content",
      async (): Promise<ExtractResult> => {
        // Get file from storage
        const fileUrl = await getSignedDownloadUrl(fileKey, 3600)
        const fileResponse = await fetch(fileUrl)
        const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())

        console.log("[Inngest] Starting content extraction")

        // Try text file direct read
        if (fileType === "text/plain") {
          const text = fileBuffer.toString("utf-8")
          return {
            text,
            total_chars: text.length,
            page_count: 1,
            warnings: [],
            mode_used: "text_file",
            truncated: false,
            coverage: 1,
          }
        }

        // Use LlamaParse for text extraction
        console.log("[Inngest] Using LlamaParse for extraction")
        
        let extractResult: ExtractResult = await primaryExtract(fileBuffer, fileType, userId)
        
        console.log("[Inngest] primaryExtract returned:", {
          chars: extractResult.total_chars,
          mode: extractResult.mode_used,
          hasError: !!extractResult.error,
          error: extractResult.error,
        })

        // Last resort: AI vision (if we have 0 chars)
        if (extractResult.total_chars === 0) {
          console.warn("[Inngest] All extraction methods returned 0 chars, trying AI vision")

          try {
            // Convert first page of PDF to image for vision API
            const { pdf } = await import("pdf-to-img")
            const { default: sharp } = await import("sharp")

            console.log("[Inngest] Converting PDF to image for vision API")
            
            let imageBuffer: Buffer | null = null
            try {
              const document = await pdf(fileBuffer, { scale: 2.0 })
              for await (const image of document) {
                // Just get first page
                imageBuffer = await sharp(image)
                  .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
                  .jpeg({ quality: 85 })
                  .toBuffer()
                break // Only first page
              }
            } catch (pdfConvertError) {
              console.warn("[Inngest] PDF to image conversion failed, trying direct buffer:", {
                error: pdfConvertError instanceof Error ? pdfConvertError.message : pdfConvertError,
              })
              // Try passing buffer directly as fallback
              imageBuffer = fileBuffer
            }

            if (imageBuffer) {
              const { text } = await generateText({
                model: openai("gpt-4o"),
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: "Extract ALL text content from this resume document. Include all sections, bullet points, and details. Return only the extracted text, no commentary.",
                      },
                      {
                        type: "image",
                        image: imageBuffer,
                      },
                    ],
                  },
                ],
              })

              if (text && text.length > 50) {
                console.log("[Inngest] AI Vision extraction succeeded:", {
                  chars: text.length,
                })
                extractResult = {
                  text: text.trim(),
                  total_chars: text.length,
                  page_count: 1,
                  warnings: [...extractResult.warnings, "Used AI vision with PDF-to-image conversion"],
                  mode_used: "ai_vision_fallback",
                  truncated: false,
                  coverage: 0.5,
                }
              } else {
                console.warn("[Inngest] AI Vision returned insufficient content:", {
                  chars: text?.length || 0,
                })
              }
            }
          } catch (visionError) {
            console.error("[Inngest] AI vision also failed:", {
              error: visionError instanceof Error ? visionError.message : visionError,
            })
          }
        }

        return extractResult
      }
    )

    console.log("[Inngest] Extraction complete:", {
      mode: extractResult.mode_used,
      chars: extractResult.total_chars,
      warnings: extractResult.warnings.length,
    })

    // Step 3: Validate extraction - resumes should have at least 200 chars
    if (!extractResult.text || extractResult.total_chars < 200) {
      console.error("[Inngest] Extraction validation failed:", {
        chars: extractResult.total_chars,
        mode: extractResult.mode_used,
        hasError: !!extractResult.error,
      })

      // Mark as failed
      await step.run("mark-extraction-failed", async () => {
        await updateResumeAnalysis(resumeId, userId, {
          processing_status: "failed",
          processing_error: `Extraction failed - only ${extractResult.total_chars} chars extracted (minimum 200 required). Mode: ${extractResult.mode_used}. ${extractResult.error || ""}`,
          warnings: extractResult.warnings,
          modeUsed: extractResult.mode_used,
          truncated: extractResult.truncated,
          pageCount: extractResult.page_count,
        })
      })

      throw new Error(
        `Extraction failed: only ${extractResult.total_chars} chars extracted (minimum 200 required)`
      )
    }

    // Step 4: Structured analysis (or parse if LlamaExtract already did it)
    const structured: any = await step.run(
      "structured-analysis",
      async () => {
        // If LlamaExtract was used, the text is already structured JSON
        if (extractResult.mode_used.startsWith("llamaextract_")) {
          console.log("[Inngest] LlamaExtract mode detected - parsing structured JSON directly")
          
          try {
            const parsedData = JSON.parse(extractResult.text)
            console.log("[Inngest] Successfully parsed LlamaExtract JSON:", {
              hasPersonalInfo: !!parsedData.personal_info,
              hasExperience: !!parsedData.experience,
              hasEducation: !!parsedData.education,
            })
            return parsedData
          } catch (parseError) {
            console.error("[Inngest] Failed to parse LlamaExtract JSON, falling back to GPT analysis")
            // Fall through to GPT analysis
          }
        }

        // Standard GPT-4o-mini analysis for LlamaParse/other methods
        console.log("[Inngest] Starting GPT-4o-mini structured analysis")

        const sanitizedText = extractResult.text.replace(/\s+/g, " ").trim()

        let retryCount = 0
        const maxRetries = 2

        while (retryCount <= maxRetries) {
          try {
            const result = await generateObject({
              model: openai("gpt-4o-mini"),
              schema: StructuredResumeSchema,
              prompt: `Analyze the following resume content and extract structured data.
              Focus on identifying clear sections and extracting key information.
              If uncertain about any field, leave it undefined.

              Resume Content:
              ${sanitizedText.substring(0, 8000)}${sanitizedText.length > 8000 ? "..." : ""}

              Provide concise results. Use arrays for bullets, prefer ISO dates (YYYY-MM) when inferring dates.`,
            })

            console.log("[Inngest] Structured analysis completed")
            return result.object
          } catch (analysisError) {
            console.error(`[Inngest] Analysis attempt ${retryCount + 1} failed:`, analysisError)

            if (retryCount >= maxRetries) {
              throw analysisError
            }
            retryCount++
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }

        throw new Error("Structured analysis failed after retries")
      }
    )

    // Step 5: Save results
    await step.run("save-results", async () => {
      const extractionTimestamp = new Date().toISOString()

      await updateResumeAnalysis(resumeId, userId, {
        content_text: extractResult.text,
        parsed_sections: structured,
        processing_status: "completed",
        processing_error: null,
        extracted_at: extractionTimestamp,
        warnings: extractResult.warnings,
        modeUsed: extractResult.mode_used,
        truncated: extractResult.truncated,
        pageCount: extractResult.page_count,
        source_metadata: {
          storage: "r2",
          key: fileKey,
          pipeline: "background_inngest",
          model: "gpt-4o-mini",
          extraction_mode: extractResult.mode_used,
          extraction_coverage: extractResult.coverage,
          extracted_at: extractionTimestamp,
        },
      })

      console.log("[Inngest] Resume processing completed successfully")
    })

    return {
      success: true,
      resumeId,
      chars: extractResult.total_chars,
      mode: extractResult.mode_used,
    }
  }
)
