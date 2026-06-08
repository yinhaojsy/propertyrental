import sharp from 'sharp';
import type { PhotoCompressionSettings } from '@property-rental/shared';

export interface CompressImageResult {
  buffer: Buffer;
  compressed: boolean;
  contentType: string;
}

const MIN_QUALITY = 10;
const MAX_QUALITY = 95;

function contentTypeForFormat(format: string | undefined): string {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

async function encodeAtQuality(buffer: Buffer, format: string | undefined, quality: number): Promise<Buffer> {
  const img = sharp(buffer, { failOn: 'none' });

  if (format === 'jpeg' || format === 'jpg') {
    return img.jpeg({ quality, mozjpeg: true }).toBuffer();
  }
  if (format === 'png') {
    const compressionLevel = Math.min(9, Math.max(0, Math.round((100 - quality) / 11)));
    return img.png({ compressionLevel }).toBuffer();
  }
  if (format === 'webp') {
    return img.webp({ quality }).toBuffer();
  }
  if (format === 'gif') {
    return buffer;
  }

  return img.jpeg({ quality, mozjpeg: true }).toBuffer();
}

/** Find the highest quality (10–95) that keeps the file at or under maxBytes. */
async function encodeToMaxSize(
  buffer: Buffer,
  format: string | undefined,
  maxBytes: number,
): Promise<Buffer> {
  const atMax = await encodeAtQuality(buffer, format, MAX_QUALITY);
  if (atMax.length <= maxBytes) {
    return atMax;
  }

  let low = MIN_QUALITY;
  let high = MAX_QUALITY;
  let best = await encodeAtQuality(buffer, format, MIN_QUALITY);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = await encodeAtQuality(buffer, format, mid);
    if (candidate.length <= maxBytes) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

export async function compressImageBuffer(
  buffer: Buffer,
  settings: PhotoCompressionSettings,
): Promise<CompressImageResult> {
  const meta = await sharp(buffer, { failOn: 'none' }).metadata();
  const format = meta.format;
  const contentType = contentTypeForFormat(format);

  if (!settings.enabled || buffer.length <= settings.minBytes) {
    return { buffer, compressed: false, contentType };
  }

  let result: Buffer;

  if (settings.maxOutputBytes != null && settings.maxOutputBytes > 0) {
    result = await encodeToMaxSize(buffer, format, settings.maxOutputBytes);
  } else {
    const quality = Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, settings.quality));
    result = await encodeAtQuality(buffer, format, quality);
  }

  if (result.length >= buffer.length) {
    return { buffer, compressed: false, contentType };
  }

  const outputFormat = format === 'gif' ? format : format ?? 'jpeg';
  return {
    buffer: result,
    compressed: true,
    contentType: contentTypeForFormat(outputFormat),
  };
}
