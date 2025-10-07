# Qdrant Setup & Troubleshooting

## Required Indexes

The application requires payload indexes on certain fields in your Qdrant collection to enable efficient filtering. These indexes are automatically created when the collection is initialized via `ensureCollection()`.

### userId Index

The `userId` field must have a `keyword` index to enable multi-tenant filtering. This allows the app to efficiently query only the resume bullets belonging to a specific user.

## Automatic Index Creation

For new deployments, indexes are automatically created when the application starts and calls `ensureCollection()`. No manual steps are required.

## Manual Index Creation (For Existing Collections)

If you have an existing Qdrant collection without the required indexes, you'll see this error:

```
Bad request: Index required but not found for "userId" of one of the following types: [keyword, uuid]
```

### Fix: Run the Index Creation Script

```bash
npx tsx scripts/create-qdrant-indexes.ts
```

This script will:
1. Verify your collection exists
2. Create the `userId` keyword index if it doesn't exist
3. Skip indexes that already exist (409 status is OK)

### Alternative: Create Indexes via Qdrant API/Dashboard

You can also create the index manually using the Qdrant API or dashboard:

**Via REST API:**
```bash
curl -X PUT "https://your-qdrant-host:6333/collections/resume_bullets/index" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY" \
  -d '{
    "field_name": "userId",
    "field_schema": "keyword"
  }'
```

**Via Qdrant Dashboard:**
1. Navigate to your collection
2. Go to "Indexes" tab
3. Create a new index:
   - Field name: `userId`
   - Field type: `keyword`

## Environment Variables

Ensure these are set in your production environment:

```env
QDRANT_URL=https://your-instance.qdrant.io:6333
QDRANT_API_KEY=your-api-key
QDRANT_COLLECTION=resume_bullets
```

## Troubleshooting

### Error: "Index required but not found"

**Cause:** The collection exists but doesn't have the required payload index.

**Solution:** Run `npx tsx scripts/create-qdrant-indexes.ts` or create the index manually.

### Error: "Collection does not exist"

**Cause:** The Qdrant collection hasn't been created yet.

**Solution:** The collection will be auto-created on first use. Ensure your API key has write permissions.

### Error: "ECONNREFUSED" or "fetch failed"

**Cause:** Cannot connect to Qdrant server.

**Solution:** 
1. Verify `QDRANT_URL` is correct
2. Check that your Qdrant instance is running
3. Verify network connectivity and firewall rules
4. Confirm API key is valid

## Performance Notes

- Creating indexes on large collections can take time (usually seconds to minutes depending on size)
- Queries will be significantly slower without indexes on filtered fields
- Indexes are created asynchronously; they may not be immediately available

