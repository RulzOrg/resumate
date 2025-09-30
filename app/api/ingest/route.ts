/**
 * POST /api/ingest
 * Hardened resume upload and ingestion endpoint
 *
 * Features:
 * - File validation (size, type)
 * - Upload to R2/S3 storage
 * - Content extraction with OCR support
 * - Evidence extraction with LLM
 * - Fallback to raw paragraph indexing
 * - Rate limiting
 * - Comprehensive error handling
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { uploadResume, calculateFileHash, getDownloadUrl } from "@/lib/r2"
import { extractEvidence, isValidResumeContent } from "@/lib/llm"
import { checkRateLimit, ingestRateLimit, getRateLimitHeaders } from "@/lib/ratelimit"
import { primaryExtract, fallbackExtract } from "@/lib/extract"
import type { ExtractResult } from "@/lib/llamaparse"
import {
  IngestSuccessResponseSchema,
  IngestFallbackResponseSchema,
  IngestErrorResponseSchema,
  EvidenceExtractionResponseSchema,
  ParsedResumeSchema,
  type IngestResponse,
} from "@/lib/schemas"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"]

/**
 * Simple text extraction for TXT files
 */
async function extractTextFromTextFile(file: File): Promise<string> {
  return await file.text()
}

/**
 * Split text into paragraphs for raw indexing
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length >= 20) // Minimum 20 chars
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { status: "error", error: "Unauthorized", code: "AUTH_REQUIRED" } as IngestResponse,
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(ingestRateLimit, userId)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          status: "error",
          error: rateLimitResult.error || "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
        } as IngestResponse,
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { status: "error", error: "No file provided", code: "NO_FILE" } as IngestResponse,
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          status: "error",
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          code: "FILE_TOO_LARGE",
        } as IngestResponse,
        { status: 400 }
      )
    }

    // Validate file type
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid file type. Allowed types: PDF, DOCX, TXT",
          code: "INVALID_FILE_TYPE",
        } as IngestResponse,
        { status: 400 }
      )
    }

    // Read file content
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileHash = calculateFileHash(fileBuffer)

    // Check for duplicate upload
    const existingResume = await prisma.resume.findFirst({
      where: {
        userId,
        fileHash,
        deletedAt: null,
      },
    })

    if (existingResume) {
      console.info("[Ingest] Duplicate file detected:", { userId: userId.substring(0, 8), hash: fileHash.slice(0, 8) })
      // Return existing resume data
      return NextResponse.json(
        {
          status: "success",
          resumeId: existingResume.id,
          parsed: existingResume.parsedSections || {},
          evidenceCount: 0,
          fileHash,
        } as IngestResponse,
        { headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Upload to R2/S3
    let uploadResult
    try {
      uploadResult = await uploadResume(userId, file.name, fileBuffer, file.type)
    } catch (error: any) {
      console.error("[Ingest] Upload failed:", { error: error.message })
      return NextResponse.json(
        { status: "error", error: "File upload failed", code: "UPLOAD_FAILED" } as IngestResponse,
        { status: 500 }
      )
    }

    // Extract text content using LlamaParse with fallback
    let extractResult: ExtractResult
    let extractedText: string

    // Handle text files separately (no need for LlamaParse)
    if (file.type === "text/plain") {
      console.log("[Ingest] Text file detected, using direct extraction")
      try {
        extractedText = await extractTextFromTextFile(file)
        extractResult = {
          text: extractedText,
          total_chars: extractedText.length,
          page_count: 1,
          warnings: [],
          mode_used: "text_file",
          truncated: false,
          coverage: 1,
        }
        console.log("[Ingest] Text file extracted:", { chars: extractedText.length })
      } catch (error: any) {
        console.error("[Ingest] Text file extraction failed:", { error: error.message })
        return NextResponse.json(
          { status: "error", error: "Text extraction failed", code: "EXTRACTION_FAILED" } as IngestResponse,
          { status: 500 }
        )
      }
    } else {
      console.log("[Ingest] Binary file detected:", { 
        type: file.type, 
        size: fileBuffer.length,
        fileName: file.name 
      })
      // Use LlamaParse for PDF/DOCX files
      try {
        extractResult = await primaryExtract(fileBuffer, file.type, userId)

        // If LlamaParse fails or has low coverage, try fallback
        if (extractResult.error || extractResult.coverage < 0.6) {
          console.warn("[Ingest] Primary extraction insufficient, trying fallback:", {
            userId: userId.substring(0, 8),
            error: extractResult.error,
            coverage: extractResult.coverage,
          })

          // Get presigned URL for fallback extractor
          const fileUrl = await getDownloadUrl(uploadResult.key, 3600)
          const fallbackResult = await fallbackExtract(fileBuffer, file.type, fileUrl)

          // Use result with higher total_chars
          if (fallbackResult.total_chars > extractResult.total_chars) {
            console.info("[Ingest] Using fallback extraction:", {
              userId: userId.substring(0, 8),
              primaryChars: extractResult.total_chars,
              fallbackChars: fallbackResult.total_chars,
            })
            extractResult = fallbackResult
          }
        }

        extractedText = extractResult.text
        
        console.log("[Ingest] Extraction complete:", {
          mode: extractResult.mode_used,
          chars: extractResult.total_chars,
          pages: extractResult.page_count,
          coverage: extractResult.coverage,
          warnings: extractResult.warnings.length,
          truncated: extractResult.truncated,
        })
      } catch (error: any) {
        console.error("[Ingest] All extraction methods failed:", { error: error.message })
        return NextResponse.json(
          { status: "error", error: "Text extraction failed", code: "EXTRACTION_FAILED" } as IngestResponse,
          { status: 500 }
        )
      }
    }

    // Validate extracted content
    if (!isValidResumeContent(extractedText)) {
      console.warn("[Ingest] Invalid resume content detected:", {
        userId: userId.substring(0, 8),
        textLength: extractedText.length,
      })

      // Create resume record with failed status
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: file.name,
          fileName: file.name,
          fileUrl: uploadResult.key,
          fileType: file.type,
          fileSize: file.size,
          fileHash,
          kind: "uploaded",
          processingStatus: "failed",
          processingError: "Content too short or invalid",
          parsedSections: undefined,
          warnings: extractResult.warnings,
          modeUsed: extractResult.mode_used,
          truncated: extractResult.truncated,
          pageCount: extractResult.page_count,
        },
      })

      return NextResponse.json(
        {
          status: "error",
          error: "Resume content is too short or invalid",
          code: "INVALID_CONTENT",
        } as IngestResponse,
        { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Try to extract evidence with LLM
    let evidenceResult
    let shouldFallback = false
    let fallbackReason = ""

    try {
      evidenceResult = await extractEvidence(extractedText, userId, EvidenceExtractionResponseSchema)

      // Validate evidence extraction
      if (!evidenceResult || !evidenceResult.evidences || evidenceResult.evidences.length === 0) {
        shouldFallback = true
        fallbackReason = evidenceResult
          ? "No evidence extracted"
          : "Evidence extraction returned no result"
      }
    } catch (error: any) {
      console.warn("[Ingest] Evidence extraction failed, falling back:", { error: error.message })
      shouldFallback = true
      fallbackReason = `LLM extraction failed: ${error.message}`
    }

    // Handle fallback case
    if (shouldFallback) {
      const paragraphs = splitIntoParagraphs(extractedText)

      if (paragraphs.length === 0) {
        // Create resume record with failed status
        const resume = await prisma.resume.create({
          data: {
            userId,
            title: file.name,
            fileName: file.name,
            fileUrl: uploadResult.key,
            fileType: file.type,
            fileSize: file.size,
            fileHash,
            kind: "uploaded",
            processingStatus: "failed",
            processingError: fallbackReason,
            parsedSections: undefined,
            warnings: extractResult.warnings,
            modeUsed: extractResult.mode_used,
            truncated: extractResult.truncated,
            pageCount: extractResult.page_count,
          },
        })

        return NextResponse.json(
          {
            status: "error",
            error: "Could not process resume content",
            code: "PROCESSING_FAILED",
          } as IngestResponse,
          { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
        )
      }

      // Create resume record with fallback status
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: file.name,
          fileName: file.name,
          fileUrl: uploadResult.key,
          fileType: file.type,
          fileSize: file.size,
          fileHash,
          kind: "uploaded",
          processingStatus: "fallback",
          processingError: fallbackReason,
          parsedSections: { rawParagraphs: paragraphs },
          warnings: extractResult.warnings,
          modeUsed: extractResult.mode_used,
          truncated: extractResult.truncated,
          pageCount: extractResult.page_count,
        },
      })

      console.info("[Ingest] Fallback to raw paragraphs:", {
        userId: userId.substring(0, 8),
        paragraphCount: paragraphs.length,
        reason: fallbackReason,
      })

      return NextResponse.json(
        {
          status: "fallback",
          resumeId: resume.id,
          reason: fallbackReason,
          rawParagraphs: paragraphs,
          fileHash,
        } as IngestResponse,
        { headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Success case - create resume record
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: file.name,
        fileName: file.name,
        fileUrl: uploadResult.key,
        fileType: file.type,
        fileSize: file.size,
        fileHash,
        kind: "uploaded",
        processingStatus: "completed",
        parsedSections: {
          evidences: evidenceResult!.evidences,
        },
        extractedAt: new Date(),
        warnings: extractResult.warnings,
        modeUsed: extractResult.mode_used,
        truncated: extractResult.truncated,
        pageCount: extractResult.page_count,
      },
    })

    console.info("[Ingest] Resume processed successfully:", {
      userId: userId.substring(0, 8),
      resumeId: resume.id.substring(0, 8),
      evidenceCount: evidenceResult!.evidences.length,
    })

    return NextResponse.json(
      {
        status: "success",
        resumeId: resume.id,
        parsed: {},
        evidenceCount: evidenceResult!.evidences.length,
        fileHash,
      } as IngestResponse,
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error: any) {
    console.error("[Ingest] Unexpected error:", {
      error: error.message,
      stack: error.stack?.split("\n")[0],
    })

    return NextResponse.json(
      {
        status: "error",
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      } as IngestResponse,
      { status: 500 }
    )
  }
}