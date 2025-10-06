# Qdrant Production Setup Guide

This guide will help you set up Qdrant vector database for production deployment to fix the Step 2 "Review Job" AI scoring feature.

## Problem

The AI scoring feature works locally but fails in production with errors like:
- "Vector search service unavailable"
- "Connection refused" 
- "fetch failed"

**Root Cause**: Production environment is missing Qdrant configuration. Local development defaults to `http://localhost:6333`, but production needs a hosted Qdrant instance.

## Solution: Use Qdrant Cloud (Recommended)

Qdrant Cloud offers a free tier perfect for getting started.

### Step 1: Create Qdrant Cloud Account

1. Go to https://cloud.qdrant.io
2. Sign up for a free account
3. Create a new cluster
   - Choose a region closest to your Vercel deployment
   - Free tier: 1GB storage, sufficient for ~10,000-50,000 resume bullets
   - Takes ~2-3 minutes to provision

### Step 2: Get Connection Details

1. Click on your cluster
2. Copy the **Cluster URL** (format: `https://xyz-example.eu-central.aws.cloud.qdrant.io:6333`)
3. Create an **API Key**:
   - Go to "Access" or "API Keys" section
   - Create a new API key
   - Copy and save it securely (shown only once)

### Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables for **Production** environment:

```
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your_api_key_here
QDRANT_COLLECTION=resume_bullets
```

**Important**: Add these for all environments (Production, Preview, Development) or at least Production.

### Step 4: Redeploy

1. Trigger a new deployment in Vercel (or push a commit)
2. The app will automatically create the `resume_bullets` collection on first use
3. Verify by visiting: `https://your-app.vercel.app/api/health/qdrant`

Expected response:
```json
{
  "status": "healthy",
  "url": "https://your-cluster.cloud.qdrant.io:6333",
  "collection": "resume_bullets",
  "collectionExists": true,
  "responseTime": "123ms",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Alternative: Self-Hosted Qdrant

If you prefer to self-host Qdrant:

### Option A: Railway

1. Go to https://railway.app
2. Create new project → Deploy Qdrant
3. Use the provided connection URL
4. Set `QDRANT_URL` in Vercel to Railway's public URL

### Option B: Docker on VPS

```bash
# On your VPS
docker run -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
```

Make sure to:
- Expose port 6333 with proper firewall rules
- Use HTTPS/TLS for production
- Configure authentication

## Verification Checklist

- [ ] Qdrant Cloud cluster created and running
- [ ] `QDRANT_URL` set in Vercel (Production)
- [ ] `QDRANT_API_KEY` set in Vercel (Production)  
- [ ] `QDRANT_COLLECTION` set to `resume_bullets`
- [ ] Redeployed application
- [ ] Health check passes: `/api/health/qdrant` returns `status: "healthy"`
- [ ] Step 2 "Review Job" feature works without errors

## Testing the Fix

1. Go to your production app
2. Navigate to AI Resume Optimization
3. Select a master resume (Step 1)
4. Click "Continue" to Step 2 "Review Job"
5. Verify that AI Score and Evidence sections load without errors

## Cost Estimate

**Qdrant Cloud Free Tier**:
- 1GB storage
- ~10,000-50,000 resume bullets (depending on bullet length)
- Free forever
- Sufficient for small to medium applications

**Paid Tier** (if needed):
- Starts at ~$25/month for 4GB
- Auto-scales based on usage

## Troubleshooting

### Health check returns "unhealthy"

Check the error message:
- `Connection failed` → Verify QDRANT_URL is correct
- `Unauthorized` → Verify QDRANT_API_KEY is correct
- `fetch failed` → Check cluster is running in Qdrant Cloud dashboard

### "Collection does not exist" error

The app auto-creates the collection. If you see this error:
1. Ensure user has uploaded and indexed at least one resume
2. Check that indexing worked via: `/api/debug/collections` (if you have such endpoint)
3. Manually trigger indexing by re-uploading a resume

### Still getting errors after setup

1. Check Vercel deployment logs for detailed error messages
2. Verify all environment variables are set for Production environment (not just Development)
3. Clear Vercel build cache and redeploy
4. Check Qdrant Cloud dashboard → Logs for connection attempts

## Support

- Qdrant Documentation: https://qdrant.tech/documentation/
- Qdrant Cloud Support: https://cloud.qdrant.io/support
- GitHub Issues: Report issues in your repository

## Next Steps

After Qdrant is working:
1. Upload a master resume to test full workflow
2. Create a job analysis to test AI scoring
3. Monitor Qdrant Cloud usage in dashboard
4. Consider upgrading if you hit free tier limits
