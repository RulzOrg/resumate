/**
 * Storage utilities
 * All storage operations now use Supabase Storage
 * This file maintains backwards compatibility for existing imports
 */

import crypto from "crypto"
import * as supabaseStorage from "./supabase-storage"

export { STORAGE_BUCKETS } from "./supabase-storage"

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
  const sanitizedName = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .slice(0, 50)

  return `resumes/${userId}/${timestamp}_${fileHash.slice(0, 8)}_${sanitizedName}`
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  fileContent: Buffer,
  key: string,
  contentType: string,
  fileHash?: string
): Promise<{ key: string; hash: string; size: number }> {
  // Extract bucket from key prefix (e.g., "resumes/user123/..." -> "resumes")
  const bucket = key.startsWith("resumes/") 
    ? supabaseStorage.STORAGE_BUCKETS.RESUMES 
    : supabaseStorage.STORAGE_BUCKETS.EXPORTS
  
  // Remove the bucket prefix from key for Supabase
  const supabaseKey = key.replace(/^(resumes|exports)\//, "")
  
  return supabaseStorage.uploadFile(bucket, fileContent, supabaseKey, contentType, fileHash)
}

/**
 * Get a signed URL for file download
 */
export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const bucket = key.startsWith("resumes/") 
    ? supabaseStorage.STORAGE_BUCKETS.RESUMES 
    : supabaseStorage.STORAGE_BUCKETS.EXPORTS
  const supabaseKey = key.replace(/^(resumes|exports)\//, "")
  
  return supabaseStorage.getSignedUrl(bucket, supabaseKey, expiresIn)
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(key: string): Promise<boolean> {
  const bucket = key.startsWith("resumes/") 
    ? supabaseStorage.STORAGE_BUCKETS.RESUMES 
    : supabaseStorage.STORAGE_BUCKETS.EXPORTS
  const supabaseKey = key.replace(/^(resumes|exports)\//, "")
  
  return supabaseStorage.fileExists(bucket, supabaseKey)
}

/**
 * Upload resume file with automatic key generation
 */
export async function uploadResume(
  userId: string,
  filename: string,
  content: Buffer,
  contentType: string
): Promise<{ key: string; hash: string; size: number }> {
  return supabaseStorage.uploadResume(userId, filename, content, contentType)
}
