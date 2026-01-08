#!/usr/bin/env npx tsx
/**
 * Validate Supabase Storage Configuration
 * 
 * This script tests:
 * 1. Supabase connection
 * 2. Bucket existence and configuration
 * 3. Upload/download/signedUrl operations
 * 4. Feature flag routing
 * 
 * Run with: npx tsx scripts/validate-supabase-storage.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import crypto from "crypto"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const useSupabaseStorage = process.env.USE_SUPABASE_STORAGE === "true"

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration?: number
}

const results: TestResult[] = []

function log(message: string): void {
  console.log(message)
}

function addResult(name: string, passed: boolean, error?: string, duration?: number): void {
  results.push({ name, passed, error, duration })
  const status = passed ? "✅" : "❌"
  const timeStr = duration ? ` (${duration}ms)` : ""
  log(`   ${status} ${name}${timeStr}${error ? ` - ${error}` : ""}`)
}

async function runTest<T>(
  name: string,
  testFn: () => Promise<T>
): Promise<T | null> {
  const start = Date.now()
  try {
    const result = await testFn()
    addResult(name, true, undefined, Date.now() - start)
    return result
  } catch (err: any) {
    addResult(name, false, err.message, Date.now() - start)
    return null
  }
}

async function main(): Promise<void> {
  log("🧪 Supabase Storage Validation")
  log("=".repeat(60))
  
  // Check environment
  log("\n📋 Environment Check:")
  
  if (!supabaseUrl) {
    addResult("SUPABASE_URL is set", false, "Missing environment variable")
  } else {
    addResult("SUPABASE_URL is set", true)
  }
  
  if (!supabaseServiceKey) {
    addResult("SUPABASE_SERVICE_ROLE_KEY is set", false, "Missing environment variable")
  } else {
    addResult("SUPABASE_SERVICE_ROLE_KEY is set", true)
  }
  
  addResult("USE_SUPABASE_STORAGE flag", useSupabaseStorage, useSupabaseStorage ? undefined : "Set to false - storage routes to R2")
  
  if (!supabaseUrl || !supabaseServiceKey) {
    log("\n❌ Cannot continue without Supabase credentials")
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  
  // Test 1: Connection
  log("\n🔌 Connection Test:")
  await runTest("Connect to Supabase", async () => {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) throw error
    return data
  })
  
  // Test 2: Bucket existence
  log("\n📦 Bucket Tests:")
  const { data: buckets } = await supabase.storage.listBuckets()
  
  const resumesBucket = buckets?.find(b => b.id === "resumes")
  const exportsBucket = buckets?.find(b => b.id === "exports")
  
  addResult("'resumes' bucket exists", !!resumesBucket, resumesBucket ? undefined : "Run setup-supabase-storage.ts first")
  addResult("'exports' bucket exists", !!exportsBucket, exportsBucket ? undefined : "Run setup-supabase-storage.ts first")
  
  if (resumesBucket) {
    addResult("'resumes' bucket is private", !resumesBucket.public, resumesBucket.public ? "Should be private" : undefined)
  }
  if (exportsBucket) {
    addResult("'exports' bucket is private", !exportsBucket.public, exportsBucket.public ? "Should be private" : undefined)
  }
  
  // Test 3: File operations
  if (resumesBucket) {
    log("\n📄 File Operation Tests:")
    
    const testUserId = "_test"
    const testFileName = `${testUserId}/${Date.now()}_validation_test.txt`
    const testContent = Buffer.from(`Test file created at ${new Date().toISOString()}`)
    const testContentType = "text/plain"
    
    // Upload test
    const uploadResult = await runTest("Upload file", async () => {
      const { error } = await supabase.storage
        .from("resumes")
        .upload(testFileName, testContent, {
          contentType: testContentType,
          upsert: true,
        })
      // Allow mime type errors since we're testing with txt
      if (error && !error.message.includes("mime")) {
        throw error
      }
      return true
    })
    
    // Only continue if upload succeeded (or mime error which is expected)
    if (uploadResult !== null) {
      // Try with PDF content type to bypass mime restriction
      const pdfTestFileName = `${testUserId}/${Date.now()}_validation_test.pdf`
      
      const pdfUploadResult = await runTest("Upload file (PDF mime type)", async () => {
        const { error } = await supabase.storage
          .from("resumes")
          .upload(pdfTestFileName, testContent, {
            contentType: "application/pdf",
            upsert: true,
          })
        if (error) throw error
        return true
      })
      
      if (pdfUploadResult) {
        // Download test
        await runTest("Download file", async () => {
          const { data, error } = await supabase.storage
            .from("resumes")
            .download(pdfTestFileName)
          if (error) throw error
          const arrayBuffer = await data.arrayBuffer()
          const downloaded = Buffer.from(arrayBuffer)
          if (downloaded.toString() !== testContent.toString()) {
            throw new Error("Downloaded content does not match")
          }
          return true
        })
        
        // Signed URL test
        await runTest("Create signed URL", async () => {
          const { data, error } = await supabase.storage
            .from("resumes")
            .createSignedUrl(pdfTestFileName, 60)
          if (error) throw error
          if (!data.signedUrl) throw new Error("No signed URL returned")
          return data.signedUrl
        })
        
        // List files test
        await runTest("List files", async () => {
          const { data, error } = await supabase.storage
            .from("resumes")
            .list(testUserId)
          if (error) throw error
          return data
        })
        
        // Cleanup test
        await runTest("Delete file", async () => {
          const { error } = await supabase.storage
            .from("resumes")
            .remove([pdfTestFileName])
          if (error) throw error
          return true
        })
      }
    }
  }
  
  // Test 4: Test the actual library (if available)
  log("\n🔧 Library Integration Test:")
  try {
    // Dynamic import to handle potential import errors
    const supabaseStorageLib = await import("../lib/supabase-storage")
    addResult("Import supabase-storage.ts", true)
    
    // Test constants
    addResult("STORAGE_BUCKETS.RESUMES defined", supabaseStorageLib.STORAGE_BUCKETS.RESUMES === "resumes")
    addResult("STORAGE_BUCKETS.EXPORTS defined", supabaseStorageLib.STORAGE_BUCKETS.EXPORTS === "exports")
    
    // Test hash function
    const testBuffer = Buffer.from("test")
    const hash = supabaseStorageLib.calculateFileHash(testBuffer)
    addResult("calculateFileHash works", hash.length === 64)
    
    // Test key generation
    const key = supabaseStorageLib.generateFileKey("user123", "resume.pdf", hash)
    addResult("generateFileKey works", key.includes("user123") && key.includes("resume"))
    
  } catch (err: any) {
    addResult("Import supabase-storage.ts", false, err.message)
  }
  
  // Summary
  log("\n" + "=".repeat(60))
  log("📊 Validation Summary:")
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  
  log(`   Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
  
  if (failed > 0) {
    log("\n❌ Failed tests:")
    for (const r of results.filter(r => !r.passed)) {
      log(`   - ${r.name}: ${r.error || "Unknown error"}`)
    }
  }
  
  if (failed === 0) {
    log("\n✅ All tests passed!")
    log("\n💡 Next steps:")
    log("   1. Set USE_SUPABASE_STORAGE=true in .env.local")
    log("   2. Restart your development server")
    log("   3. Test file upload/download in the application")
  } else {
    log("\n⚠️  Some tests failed. Review errors above before enabling storage.")
  }
  
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("❌ Validation failed:", err)
  process.exit(1)
})


