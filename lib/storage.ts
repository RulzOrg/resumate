import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Support Cloudflare R2 (preferred) and fallback to AWS S3 if R2 is not configured
const r2AccountId = process.env.R2_ACCOUNT_ID
const bucketName = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL // optional CDN/public base URL override

const isR2 = Boolean(r2AccountId)
const region = isR2 ? (process.env.R2_REGION || "auto") : (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION)

if (!bucketName) {
  console.warn("Object storage bucket not configured. Set R2_BUCKET_NAME (or S3_BUCKET_NAME).")
}

export const s3 = new S3Client({
  region,
  endpoint: isR2 ? `https://${r2AccountId}.r2.cloudflarestorage.com` : undefined,
  forcePathStyle: isR2 ? true : undefined,
  credentials: isR2
    ? (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! }
        : undefined)
    : (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }
        : undefined),
})

export async function uploadBufferToS3(params: {
  buffer: Buffer
  key: string
  contentType: string
  cacheControl?: string
  acl?: "private" | "public-read"
}): Promise<{ url: string; key: string }> {
  if (!bucketName) throw new Error("Bucket name not set (R2_BUCKET_NAME or S3_BUCKET_NAME)")
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    Body: params.buffer,
    ContentType: params.contentType,
    CacheControl: params.cacheControl ?? "public, max-age=31536000, immutable",
    ACL: params.acl ?? "public-read",
  }))

  const url = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(params.key)}`
    : (isR2
        // For R2 without a public base URL, default to account endpoint with path-style bucket
        ? `https://${r2AccountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucketName)}/${encodeURIComponent(params.key)}`
        // For AWS S3 default public URL pattern
        : `https://${bucketName}.s3.${region}.amazonaws.com/${encodeURIComponent(params.key)}`)

  return { url, key: params.key }
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  if (!bucketName) throw new Error("Bucket name not set (R2_BUCKET_NAME or S3_BUCKET_NAME)")
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key })
  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
}

export function buildS3Key(parts: { userId: string; kind: string; fileName: string }): string {
  const sanitized = parts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const ts = Date.now()
  return `uploads/${parts.userId}/${parts.kind}/${ts}-${sanitized}`
}


