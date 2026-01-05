import { NextRequest } from "next/server"

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

// Allowed MIME types for resume uploads
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc (legacy)
] as const

// File extension to MIME type mapping
export const EXTENSION_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
}

// Magic numbers for file type verification
const FILE_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP archive)
  doc: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // MS Office
} as const

export interface FileValidationResult {
  valid: boolean
  error?: string
  fileType?: string
  size?: number
}

/**
 * Validates file size
 */
export function validateFileSize(size: number): FileValidationResult {
  if (size <= 0) {
    return {
      valid: false,
      error: "File is empty"
    }
  }

  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }
  }

  return { valid: true, size }
}

/**
 * Validates MIME type
 */
export function validateMimeType(mimeType: string): FileValidationResult {
  const normalizedMime = mimeType.toLowerCase().split(';')[0].trim()

  if (!ALLOWED_MIME_TYPES.includes(normalizedMime as any)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: PDF, DOCX`
    }
  }

  return { valid: true, fileType: normalizedMime }
}

/**
 * Validates file extension
 */
export function validateFileExtension(filename: string): FileValidationResult {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return {
      valid: false,
      error: "File has no extension"
    }
  }

  const extension = filename.substring(lastDotIndex).toLowerCase()
  const expectedMime = EXTENSION_TO_MIME[extension]

  if (!expectedMime) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: .pdf, .docx`
    }
  }

  return { valid: true, fileType: expectedMime }
}

/**
 * Verifies file signature (magic numbers) from buffer
 */
export function verifyFileSignature(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length < 8) {
    return {
      valid: false,
      error: "File is too small or corrupted"
    }
  }

  // Check PDF signature
  if (buffer[0] === FILE_SIGNATURES.pdf[0] &&
      buffer[1] === FILE_SIGNATURES.pdf[1] &&
      buffer[2] === FILE_SIGNATURES.pdf[2] &&
      buffer[3] === FILE_SIGNATURES.pdf[3]) {
    return { valid: true, fileType: 'application/pdf' }
  }

  // Check DOCX signature (ZIP file)
  if (buffer[0] === FILE_SIGNATURES.docx[0] &&
      buffer[1] === FILE_SIGNATURES.docx[1] &&
      buffer[2] === FILE_SIGNATURES.docx[2] &&
      buffer[3] === FILE_SIGNATURES.docx[3]) {
    // Further check if it's actually a DOCX by looking for specific patterns
    // This is a simplified check - a full implementation would parse the ZIP
    return { valid: true, fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  }

  // Check DOC signature (MS Office)
  let isDoc = true
  for (let i = 0; i < FILE_SIGNATURES.doc.length; i++) {
    if (buffer[i] !== FILE_SIGNATURES.doc[i]) {
      isDoc = false
      break
    }
  }
  if (isDoc) {
    return { valid: true, fileType: 'application/msword' }
  }

  return {
    valid: false,
    error: "File signature does not match allowed file types"
  }
}

/**
 * Comprehensive file validation for FormData uploads
 */
export async function validateUploadedFile(
  formData: FormData,
  fieldName: string = 'file'
): Promise<FileValidationResult> {
  const file = formData.get(fieldName)

  if (!file || typeof file === 'string') {
    return {
      valid: false,
      error: "No file provided"
    }
  }

  const fileBlob = file as File

  // Validate file size
  const sizeValidation = validateFileSize(fileBlob.size)
  if (!sizeValidation.valid) {
    return sizeValidation
  }

  // Validate MIME type
  const mimeValidation = validateMimeType(fileBlob.type)
  if (!mimeValidation.valid) {
    return mimeValidation
  }

  // Validate file extension
  const extensionValidation = validateFileExtension(fileBlob.name)
  if (!extensionValidation.valid) {
    return extensionValidation
  }

  // Cross-check MIME type and extension
  if (mimeValidation.fileType !== extensionValidation.fileType) {
    return {
      valid: false,
      error: "File extension does not match file type"
    }
  }

  // Read first bytes for signature verification
  try {
    const arrayBuffer = await fileBlob.slice(0, 8).arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const signatureValidation = verifyFileSignature(buffer)

    if (!signatureValidation.valid) {
      return signatureValidation
    }

    // Final check: ensure detected signature matches declared type
    if (signatureValidation.fileType !== mimeValidation.fileType) {
      return {
        valid: false,
        error: "File content does not match declared file type"
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: "Failed to read file for verification"
    }
  }

  return {
    valid: true,
    fileType: mimeValidation.fileType,
    size: fileBlob.size
  }
}

/**
 * Sanitizes filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any directory paths
  const basename = filename.split(/[\/\\]/).pop() || 'file'

  // Remove special characters except dots, dashes, and underscores
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/^\./, '') // Remove leading dot
    .substring(0, 255) // Limit length

  // Ensure the filename is not empty after sanitization
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return `file_${Date.now()}`
  }

  return sanitized
}

/**
 * Validates file upload from NextRequest
 * Used in API routes that accept multipart/form-data
 */
export async function validateFileUpload(request: NextRequest): Promise<{
  valid: boolean
  error?: string
  file?: File
  formData?: FormData
  validationResult?: FileValidationResult
}> {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return {
        valid: false,
        error: "No file provided in request"
      }
    }

    const fileBlob = file as File
    const validation = await validateUploadedFile(formData, 'file')

    if (!validation.valid) {
      return {
        valid: false,
        error: validation.error,
        validationResult: validation
      }
    }

    return {
      valid: true,
      file: fileBlob,
      formData,
      validationResult: validation
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || "Failed to process file upload"
    }
  }
}

/**
 * Checks if a file is likely to contain malware based on patterns
 * This is a basic check - for production, use a proper antivirus service
 */
export function basicMalwareScan(buffer: Buffer): FileValidationResult {
  // Common malware signatures (very basic - not comprehensive)
  const suspiciousPatterns = [
    Buffer.from('EICAR'), // EICAR test signature
    Buffer.from('<script'), // JavaScript in file
    Buffer.from('eval('), // Eval function
    Buffer.from('document.write'), // Document write
    Buffer.from('ActiveXObject'), // ActiveX
    Buffer.from('.exe'), // Executable reference
    Buffer.from('.bat'), // Batch file reference
    Buffer.from('.cmd'), // Command file reference
    Buffer.from('.scr'), // Screensaver executable
  ]

  const bufferString = buffer.toString('utf8', 0, Math.min(buffer.length, 10000))

  for (const pattern of suspiciousPatterns) {
    if (bufferString.includes(pattern.toString())) {
      return {
        valid: false,
        error: "File contains potentially malicious content"
      }
    }
  }

  return { valid: true }
}