import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getS3Client(): S3Client {
  return new S3Client({
    region: assertEnv("S3_REGION"),
    credentials: {
      accessKeyId: assertEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: assertEnv("S3_SECRET_ACCESS_KEY")
    }
  });
}

export async function createSignedUploadUrl(input: {
  key: string;
  contentType: string;
  expiresInSec?: number;
}): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: assertEnv("S3_BUCKET"),
    Key: input.key,
    ContentType: input.contentType
  });
  return getSignedUrl(client, command, { expiresIn: input.expiresInSec ?? 300 });
}

export async function createSignedDownloadUrl(input: {
  key: string;
  expiresInSec?: number;
}): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: assertEnv("S3_BUCKET"),
    Key: input.key
  });
  return getSignedUrl(client, command, { expiresIn: input.expiresInSec ?? 300 });
}
