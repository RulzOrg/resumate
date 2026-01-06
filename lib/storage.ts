/**
 * Storage utilities
 * All storage operations now use Supabase Storage
 * This file maintains backwards compatibility for existing imports
 */

import { Socket } from "net"
import * as supabaseStorage from "./supabase-storage"

export { STORAGE_BUCKETS } from "./supabase-storage"

/**
 * Upload buffer to storage
 */
export async function uploadBufferToS3(params: {
  buffer: Buffer
  key: string
  contentType: string
  cacheControl?: string
  acl?: "private" | "public-read"
}): Promise<{ url: string; key: string }> {
  // Determine bucket from key (exports/ prefix or default to exports)
  const bucket = params.key.startsWith("resumes/") 
    ? supabaseStorage.STORAGE_BUCKETS.RESUMES 
    : supabaseStorage.STORAGE_BUCKETS.EXPORTS
  const supabaseKey = params.key.replace(/^(resumes|exports)\//, "")
  
  await supabaseStorage.uploadFile(bucket, params.buffer, supabaseKey, params.contentType)
  
  // Get signed URL for private buckets
  const url = await supabaseStorage.getSignedUrl(bucket, supabaseKey, 3600)
  return { url, key: params.key }
}

/**
 * Get signed download URL
 */
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const bucket = key.startsWith("resumes/") 
    ? supabaseStorage.STORAGE_BUCKETS.RESUMES 
    : supabaseStorage.STORAGE_BUCKETS.EXPORTS
  const supabaseKey = key.replace(/^(resumes|exports)\//, "")
  
  return supabaseStorage.getSignedUrl(bucket, supabaseKey, expiresInSeconds)
}

/**
 * Build storage key
 */
export function buildS3Key(parts: { userId: string; kind: string; fileName: string }): string {
  return supabaseStorage.buildStorageKey(parts)
}

// ============== Virus Scanning (ClamAV) ==============
// This functionality is independent of storage backend

const clamavHost = process.env.CLAMAV_HOST
const clamavPort = Number(process.env.CLAMAV_PORT || "3310")
const clamavTimeoutMs = Number(process.env.CLAMAV_TIMEOUT_MS || "10000")

export type VirusScanStatus = "skipped" | "clean" | "infected" | "error"

export interface VirusScanResult {
  status: VirusScanStatus
  signature?: string
  error?: string
}

function parseClamAVResponse(message: string): VirusScanResult {
  const cleaned = message.trim().replace(/\0/g, "")
  if (!cleaned) {
    return { status: "error", error: "Empty response from virus scanner" }
  }

  if (cleaned.includes("FOUND")) {
    const afterColon = cleaned.split(":").slice(1).join(":")
    const signature = afterColon.replace("FOUND", "").trim()
    return { status: "infected", signature }
  }

  if (cleaned.endsWith("OK")) {
    return { status: "clean" }
  }

  return { status: "error", error: cleaned }
}

export async function scanBufferForViruses(buffer: Buffer): Promise<VirusScanResult> {
  if (!clamavHost) {
    return { status: "skipped" }
  }

  return await new Promise<VirusScanResult>((resolve) => {
    const socket = new Socket()
    let resolved = false
    let response = ""

    const finalize = (result: VirusScanResult) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      if (!socket.destroyed) socket.destroy()
      resolve(result)
    }

    const timeout = setTimeout(() => {
      finalize({ status: "error", error: "Virus scan timed out" })
    }, clamavTimeoutMs)

    socket.on("error", (err) => {
      finalize({ status: "error", error: err.message })
    })

    socket.on("data", (chunk) => {
      response += chunk.toString("utf8")
      if (response.includes("OK") || response.includes("FOUND") || response.includes("ERROR")) {
        finalize(parseClamAVResponse(response))
      }
    })

    socket.on("end", () => {
      if (!resolved) {
        finalize(parseClamAVResponse(response))
      }
    })

    socket.connect(clamavPort, clamavHost, () => {
      const chunkSize = 32 * 1024
      socket.write("nINSTREAM\n")

      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const chunk = buffer.subarray(offset, offset + chunkSize)
        const sizeBuf = Buffer.alloc(4)
        sizeBuf.writeUInt32BE(chunk.length)
        socket.write(sizeBuf)
        socket.write(chunk)
      }

      const zero = Buffer.alloc(4)
      socket.write(zero)
      socket.end()
    })
  })
}
