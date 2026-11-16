import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config.js';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: config.awsRegion });
  }
  return s3Client;
}

/**
 * Temporarily stores the uploaded binary contract in S3 encrypted with SSE-S3 (AES256).
 * S3 Lifecycle Rule expires objects automatically after 24 hours.
 * No-ops gracefully during local development when UPLOADS_BUCKET is unset.
 */
export async function storeEncryptedUploadIfConfigured(
  auditId: string,
  extension: string,
  buffer: Buffer,
): Promise<void> {
  const bucket = process.env.UPLOADS_BUCKET;
  if (!bucket) return;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `uploads/${auditId}.${extension}`,
      Body: buffer,
      ServerSideEncryption: 'AES256',
      ContentType:
        extension === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
  );
}
