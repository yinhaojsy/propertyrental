import { db } from './index.js';
import { listingBadges } from './schema.js';

const BADGE_SEED = [
  {
    slug: 'popular',
    labelEn: 'Popular',
    labelZh: '热门',
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    sortOrder: 1,
  },
  {
    slug: 'featured',
    labelEn: 'Featured',
    labelZh: '精选',
    backgroundColor: '#ea580c',
    textColor: '#ffffff',
    sortOrder: 2,
  },
] as const;

export async function seedListingBadges(): Promise<void> {
  for (const badge of BADGE_SEED) {
    await db
      .insert(listingBadges)
      .values(badge)
      .onConflictDoUpdate({
        target: listingBadges.slug,
        set: {
          labelEn: badge.labelEn,
          labelZh: badge.labelZh,
          backgroundColor: badge.backgroundColor,
          textColor: badge.textColor,
          sortOrder: badge.sortOrder,
          updatedAt: new Date(),
        },
      });
  }
}
