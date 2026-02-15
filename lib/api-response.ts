import { NextResponse } from "next/server"
import { AppError } from "@/lib/error-handler"
import { ZodError } from "zod"

export interface ApiErrorBody {
  code: string
  message: string
  error: string
  retryable: boolean
  details?: unknown
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  options?: {
    retryable?: boolean
    details?: unknown
  }
) {
  const body: ApiErrorBody = {
    code,
    message,
    error: message,
    retryable: options?.retryable ?? status >= 500,
    details: options?.details,
  }

  return NextResponse.json(body, { status })
}

export function fromError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(
      error.statusCode,
      error.code || "APP_ERROR",
      error.message,
      { retryable: error.statusCode >= 500 }
    )
  }

  if (error instanceof ZodError) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      {
        retryable: false,
        details: error.issues,
      }
    )
  }

  const fallbackMessage = error instanceof Error ? error.message : "Unexpected error"
  return errorResponse(500, "INTERNAL_ERROR", fallbackMessage, {
    retryable: true,
  })
}
