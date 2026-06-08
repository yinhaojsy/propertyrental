import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { convertToSqFt, parseBedFilter, parseBathFilter, deriveBedsBathsFromPhotoMetadata } from '@property-rental/shared';
import type { SearchListingsInput, SearchSortOption } from '@property-rental/shared';
import { db } from '../db/index.js';
import {
  cities,
  listings,
  listingPhotos,
  listingBadges,
  listingBadgeAssignments,
  sectors,
} from '../db/schema.js';
import { publicPhotoUrl, slugifyListing } from '../lib/utils.js';

export interface ListingBadgeDto {
  id: number;
  slug: string;
  labelEn: string;
  labelZh: string | null;
  backgroundColor: string;
  textColor: string;
  sortOrder: number;
}

function formatBadge(badge: typeof listingBadges.$inferSelect): ListingBadgeDto {
  return {
    id: badge.id,
    slug: badge.slug,
    labelEn: badge.labelEn,
    labelZh: badge.labelZh,
    backgroundColor: badge.backgroundColor,
    textColor: badge.textColor,
    sortOrder: badge.sortOrder,
  };
}

export async function loadBadgesForListings(
  listingIds: number[],
): Promise<Map<number, ListingBadgeDto[]>> {
  const map = new Map<number, ListingBadgeDto[]>();
  if (listingIds.length === 0) return map;

  const rows = await db
    .select({
      listingId: listingBadgeAssignments.listingId,
      badge: listingBadges,
    })
    .from(listingBadgeAssignments)
    .innerJoin(listingBadges, eq(listingBadgeAssignments.badgeId, listingBadges.id))
    .where(
      and(
        inArray(listingBadgeAssignments.listingId, listingIds),
        eq(listingBadges.isActive, true),
      ),
    )
    .orderBy(asc(listingBadges.sortOrder), asc(listingBadges.labelEn));

  for (const row of rows) {
    const list = map.get(row.listingId) ?? [];
    list.push(formatBadge(row.badge));
    map.set(row.listingId, list);
  }
  return map;
}

function formatListingRow(
  row: typeof listings.$inferSelect,
  sector: typeof sectors.$inferSelect,
  city: typeof cities.$inferSelect,
  coverUrl: string | null,
  badges: ListingBadgeDto[] = [],
) {
  return {
    id: row.id,
    slug: row.slug,
    city: { id: city.id, slug: city.slug, nameEn: city.nameEn, nameZh: city.nameZh },
    sector: {
      id: sector.id,
      slug: sector.slug,
      nameEn: sector.nameEn,
      nameZh: sector.nameZh,
    },
    listingType: row.listingType,
    propertySubtype: row.propertySubtype,
    status: row.status,
    rentAmount: Number(row.rentAmount),
    currency: row.currency,
    areaValue: row.areaValue ? Number(row.areaValue) : null,
    areaUnit: row.areaUnit,
    beds: row.isStudio ? 0 : row.beds,
    isStudio: row.isStudio,
    baths: row.baths,
    isPenthouse: row.isPenthouse,
    titleEn: row.titleEn,
    titleZh: row.titleZh,
    descriptionEn: row.descriptionEn,
    descriptionZh: row.descriptionZh,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    coverPhotoUrl: coverUrl,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    badges,
  };
}

export async function searchListings(query: SearchListingsInput) {
  const conditions = [eq(listings.status, 'published')];

  if (query.city !== 'all') {
    const [city] = await db.select().from(cities).where(eq(cities.slug, query.city));
    if (city) conditions.push(eq(listings.cityId, city.id));
  }

  if (query.sectorIds.length > 0) {
    const sectorIdNums = query.sectorIds.map((id) => parseInt(id, 10)).filter(Boolean);
    if (sectorIdNums.length > 0) {
      conditions.push(inArray(listings.sectorId, sectorIdNums));
    }
  }

  conditions.push(eq(listings.listingType, query.listingType));

  if (query.propertySubtype === 'any_portion') {
    conditions.push(
      inArray(listings.propertySubtype, ['upper_portion', 'lower_portion']),
    );
  } else {
    conditions.push(eq(listings.propertySubtype, query.propertySubtype));
  }

  if (query.areaMin > 0 || query.areaMax) {
    const minSqft =
      query.areaMin > 0 ? convertToSqFt(query.areaMin, query.areaUnit) : undefined;
    const maxSqft = query.areaMax
      ? convertToSqFt(query.areaMax, query.areaUnit)
      : undefined;
    if (minSqft != null) conditions.push(gte(listings.areaSqftNormalized, String(minSqft)));
    if (maxSqft != null) conditions.push(lte(listings.areaSqftNormalized, String(maxSqft)));
  }

  if (query.priceMin > 0) {
    conditions.push(gte(listings.rentAmount, String(query.priceMin)));
  }
  if (query.priceMax) {
    conditions.push(lte(listings.rentAmount, String(query.priceMax)));
  }

  if (query.listingType === 'residential') {
    const bedFilter = parseBedFilter(query.beds);
    if (bedFilter === 'studio') {
      conditions.push(eq(listings.isStudio, true));
    } else if (typeof bedFilter === 'number') {
      if (bedFilter >= 10) {
        conditions.push(gte(listings.beds, 10));
      } else {
        conditions.push(eq(listings.beds, bedFilter));
      }
    }

    const bathFilter = parseBathFilter(query.baths);
    if (typeof bathFilter === 'number') {
      if (bathFilter >= 10) {
        conditions.push(gte(listings.baths, 10));
      } else {
        conditions.push(eq(listings.baths, bathFilter));
      }
    }

    if (query.isPenthouse && query.propertySubtype === 'flat') {
      conditions.push(eq(listings.isPenthouse, true));
    }
  }

  const whereClause = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const orderBy = (() => {
    switch (query.sort) {
      case 'price_asc':
        return [asc(listings.rentAmount), desc(listings.publishedAt)];
      case 'price_desc':
        return [desc(listings.rentAmount), desc(listings.publishedAt)];
      case 'newest':
        return [desc(listings.createdAt)];
      case 'popular':
      default:
        return [desc(listings.publishedAt), desc(listings.createdAt)];
    }
  })();

  const [totalResult] = await db
    .select({ total: count() })
    .from(listings)
    .where(whereClause);

  const rows = await db
    .select({
      listing: listings,
      sector: sectors,
      city: cities,
    })
    .from(listings)
    .innerJoin(sectors, eq(listings.sectorId, sectors.id))
    .innerJoin(cities, eq(listings.cityId, cities.id))
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(query.limit)
    .offset(offset);

  const listingIds = rows.map((r) => r.listing.id);
  const photos =
    listingIds.length > 0
      ? await db
          .select()
          .from(listingPhotos)
          .where(
            and(
              inArray(listingPhotos.listingId, listingIds),
              eq(listingPhotos.isCover, true),
            ),
          )
      : [];

  const coverMap = new Map<number, string | null>();
  for (const photo of photos) {
    coverMap.set(
      photo.listingId,
      publicPhotoUrl(photo.thumbnailKey ?? photo.storageKey),
    );
  }

  const badgeMap = await loadBadgesForListings(listingIds);

  return {
    data: rows.map(({ listing, sector, city }) =>
      formatListingRow(
        listing,
        sector,
        city,
        coverMap.get(listing.id) ?? null,
        badgeMap.get(listing.id) ?? [],
      ),
    ),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: totalResult?.total ?? 0,
      totalPages: Math.ceil((totalResult?.total ?? 0) / query.limit),
    },
  };
}

export async function getListingBySlugOrId(slugOrId: string) {
  const isNumeric = /^\d+$/.test(slugOrId);
  const condition = isNumeric
    ? eq(listings.id, parseInt(slugOrId, 10))
    : eq(listings.slug, slugOrId);

  const [row] = await db
    .select({
      listing: listings,
      sector: sectors,
      city: cities,
    })
    .from(listings)
    .innerJoin(sectors, eq(listings.sectorId, sectors.id))
    .innerJoin(cities, eq(listings.cityId, cities.id))
    .where(and(condition, eq(listings.status, 'published')));

  if (!row) return null;

  const photos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, row.listing.id))
    .orderBy(desc(listingPhotos.isCover), asc(listingPhotos.sortOrder));

  const badgeMap = await loadBadgesForListings([row.listing.id]);
  const badges = badgeMap.get(row.listing.id) ?? [];

  return {
    ...formatListingRow(
      row.listing,
      row.sector,
      row.city,
      publicPhotoUrl(
        photos.find((p) => p.isCover)?.thumbnailKey ??
          photos[0]?.thumbnailKey ??
          photos[0]?.storageKey,
      ),
      badges,
    ),
    photos: photos.map((p) => ({
      id: p.id,
      url: publicPhotoUrl(p.thumbnailKey ?? p.storageKey),
      originalUrl: publicPhotoUrl(p.storageKey),
      floor: p.floor,
      roomType: p.roomType,
      roomLabel: p.roomLabel,
      roomLabelZh: p.roomLabelZh,
      sortOrder: p.sortOrder,
      isCover: p.isCover,
    })),
  };
}

export async function deriveBedsBathsFromPhotos(listingId: number) {
  const photos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));

  return deriveBedsBathsFromPhotoMetadata(
    photos.map((p) => ({
      floor: p.floor,
      roomType: p.roomType,
      roomLabel: p.roomLabel,
      uploadMode: p.uploadMode,
    })),
  );
}

export async function syncListingBedsBathsFromPhotos(listingId: number) {
  const photos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));

  const hasStructured = photos.some(
    (p) => p.uploadMode === 'structured' && p.roomType,
  );
  if (!hasStructured) return null;

  const derived = await deriveBedsBathsFromPhotos(listingId);
  await db
    .update(listings)
    .set({
      beds: derived.beds > 0 ? derived.beds : null,
      baths: derived.baths > 0 ? derived.baths : null,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId));

  return derived;
}

export function computeAreaSqft(areaValue?: number | null, areaUnit?: string | null) {
  if (!areaValue || !areaUnit) return null;
  return convertToSqFt(areaValue, areaUnit as Parameters<typeof convertToSqFt>[1]);
}

export async function createListingSlug(titleEn: string, id: number) {
  let slug = slugifyListing(titleEn, id);
  const existing = await db.select().from(listings).where(eq(listings.slug, slug));
  if (existing.length > 0) slug = `${slug}-${Date.now()}`;
  return slug;
}

export async function getDashboardStats() {
  const statusCounts = await db
    .select({
      status: listings.status,
      count: count(),
    })
    .from(listings)
    .groupBy(listings.status);

  return statusCounts;
}
