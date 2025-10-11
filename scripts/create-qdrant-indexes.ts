#!/usr/bin/env tsx
/**
 * Creates required payload indexes on Qdrant collection
 * 
 * Run this script to ensure all necessary indexes exist on your production collection:
 * npx tsx scripts/create-qdrant-indexes.ts
 * 
 * This is only needed if you have an existing collection without indexes.
 * New collections will automatically have these indexes created via ensureCollection().
 */

import { qdrant, QDRANT_COLLECTION, QDRANT_URL } from "../lib/qdrant"

async function createIndexes() {
  console.log(`Creating indexes on collection: ${QDRANT_COLLECTION}`)
  console.log(`Qdrant URL: ${QDRANT_URL}`)

  try {
    // Check if collection exists
    const collections = await qdrant.getCollections()
    const exists = collections.collections?.some((c: any) => c.name === QDRANT_COLLECTION)
    
    if (!exists) {
      console.error(`❌ Collection "${QDRANT_COLLECTION}" does not exist`)
      console.log("Create the collection first or run the app to auto-create it")
      process.exit(1)
    }

    console.log(`✓ Collection "${QDRANT_COLLECTION}" exists`)

    // Create userId index
    console.log("\nCreating userId index...")
    try {
      await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: "userId",
        field_schema: "keyword",
      } as any)
      console.log("✓ userId index created successfully")
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status
      if (status === 409) {
        console.log("✓ userId index already exists")
      } else {
        console.error(`❌ Failed to create userId index:`, error.message || error)
        throw error
      }
    }

    console.log("\n✅ All indexes created successfully")
    
  } catch (error) {
    console.error("\n❌ Error creating indexes:", error)
    process.exit(1)
  }
}

createIndexes()

