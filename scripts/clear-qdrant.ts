import { qdrant, QDRANT_COLLECTION } from "../lib/qdrant"

async function clearQdrantCollection() {
  try {
    console.log(`[clear-qdrant] Attempting to delete collection: ${QDRANT_COLLECTION}`)

    // Check if collection exists
    const collections = await qdrant.getCollections()
    const exists = collections.collections?.some((c: any) => c.name === QDRANT_COLLECTION)

    if (!exists) {
      console.log(`[clear-qdrant] ✓ Collection ${QDRANT_COLLECTION} does not exist - nothing to clear`)
      return
    }

    // Delete the collection
    await qdrant.deleteCollection(QDRANT_COLLECTION)
    console.log(`[clear-qdrant] ✓ Successfully deleted collection: ${QDRANT_COLLECTION}`)
    console.log(`[clear-qdrant] Collection will be recreated on next indexing operation`)

  } catch (error: any) {
    console.error(`[clear-qdrant] Error:`, error.message || error)
    process.exit(1)
  }
}

clearQdrantCollection()
  .then(() => {
    console.log('[clear-qdrant] Complete')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[clear-qdrant] Fatal error:', err)
    process.exit(1)
  })
