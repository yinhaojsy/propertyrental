import { eq } from 'drizzle-orm';
import {
  DEFAULT_PHOTO_COMPRESSION_SETTINGS,
  photoCompressionSettingsSchema,
  type PhotoCompressionSettings,
} from '@property-rental/shared';
import { db } from '../db/index.js';
import { appSettings } from '../db/schema.js';

const PHOTO_COMPRESSION_KEY = 'photo_compression';
const CACHE_MS = 30_000;

let cached: { settings: PhotoCompressionSettings; fetchedAt: number } | null = null;

export function invalidatePhotoCompressionCache(): void {
  cached = null;
}

export async function getPhotoCompressionSettings(): Promise<PhotoCompressionSettings> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.settings;
  }

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, PHOTO_COMPRESSION_KEY));

  const settings = row
    ? photoCompressionSettingsSchema.parse(row.value)
    : DEFAULT_PHOTO_COMPRESSION_SETTINGS;

  cached = { settings, fetchedAt: Date.now() };
  return settings;
}

export async function savePhotoCompressionSettings(
  input: PhotoCompressionSettings,
): Promise<PhotoCompressionSettings> {
  const settings = photoCompressionSettingsSchema.parse(input);

  await db
    .insert(appSettings)
    .values({
      key: PHOTO_COMPRESSION_KEY,
      value: settings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: settings,
        updatedAt: new Date(),
      },
    });

  invalidatePhotoCompressionCache();
  return settings;
}
