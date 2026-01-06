/**
 * Supabase Storage utilities
 * Handles file uploads and retrieval using Supabase Storage
 */

import { getSupabaseServerClient } from "./supabase"
import crypto from "crypto"

// Bucket names matching the plan
export const STORAGE_BUCKETS = {
  RESUMES: "resumes",
  EXPORTS: "exports",
} as const

export type BucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

/**
 * Calculate SHA-256 hash of file content
 */
export function calculateFileHash(content: Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

/**
 * Generate a unique file key for storage
 */
export function generateFileKey(userId: string, originalFilename: string, fileHash: string): string {
  const timestamp = Date.now()
  const ext = originalFilename.split(".").pop() || "pdf"
  const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 50)

  return `${userId}/${timestamp}_${fileHash.slice(0, 8)}_${sanitizedName}`
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: BucketName,
  fileContent: Buffer,
  key: string,
  contentType: string,
  fileHash?: string
): Promise<{ key: string; hash: string; size: number }> {
  const supabase = getSupabaseServerClient()
  const hash = fileHash || calculateFileHash(fileContent)

  const { error } = await supabase.storage.from(bucket).upload(key, fileContent, {
    contentType,
    upsert: false,
    duplex: "half",
    metadata: {
      hash,
      uploadedAt: new Date().toISOString(),
    },
  })

  if (error) {
    console.error("[Supabase Storage] Upload failed:", {
      error: error.message,
      key: key.substring(0, 50),
      bucket,
    })
    throw new Error(`File upload failed: ${error.message}`)
  }

  console.info("[Supabase Storage] File uploaded successfully:", {
    bucket,
    key: key.substring(0, 50) + "...",
    size: fileContent.length,
    hash: hash.slice(0, 8),
  })

  return {
    key,
    hash,
    size: fileContent.length,
  }
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadFile(bucket: BucketName, key: string): Promise<Buffer> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase.storage.from(bucket).download(key)

  if (error) {
    console.error("[Supabase Storage] Download failed:", {
      error: error.message,
      key: key.substring(0, 50),
      bucket,
    })
    throw new Error(`File download failed: ${error.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Get a signed URL for file download
 */
export async function getSignedUrl(
  bucket: BucketName,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn)

  if (error) {
    console.error("[Supabase Storage] Failed to generate signed URL:", {
      error: error.message,
      key: key.substring(0, 50),
      bucket,
    })
    throw new Error(`Failed to generate signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(bucket: BucketName, key: string): Promise<boolean> {
  const supabase = getSupabaseServerClient()

  // List files with exact path match - Supabase doesn't have a HEAD equivalent
  const pathParts = key.split("/")
  const filename = pathParts.pop()
  const folder = pathParts.join("/")

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { search: filename, limit: 1 })

  if (error) {
    console.error("[Supabase Storage] File existence check failed:", {
      error: error.message,
      key: key.substring(0, 50),
      bucket,
    })
    return false
  }

  return data.some((file) => file.name === filename)
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: BucketName, key: string): Promise<boolean> {
  const supabase = getSupabaseServerClient()

  const { error } = await supabase.storage.from(bucket).remove([key])

  if (error) {
    console.error("[Supabase Storage] Delete failed:", {
      error: error.message,
      key: key.substring(0, 50),
      bucket,
    })
    return false
  }

  console.info("[Supabase Storage] File deleted:", { bucket, key: key.substring(0, 50) })
  return true
}

/**
 * List files in a folder
 */
export async function listFiles(
  bucket: BucketName,
  folder: string,
  options?: { limit?: number; offset?: number }
): Promise<{ name: string; id: string; created_at: string }[]> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: options?.limit || 100,
    offset: options?.offset || 0,
  })

  if (error) {
    console.error("[Supabase Storage] List failed:", {
      error: error.message,
      folder,
      bucket,
    })
    throw new Error(`Failed to list files: ${error.message}`)
  }

  return data.map((file) => ({
    name: file.name,
    id: file.id || "",
    created_at: file.created_at || "",
  }))
}

/**
 * Get public URL for a file (if bucket is public)
 */
export function getPublicUrl(bucket: BucketName, key: string): string {
  const supabase = getSupabaseServerClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(key)
  return data.publicUrl
}

/**
 * Upload resume file with automatic key generation
 * Direct replacement for R2's uploadResume function
 */
export async function uploadResume(
  userId: string,
  filename: string,
  content: Buffer,
  contentType: string
): Promise<{ key: string; hash: string; size: number }> {
  const fileHash = calculateFileHash(content)
  const key = generateFileKey(userId, filename, fileHash)

  return uploadFile(STORAGE_BUCKETS.RESUMES, content, key, contentType, fileHash)
}

/**
 * Get download URL for a resume
 */
export async function getResumeDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  return getSignedUrl(STORAGE_BUCKETS.RESUMES, key, expiresIn)
}

/**
 * Upload export file (DOCX/PDF)
 */
export async function uploadExport(
  userId: string,
  filename: string,
  content: Buffer,
  contentType: string
): Promise<{ key: string; hash: string; size: number }> {
  const fileHash = calculateFileHash(content)
  const key = generateFileKey(userId, filename, fileHash)

  return uploadFile(STORAGE_BUCKETS.EXPORTS, content, key, contentType, fileHash)
}

/**
 * Get download URL for an export
 */
export async function getExportDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  return getSignedUrl(STORAGE_BUCKETS.EXPORTS, key, expiresIn)
}

/**
 * Build S3-compatible key (for migration compatibility)
 */
export function buildStorageKey(parts: { userId: string; kind: string; fileName: string }): string {
  const sanitized = parts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const ts = Date.now()
  return `${parts.userId}/${parts.kind}/${ts}-${sanitized}`
}

