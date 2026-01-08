#!/usr/bin/env npx tsx
/**
 * Setup Supabase Storage Buckets
 * Creates the 'resumes' and 'exports' buckets with proper configuration
 * 
 * Run with: npx tsx scripts/setup-supabase-storage.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:")
  console.error("   - SUPABASE_URL:", supabaseUrl ? "✅" : "❌")
  console.error("   - SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✅" : "❌")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface BucketConfig {
  id: string
  name: string
  public: boolean
  fileSizeLimit: number
  allowedMimeTypes: string[]
}

const BUCKETS: BucketConfig[] = [
  {
    id: "resumes",
    name: "resumes",
    public: false,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
  },
  {
    id: "exports",
    name: "exports",
    public: false,
    fileSizeLimit: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
  },
]

async function createBucket(config: BucketConfig): Promise<boolean> {
  console.log(`\n📦 Setting up bucket: ${config.id}`)

  // Check if bucket exists
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error(`   ❌ Error listing buckets: ${listError.message}`)
    return false
  }

  const bucketExists = existingBuckets?.some((b) => b.id === config.id)

  if (bucketExists) {
    console.log(`   ⚠️  Bucket '${config.id}' already exists, updating configuration...`)

    const { error: updateError } = await supabase.storage.updateBucket(config.id, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
      allowedMimeTypes: config.allowedMimeTypes,
    })

    if (updateError) {
      console.error(`   ❌ Error updating bucket: ${updateError.message}`)
      return false
    }

    console.log(`   ✅ Bucket '${config.id}' updated successfully`)
  } else {
    const { error: createError } = await supabase.storage.createBucket(config.id, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
      allowedMimeTypes: config.allowedMimeTypes,
    })

    if (createError) {
      console.error(`   ❌ Error creating bucket: ${createError.message}`)
      return false
    }

    console.log(`   ✅ Bucket '${config.id}' created successfully`)
  }

  // Log configuration
  console.log(`   📊 Configuration:`)
  console.log(`      - Public: ${config.public ? "Yes" : "No"}`)
  console.log(`      - Max file size: ${(config.fileSizeLimit / 1024 / 1024).toFixed(0)}MB`)
  console.log(`      - Allowed types: ${config.allowedMimeTypes.length} MIME types`)

  return true
}

async function verifyBuckets(): Promise<void> {
  console.log("\n🔍 Verifying bucket setup...")

  const { data: buckets, error } = await supabase.storage.listBuckets()

  if (error) {
    console.error(`   ❌ Error listing buckets: ${error.message}`)
    return
  }

  const targetBucketIds = BUCKETS.map((b) => b.id)
  const createdBuckets = buckets?.filter((b) => targetBucketIds.includes(b.id)) || []

  console.log(`\n📋 Supabase Storage Buckets:`)
  for (const bucket of createdBuckets) {
    console.log(`   - ${bucket.id}: ${bucket.public ? "🌐 Public" : "🔒 Private"}`)
  }

  if (createdBuckets.length === BUCKETS.length) {
    console.log("\n✅ All storage buckets are properly configured!")
  } else {
    const missing = targetBucketIds.filter((id) => !createdBuckets.some((b) => b.id === id))
    console.log(`\n⚠️  Missing buckets: ${missing.join(", ")}`)
  }
}

async function testUpload(): Promise<void> {
  console.log("\n🧪 Testing upload capability...")

  const testContent = Buffer.from("test file content")
  const testKey = `_test/${Date.now()}_test.txt`

  try {
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(testKey, testContent, {
        contentType: "text/plain",
        upsert: true,
      })

    if (uploadError) {
      // MIME type restriction will block txt files - this is expected
      if (uploadError.message.includes("mime")) {
        console.log("   ✅ MIME type restriction working correctly")
      } else {
        console.log(`   ⚠️  Upload test: ${uploadError.message}`)
      }
    } else {
      // Clean up test file
      await supabase.storage.from("resumes").remove([testKey])
      console.log("   ✅ Upload and delete test passed")
    }
  } catch (err) {
    console.log(`   ⚠️  Upload test error: ${err}`)
  }
}

async function main(): Promise<void> {
  console.log("🚀 Supabase Storage Setup")
  console.log("=".repeat(50))
  console.log(`   URL: ${supabaseUrl}`)

  let success = true

  for (const bucket of BUCKETS) {
    const result = await createBucket(bucket)
    if (!result) success = false
  }

  await verifyBuckets()
  await testUpload()

  console.log("\n" + "=".repeat(50))
  if (success) {
    console.log("✅ Storage setup complete!")
    console.log("\n💡 Next steps:")
    console.log("   1. Run the SQL script for RLS policies if needed:")
    console.log("      scripts/create-supabase-storage-buckets.sql")
    console.log("   2. Set USE_SUPABASE_STORAGE=true in .env.local")
  } else {
    console.log("⚠️  Storage setup completed with errors")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("❌ Setup failed:", err)
  process.exit(1)
})


