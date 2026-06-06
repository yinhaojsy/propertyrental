import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config, isProd } from '../config.js';
import {
  ensureLocalStorage,
  writeLocalFile,
  readLocalFile,
  localPublicUrl,
  localUploadUrl,
} from './local-storage.js';

const s3 = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
});

export type StorageMode = 's3' | 'local';
export let storageMode: StorageMode = 's3';

let bucketReady = false;

export async function ensureBucket(): Promise<void> {
  if (bucketReady) return;

  if (process.env.USE_LOCAL_STORAGE === 'true') {
    await ensureLocalStorage();
    storageMode = 'local';
    bucketReady = true;
    console.log(`Using local file storage (${config.uploadsDir})`);
    return;
  }

  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
    storageMode = 's3';
    bucketReady = true;
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
      storageMode = 's3';
      bucketReady = true;
    } catch (err) {
      if (!isProd) {
        await ensureLocalStorage();
        storageMode = 'local';
        bucketReady = true;
        console.log(`MinIO unavailable — using local file storage (${config.uploadsDir})`);
        return;
      }
      throw err;
    }
  }
}

export function getPublicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (storageMode === 'local') return localPublicUrl(key);
  return `${config.s3.publicUrl}/${key}`;
}

export async function getPresignedUploadUrl(
  listingId: number,
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; storageKey: string }> {
  await ensureBucket();
  const ext = filename.split('.').pop() ?? 'jpg';
  const storageKey = `listings/${listingId}/original/${uuidv4()}.${ext}`;

  if (storageMode === 'local') {
    return { uploadUrl: localUploadUrl(storageKey), storageKey };
  }

  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return { uploadUrl, storageKey };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  await ensureBucket();
  if (storageMode === 'local') {
    return readLocalFile(key);
  }

  const response = await s3.send(
    new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }),
  );
  const stream = response.Body;
  if (!stream) throw new Error('Empty S3 object');
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await ensureBucket();
  if (storageMode === 'local') {
    await writeLocalFile(key, body);
    return;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export { s3 };
