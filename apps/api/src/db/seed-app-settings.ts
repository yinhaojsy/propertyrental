import { eq } from 'drizzle-orm';
import { DEFAULT_PHOTO_COMPRESSION_SETTINGS } from '@property-rental/shared';
import { db } from './index.js';
import { appSettings } from './schema.js';

const PHOTO_COMPRESSION_KEY = 'photo_compression';

export async function seedAppSettings(): Promise<void> {
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, PHOTO_COMPRESSION_KEY));

  if (existing.length === 0) {
    await db.insert(appSettings).values({
      key: PHOTO_COMPRESSION_KEY,
      value: DEFAULT_PHOTO_COMPRESSION_SETTINGS,
    });
    console.log('Seeded default photo compression settings');
  }
}
