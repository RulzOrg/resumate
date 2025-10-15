/**
 * Background job for processing uploaded resumes
 * Runs asynchronously to avoid blocking user during long extraction operations
 */

import { inngest } from "../client"
import { primaryExtract, fallbackExtract } from "@/lib/extract"
import type { ExtractResult } from "@/lib/llamaparse"
import { getSignedDownloadUrl } from "@/lib/storage"
import { updateResumeAnalysis, getResumeById } from "@/lib/db"
import { indexResume } from "@/lib/resume-indexer"
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
    const { resumeId, userId, fileKey, fileType, fileSize, enqueuedAt, deadlineAt } = event.data as any

    const now = Date.now()
    const enqueueTimestamp = enqueuedAt ? new Date(enqueuedAt).getTime() : null
    const deadlineTimestamp = deadlineAt ? new Date(deadlineAt).getTime() : null
    const queueLatencyMs = enqueueTimestamp ? now - enqueueTimestamp : null
    const queueLatencySeconds = queueLatencyMs ? Math.round(queueLatencyMs / 1000) : null

    console.log("[Inngest] Starting resume processing:", {
      resumeId: resumeId.substring(0, 8),
      userId: userId.substring(0, 8),
      fileType,
      fileSize,
      queueLatencyMs,
    })

    if (deadlineTimestamp && now > deadlineTimestamp) {
      await updateResumeAnalysis(resumeId, userId, {
        processing_status: "failed",
        processing_error: "Processing deadline exceeded before job start",
      })
      console.warn("[Inngest] Aborting resume processing — deadline exceeded before start", {
        resumeId: resumeId.substring(0, 8),
        userId: userId.substring(0, 8),
      })
      return {
        success: false,
        reason: "deadline_exceeded_pre_start",
        queueLatencyMs,
      }
    }

    const processingStartedAt = new Date()
    const processingStartedAtIso = processingStartedAt.toISOString()

    const mergeSlaMetadata = async (additional: Record<string, any>) => {
      const resumeRecord = await getResumeById(resumeId, userId)
      const baseMetadata =
        resumeRecord && typeof (resumeRecord as any).source_metadata === "object"
          ? { ...(resumeRecord as any).source_metadata }
          : {}
      const currentSla = typeof baseMetadata.sla === "object" ? { ...baseMetadata.sla } : {}
      const nextSla = { ...currentSla, ...additional }
      baseMetadata.sla = nextSla
      await updateResumeAnalysis(resumeId, userId, {
        source_metadata: baseMetadata,
      })
    }

    if (queueLatencyMs !== null || enqueuedAt || deadlineAt) {
      await mergeSlaMetadata({
        queueLatencyMs,
        queueLatencySeconds,
        enqueuedAt,
        deadlineAt,
      })
    }

    const mergeMetadata = (base: any, updates: any): any => {
      const result = { ...(base || {}) }
      for (const key of Object.keys(updates || {})) {
        const updateValue = updates[key]
        const baseValue = result[key]
        if (
          updateValue &&
          typeof updateValue === "object" &&
          !Array.isArray(updateValue) &&
          baseValue &&
          typeof baseValue === "object" &&
          !Array.isArray(baseValue)
        ) {
          result[key] = mergeMetadata(baseValue, updateValue)
        } else {
          result[key] = updateValue
        }
      }
      return result
    }

    const coverageThresholds = { totalChars: 10_000, perPageChars: 800 }

    const computeCoverageStats = (result: any) => {
      const totalChars = Number(result?.total_chars || 0)
      const pageCount = Number(result?.page_count || (Array.isArray(result?.per_page) ? result.per_page.length : 0))
      const perPageRaw = Array.isArray(result?.per_page) ? result.per_page : []
      const perPageStats = perPageRaw.length
        ? perPageRaw.map((entry: any, index: number) => ({
            page: entry?.page ?? index + 1,
            chars: Number(entry?.chars ?? entry?.char_count ?? 0),
            coverage: typeof entry?.coverage === "number" ? entry.coverage : null,
          }))
        : pageCount > 0
          ? Array.from({ length: pageCount }).map((_, index) => ({
              page: index + 1,
              chars: Math.round(totalChars / pageCount),
              coverage: typeof result?.coverage === "number" ? result.coverage : null,
            }))
          : []

      const avgCharsPerPage = pageCount > 0 ? totalChars / pageCount : totalChars
      const minCharsPerPage = perPageStats.length
        ? perPageStats.reduce((min: number, item: any) => Math.min(min, Number(item?.chars ?? 0)), Number.POSITIVE_INFINITY)
        : avgCharsPerPage
      const meetsTotalChars = totalChars >= coverageThresholds.totalChars
      const meetsPerPageAvg = avgCharsPerPage >= coverageThresholds.perPageChars
      const pagesBelowThreshold = perPageStats
        .filter((item: any) => Number(item?.chars ?? 0) < coverageThresholds.perPageChars)
        .map((item: any) => item.page)

      return {
        thresholds: coverageThresholds,
        totalChars,
        pageCount,
        avgCharsPerPage,
        minCharsPerPage,
        perPageStats,
        meetsTotalChars,
        meetsPerPageAvg,
        meetsEitherThreshold: meetsTotalChars || meetsPerPageAvg,
        pagesBelowThreshold,
      }
    }

    const computeSectionCoverage = (structured: any) => {
      const experience = Array.isArray(structured?.experience) ? structured.experience : []
      const education = Array.isArray(structured?.education) ? structured.education : []
      const skills = structured?.skills
      const skillBuckets = skills && typeof skills === "object"
        ? Object.values(skills).flat().filter((item: any) => typeof item === "string" && item.trim().length > 0)
        : []
      const personalInfo = structured?.personal_info || {}
      const contactFields = [personalInfo.full_name, personalInfo.email, personalInfo.phone, personalInfo.location].filter(
        (value) => typeof value === "string" && value.trim().length > 0,
      )

      const flags = {
        summary: typeof structured?.summary === "string" && structured.summary.trim().length > 0,
        experience: experience.length > 0,
        education: education.length > 0,
        skills: skillBuckets.length > 0,
        contact: contactFields.length > 0,
      }

      const sectionsMet = Object.values(flags).filter(Boolean).length
      const missing = Object.entries(flags)
        .filter(([, present]) => !present)
        .map(([section]) => section)

      return {
        flags,
        sectionsMet,
        missing,
        meetsMinimum: sectionsMet >= 3,
      }
    }

    const markFailure = async (
      stepName: string,
      message: string,
      metadataUpdates: Record<string, any>,
      extraWarnings: string[] = [],
    ) => {
      await step.run(stepName, async () => {
        const resumeRecord = await getResumeById(resumeId, userId)
        const baseMetadata =
          resumeRecord && typeof (resumeRecord as any).source_metadata === "object"
            ? (resumeRecord as any).source_metadata
            : {}
        const mergedMetadata = mergeMetadata(baseMetadata, metadataUpdates)

        await updateResumeAnalysis(resumeId, userId, {
          processing_status: "failed",
          processing_error: message,
          warnings: [...(Array.isArray((resumeRecord as any)?.warnings) ? (resumeRecord as any).warnings : []), ...extraWarnings],
          source_metadata: mergedMetadata,
        })
      })
    }

    let coverageStats: any = null
    let sectionCoverage: any = null

    // Step 1: Update status to processing
    await step.run("update-status-processing", async () => {
      await updateResumeAnalysis(resumeId, userId, {
        processing_status: "processing",
        processing_error: null,
      })
      await mergeSlaMetadata({ processingStartedAt: processingStartedAtIso })
      console.log("[Inngest] Status updated to processing")
    })

    const enforceDeadline = async (stage: string) => {
      if (deadlineTimestamp && Date.now() > deadlineTimestamp) {
        await updateResumeAnalysis(resumeId, userId, {
          processing_status: "failed",
          processing_error: `Processing deadline exceeded during ${stage}`,
        })
        const breachedAt = new Date().toISOString()
        await mergeSlaMetadata({ deadlineBreachedAt: breachedAt, deadlineStage: stage })
        console.error("[Inngest] Aborting resume processing — deadline exceeded", {
          stage,
          resumeId: resumeId.substring(0, 8),
        })
        throw new Error("PROCESSING_DEADLINE_EXCEEDED")
      }
    }

    try {

    // Step 2: Extract content (with generous timeout)
    const extractResult: ExtractResult = await step.run(
      "extract-content",
      async (): Promise<ExtractResult> => {
        // Get file from storage
        const fileUrl = await getSignedDownloadUrl(fileKey, 3600)
        const fileResponse = await fetch(fileUrl)
        const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())

        console.log("[Inngest] Starting content extraction")

        await enforceDeadline("pre-extraction")

        // Try text file direct read
        if (fileType === "text/plain") {
          const text = fileBuffer.toString("utf-8")
          const perPage = [{
            page: 1,
            chars: text.length,
            coverage: 1,
          }]
          return {
            text,
            total_chars: text.length,
            page_count: 1,
            warnings: [],
            mode_used: "text_file",
            truncated: false,
            coverage: 1,
            per_page: perPage,
          } as ExtractResult & { per_page?: any }
        }

        // Use LlamaParse for text extraction
        console.log("[Inngest] Using LlamaParse for extraction")

        let extractResult: ExtractResult & { per_page?: any; coverage_details?: any } = await primaryExtract(fileBuffer, fileType, userId) as any

        await enforceDeadline("post-primary-extract")

        console.log("[Inngest] primaryExtract returned:", {
          chars: extractResult.total_chars,
          mode: extractResult.mode_used,
          hasError: !!extractResult.error,
          error: extractResult.error,
        })

        const needsFallback =
          extractResult.total_chars < 200 ||
          !!extractResult.error ||
          (typeof extractResult.coverage === "number" && extractResult.coverage < 0.2)

        if (needsFallback) {
          await enforceDeadline("pre-fallback-extract")
          console.warn("[Inngest] Primary extraction insufficient, attempting fallback extractor", {
            chars: extractResult.total_chars,
            coverage: extractResult.coverage,
            mode: extractResult.mode_used,
          })

          let fallbackResult = await fallbackExtract(fileBuffer, fileType, fileUrl)
          await enforceDeadline("post-fallback-extract")

          console.log("[Inngest] Fallback extractor returned", {
            chars: fallbackResult.total_chars,
            mode: fallbackResult.mode_used,
            warnings: fallbackResult.warnings,
          })

          // Escalate fallback once if we still have poor coverage
          const fallbackInsufficient =
            (fallbackResult.total_chars || 0) < 200 ||
            (typeof fallbackResult.coverage === "number" && fallbackResult.coverage < 0.2)

          if (fallbackInsufficient) {
            await enforceDeadline("pre-fallback-escalation")
            console.warn("[Inngest] Fallback coverage still low, retrying fallback path", {
              chars: fallbackResult.total_chars,
              coverage: fallbackResult.coverage,
            })

            const retryResult = await fallbackExtract(fileBuffer, fileType, fileUrl)
            await enforceDeadline("post-fallback-escalation")

            console.log("[Inngest] Fallback retry returned", {
              chars: retryResult.total_chars,
              mode: retryResult.mode_used,
              warnings: retryResult.warnings,
            })

            if ((retryResult.total_chars || 0) > (fallbackResult.total_chars || 0)) {
              fallbackResult = {
                ...retryResult,
                warnings: [...(retryResult.warnings || []), "Fallback retried due to low coverage"],
              }
            }
          }

          if ((fallbackResult.total_chars || 0) > (extractResult.total_chars || 0)) {
            const combinedWarnings = [
              ...(extractResult.warnings || []),
              ...(fallbackResult.warnings || []),
              "Used fallback extractor after low-coverage primary result",
            ]
            extractResult = {
              ...(fallbackResult as any),
              warnings: combinedWarnings,
              mode_used: fallbackResult.mode_used || "oss_fallback",
            }
          } else {
            extractResult = {
              ...extractResult,
              warnings: [
                ...(extractResult.warnings || []),
                "Fallback extractor did not improve coverage",
              ],
            }
          }
        }

        // Last resort: AI vision (if we still have no usable text)
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
                  per_page: [{ page: 1, chars: text.length, coverage: 0.5 }],
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

        coverageStats = computeCoverageStats(extractResult)

        const coverageNotes: string[] = []
        if (!extractResult.text || coverageStats.totalChars < 200) {
          coverageNotes.push("MIN_CHARS")
        }
        if (!coverageStats.meetsEitherThreshold) {
          coverageNotes.push("THRESHOLD")
        }

        if (coverageNotes.length) {
          const pagesNote = coverageStats.pagesBelowThreshold.length
            ? ` Pages below threshold: ${coverageStats.pagesBelowThreshold.join(", ")}.`
            : ""
          const message = `Extraction coverage too low: ${coverageStats.totalChars} chars across ${
            coverageStats.pageCount || "unknown"
          } pages.${pagesNote}`
          await markFailure(
            "coverage-threshold-failed",
            message,
            {
              coverage: {
                characters: {
                  ...coverageStats,
                  meetsEitherThreshold: false,
                  failureReasons: coverageNotes,
                },
              },
              sla: {
                coverageFailureAt: new Date().toISOString(),
                coverageFailureReason: coverageNotes.join(","),
              },
            },
            [...(extractResult.warnings || []), message],
          )
          const err: any = new Error("COVERAGE_THRESHOLD_FAILED")
          err.code = "COVERAGE_THRESHOLD_FAILED"
          throw err
        }

        return extractResult
      }
    )

    await enforceDeadline("post-extraction")

    console.log("[Inngest] Extraction complete:", {
      mode: extractResult.mode_used,
      chars: extractResult.total_chars,
      warnings: extractResult.warnings.length,
    })

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

    sectionCoverage = computeSectionCoverage(structured)
    if (!sectionCoverage.meetsMinimum) {
      const message = `Insufficient section coverage: detected ${sectionCoverage.sectionsMet}/5 core sections (missing ${
        sectionCoverage.missing.join(", ") || "none"
      }).`
      await markFailure(
        "section-coverage-failed",
        message,
        {
          coverage: {
            characters: {
              ...coverageStats,
              meetsEitherThreshold: true,
            },
            sections: { ...sectionCoverage, meetsMinimum: false },
          },
          sla: {
            coverageFailureAt: new Date().toISOString(),
            coverageFailureReason: "SECTIONS",
          },
        },
        [...(extractResult.warnings || []), message],
      )
      const err: any = new Error("SECTION_COVERAGE_FAILED")
      err.code = "SECTION_COVERAGE_FAILED"
      throw err
    }

    // Step 5: Save results
    await step.run("save-results", async () => {
      const extractionTimestamp = new Date().toISOString()
      const processingDurationMs = Date.now() - processingStartedAt.getTime()
      const totalElapsedMs = enqueueTimestamp ? Date.now() - enqueueTimestamp : processingDurationMs

      const resumeRecord = await getResumeById(resumeId, userId)
      const metadata =
        resumeRecord && typeof (resumeRecord as any).source_metadata === "object"
          ? { ...(resumeRecord as any).source_metadata }
          : {}

      const currentSla = typeof metadata.sla === "object" ? { ...metadata.sla } : {}
      metadata.sla = {
        ...currentSla,
        enqueuedAt,
        deadlineAt,
        queueLatencyMs: queueLatencyMs ?? currentSla.queueLatencyMs,
        queueLatencySeconds: queueLatencySeconds ?? currentSla.queueLatencySeconds,
        processingStartedAt: currentSla.processingStartedAt ?? processingStartedAtIso,
        processingCompletedAt: extractionTimestamp,
        processingDurationMs,
        totalElapsedMs,
      }

      metadata.pipeline = {
        ...(typeof metadata.pipeline === "object" ? metadata.pipeline : {}),
        ingestion: {
          handler: "process-resume",
          mode: extractResult.mode_used,
          completedAt: extractionTimestamp,
        },
      }

      metadata.storage = {
        ...(typeof metadata.storage === "object" ? metadata.storage : {}),
        key: fileKey,
      }

      metadata.model = "gpt-4o-mini"
      if (coverageStats) {
      metadata.coverage = mergeMetadata(metadata.coverage || {}, {
        characters: {
          ...coverageStats,
          meetsEitherThreshold: coverageStats.meetsEitherThreshold,
        },
      })
      }

      if (sectionCoverage) {
        metadata.coverage = mergeMetadata(metadata.coverage || {}, {
          sections: sectionCoverage,
        })
      }

      metadata.extraction = mergeMetadata(metadata.extraction || {}, {
        mode: extractResult.mode_used,
        coverage: {
          ratio: extractResult.coverage,
          details: coverageStats,
        },
        warnings: extractResult.warnings?.length ?? 0,
        extracted_at: extractionTimestamp,
      })

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
        source_metadata: metadata,
      })

      // Index resume into Qdrant for evidence search
      console.log("[Inngest] Starting Qdrant indexing...")

      try {
        const resumeRecord = await getResumeById(resumeId, userId)
        const indexResult = await indexResume({
          resumeId,
          userId,
          content: extractResult.text,
          metadata: {
            file_name: resumeRecord?.file_name,
            file_type: fileType,
            indexed_at: new Date().toISOString()
          }
        })

        if (indexResult.success) {
          console.log(`[Inngest] ✓ Indexed ${indexResult.chunksIndexed} chunks to Qdrant`)
        } else {
          console.warn(`[Inngest] ✗ Qdrant indexing failed: ${indexResult.error}`)
        }
      } catch (indexError: any) {
        console.error(`[Inngest] Qdrant indexing error: ${indexError.message}`)
        // Don't fail the job if indexing fails - resume processing was successful
      }

      console.log("[Inngest] Resume processing completed successfully", {
        processingDurationMs,
        totalElapsedMs,
      })
    })

      return {
        success: true,
        resumeId,
        chars: extractResult.total_chars,
        mode: extractResult.mode_used,
        queueLatencyMs,
      }
    } catch (error: any) {
      const errorCode = error?.code || error?.message
      if (errorCode === "PROCESSING_DEADLINE_EXCEEDED") {
        return {
          success: false,
          reason: "deadline_exceeded",
          queueLatencyMs,
        }
      }
      if (errorCode === "COVERAGE_MINIMUM_FAILED" || errorCode === "COVERAGE_THRESHOLD_FAILED") {
        return {
          success: false,
          reason: "coverage_insufficient",
          queueLatencyMs,
        }
      }
      if (errorCode === "SECTION_COVERAGE_FAILED") {
        return {
          success: false,
          reason: "section_coverage_failed",
          queueLatencyMs,
        }
      }
      throw error
    }
  }
)
