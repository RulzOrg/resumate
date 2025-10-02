/**
 * File hash generation utility for resume health check deduplication
 * Uses SHA-256 to create unique file fingerprints
 */

/**
 * Generate SHA-256 hash from file buffer
 * @param fileBuffer - The file content as ArrayBuffer or Buffer
 * @returns SHA-256 hash as hex string
 */
export async function generateFileHash(fileBuffer: ArrayBuffer | Buffer): Promise<string> {
  // Convert Buffer to ArrayBuffer if needed
  const buffer = fileBuffer instanceof Buffer
    ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    : fileBuffer

  // Use Web Crypto API (available in Node.js 15+ and all modern browsers)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Generate SHA-256 hash from File object (browser)
 * @param file - The File object from file input
 * @returns SHA-256 hash as hex string
 */
export async function generateFileHashFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  return generateFileHash(arrayBuffer)
}

/**
 * Generate SHA-256 hash from form data file (server-side)
 * @param file - The file from FormData
 * @returns SHA-256 hash as hex string
 */
export async function generateFileHashFromFormData(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  return generateFileHash(bytes)
}
