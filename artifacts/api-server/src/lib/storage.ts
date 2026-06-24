import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";
import crypto from "crypto";
import path from "path";

/**
 * Backblaze B2 / S3-compatible cloud storage wrapper.
 *
 * Uses the AWS S3 SDK configured for Backblaze B2's S3-compatible API.
 * In dev mode (no B2 keys configured), falls back to a no-op logger.
 */

const B2_KEY_ID = process.env["B2_KEY_ID"] ?? "";
const B2_APPLICATION_KEY = process.env["B2_APPLICATION_KEY"] ?? "";
const B2_BUCKET_NAME = process.env["B2_BUCKET_NAME"] ?? "";
const B2_ENDPOINT = process.env["B2_ENDPOINT"] ?? "https://s3.us-west-004.backblazeb2.com";

const isConfigured = !!(B2_KEY_ID && B2_APPLICATION_KEY && B2_BUCKET_NAME);

// Fix #30: Singleton S3Client — created once, reused across all uploads
let _s3Client: S3Client | null = null;
function getClient(): S3Client | null {
  if (!isConfigured) return null;
  if (_s3Client) return _s3Client;
  _s3Client = new S3Client({
    region: "us-west-004",
    endpoint: B2_ENDPOINT,
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    },
    // Fix #31: Use endpoint config instead of deprecated forcePathStyle
    // forcePathStyle is deprecated in AWS SDK v3 — endpoint + region handles path-style automatically for B2
  });
  return _s3Client;
}

/**
 * Upload a buffer or file to cloud storage.
 * Returns the public key (filename path) of the uploaded file.
 */
export async function uploadFile(
  buffer: Buffer,
  originalname: string,
  folder = "uploads",
): Promise<{ key: string; url: string } | null> {
  if (!isConfigured) {
    logger.warn({ folder, originalname }, "B2 not configured — skipping upload");
    return null;
  }

  const client = getClient();
  if (!client) return null;

  const ext = path.extname(originalname) || ".jpg";
  const key = `${folder}/${crypto.randomUUID()}${ext}`;

  // MIME type map: convert file extension to proper Content-Type
  const MIME_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  const extClean = ext.replace(".", "").toLowerCase();
  const contentType = MIME_TYPES[extClean] || `image/${extClean}`;

  // Fix #10: Add retry logic for transient B2 failures
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: B2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      logger.info({ key, attempt }, "File uploaded to B2");
      return { key, url: `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${key}` };
    } catch (err) {
      logger.error({ err, key, attempt, maxRetries: MAX_RETRIES }, "B2 upload attempt failed");
      if (attempt === MAX_RETRIES) {
        logger.error({ err, key }, "B2 upload failed after all retries");
        return null;
      }
      // Wait before retrying (exponential backoff: 500ms, 1s, 2s...)
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
    }
  }
  return null;
}

/**
 * Generate a time-limited signed URL for private files.
 */
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!isConfigured) {
    logger.warn({ key }, "B2 not configured — returning null URL");
    return null;
  }

  const client = getClient();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return url;
  } catch (err) {
    logger.error({ err, key }, "Failed to generate signed URL");
    return null;
  }
}

/**
 * Delete a file from cloud storage.
 */
export async function deleteFile(key: string): Promise<boolean> {
  if (!isConfigured) {
    logger.warn({ key }, "B2 not configured — skipping delete");
    return false;
  }

  const client = getClient();
  if (!client) return false;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: key,
      }),
    );
    logger.info({ key }, "File deleted from B2");
    return true;
  } catch (err) {
    logger.error({ err, key }, "B2 delete failed");
    return false;
  }
}

export { isConfigured as isB2Configured };
