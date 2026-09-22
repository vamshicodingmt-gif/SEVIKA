import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "@/lib/api-helpers";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_MB } from "@/lib/constants";

/**
 * File storage for Sevika — portfolio images/videos, certificates, avatars.
 *
 * 1. AWS S3 (primary): presigned PUT URL, uploaded directly from the browser.
 * 2. Cloudinary (fallback): signed upload params when S3 is not configured.
 * 3. Local disk (development only): /api/upload/local writes to /public/uploads.
 *
 * Sevika never stores payment documents — media is limited to
 * JPG / PNG / WebP / PDF / MP4 for portfolios, certificates and avatars.
 */

export interface UploadTarget {
  storage: "s3" | "cloudinary" | "local";
  uploadUrl: string;
  fileUrl: string;
  /** Extra form fields required by some storages (Cloudinary). */
  fields?: Record<string, string>;
}

export function extensionOf(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
}

export function validateUpload(contentType: string) {
  if (!ALLOWED_UPLOAD_TYPES.includes(contentType)) {
    throw new ApiError(400, `Unsupported file type (${contentType}). Allowed: JPG, PNG, WebP, PDF, MP4.`);
  }
}

async function s3Target(filename: string, contentType: string): Promise<UploadTarget> {
  const region = process.env.S3_REGION!;
  const bucket = process.env.S3_BUCKET_NAME!;
  const key = `sevika/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${extensionOf(filename)}`;
  const client = new S3Client({ region });
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 600 });
  return {
    storage: "s3",
    uploadUrl,
    fileUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
  };
}

function cloudinaryTarget(contentType: string): UploadTarget {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const secret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha1")
    .update(`timestamp=${timestamp}${secret}`)
    .digest("hex");
  const resourceType = contentType === "video/mp4" ? "video" : contentType === "application/pdf" ? "image" : "image";
  return {
    storage: "cloudinary",
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`,
    fileUrl: "", // returned by Cloudinary after upload; client uses secure_url
    fields: { api_key: apiKey, timestamp, signature },
  };
}

export async function createUploadTarget(
  filename: string,
  contentType: string
): Promise<UploadTarget> {
  validateUpload(contentType);

  if (process.env.S3_BUCKET_NAME && process.env.S3_REGION) {
    return s3Target(filename, contentType);
  }
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    return cloudinaryTarget(contentType);
  }
  if (process.env.NODE_ENV !== "production") {
    const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${extensionOf(filename)}`;
    return {
      storage: "local",
      uploadUrl: `/api/upload/local?name=${encodeURIComponent(name)}`,
      fileUrl: `/uploads/${name}`,
    };
  }
  throw new ApiError(
    503,
    "File storage is not configured. Set S3 or Cloudinary environment variables."
  );
}

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
