export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const SUPPORTED_RESUME_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"] as const

export const SUPPORTED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
] as const

/**
 * Browsers and operating systems sometimes report alternate MIME types.
 * We treat these as aliases and normalize them to canonical values.
 */
export const MIME_ALIASES: Record<string, (typeof SUPPORTED_RESUME_MIME_TYPES)[number]> = {
  "application/x-pdf": "application/pdf",
  "application/acrobat": "application/pdf",
  "applications/vnd.pdf": "application/pdf",
  "text/pdf": "application/pdf",
  "application/x-msword": "application/msword",
  "application/x-tika-ooxml": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/x-zip-compressed":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/rtf": "text/plain",
}

export const EXTENSION_TO_MIME: Record<string, (typeof SUPPORTED_RESUME_MIME_TYPES)[number]> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".txt": "text/plain",
}

export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".")
  return lastDotIndex === -1 ? "" : filename.substring(lastDotIndex).toLowerCase()
}

export function normalizeMimeType(mimeType: string | undefined): string {
  if (!mimeType) {
    return ""
  }
  const normalized = mimeType.toLowerCase().split(";")[0].trim()
  return MIME_ALIASES[normalized] || normalized
}
