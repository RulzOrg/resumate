/**
 * Cloudflare R2 / S3 storage utilities
 * Handles file uploads and retrieval for resume storage
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"

/**
 * Initialize S3 client for R2/S3
 */
function getS3Client() {
  // For Cloudflare R2, construct the endpoint from the account ID
  const r2AccountId = process.env.R2_ACCOUNT_ID
  const endpoint = process.env.R2_ENDPOINT ||
                  process.env.S3_ENDPOINT ||
                  (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : undefined)

  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.R2_REGION || process.env.AWS_REGION || "auto"

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2/S3 storage not configured. Set R2_ACCOUNT_ID (or R2_ENDPOINT), R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY")
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME || "ai-resume-uploads"

/**
 * Calculate SHA-256 hash of file content
 *
 * @param content - File content buffer
 * @returns Hex-encoded hash
 */
export function calculateFileHash(content: Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

/**
 * Generate a unique file key for storage
 *
 * @param userId - User ID
 * @param originalFilename - Original filename
 * @param fileHash - File content hash
 * @returns Storage key
 */
export function generateFileKey(userId: string, originalFilename: string, fileHash: string): string {
  const timestamp = Date.now()
  const ext = originalFilename.split(".").pop() || "pdf"
  const sanitizedName = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .slice(0, 50)

  return `resumes/${userId}/${timestamp}_${fileHash.slice(0, 8)}_${sanitizedName}`
}

/**
 * Upload a file to R2/S3 storage
 *
 * @param fileContent - File content buffer
 * @param key - Storage key
 * @param contentType - MIME type
 * @param fileHash - Optional pre-calculated hash (avoids recalculation)
 * @returns Upload result with key and hash
 */
export async function uploadFile(
  fileContent: Buffer,
  key: string,
  contentType: string,
  fileHash?: string
): Promise<{ key: string; hash: string; size: number }> {
  const client = getS3Client()
  const hash = fileHash || calculateFileHash(fileContent)

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        Metadata: {
          hash: hash,
          uploadedAt: new Date().toISOString(),
        },
      })
    )

    console.info("[R2] File uploaded successfully:", {
      key: key.substring(0, 50) + "...",
      size: fileContent.length,
      hash: hash.slice(0, 8),
    })

    return {
      key,
      hash: hash,
      size: fileContent.length,
    }
  } catch (error: any) {
    console.error("[R2] File upload failed:", {
      error: error.message,
      key: key.substring(0, 50),
    })
    throw new Error(`File upload failed: ${error.message}`)
  }
}

/**
 * Get a signed URL for file download
 *
 * @param key - Storage key
 * @param expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const client = getS3Client()

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const url = await getSignedUrl(client, command, { expiresIn })
    return url
  } catch (error: any) {
    console.error("[R2] Failed to generate download URL:", {
      error: error.message,
      key: key.substring(0, 50),
    })
    throw new Error(`Failed to generate download URL: ${error.message}`)
  }
}

/**
 * Check if a file exists in storage
 *
 * @param key - Storage key
 * @returns True if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  const client = getS3Client()

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    )
    return true
  } catch (error: any) {
    if (error.name === "NotFound") {
      return false
    }
    console.error("[R2] File existence check failed:", {
      error: error.message,
      key: key.substring(0, 50),
    })
    return false
  }
}

/**
 * Upload resume file with automatic key generation
 *
 * @param userId - User ID
 * @param filename - Original filename
 * @param content - File content
 * @param contentType - MIME type
 * @returns Upload result with key, hash, and size
 */
export async function uploadResume(
  userId: string,
  filename: string,
  content: Buffer,
  contentType: string
): Promise<{ key: string; hash: string; size: number }> {
  const fileHash = calculateFileHash(content)
  const key = generateFileKey(userId, filename, fileHash)

  // Pass pre-calculated hash to avoid redundant calculation
  const result = await uploadFile(content, key, contentType, fileHash)

  return result
}