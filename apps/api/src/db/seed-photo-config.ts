import { eq } from 'drizzle-orm';
import { db } from './index.js';
import {
  photoFloors,
  photoRoomTypes,
  photoFloorRoomTypes,
  photoSubtypeFloors,
} from './schema.js';

const FLOOR_SEED = [
  { slug: 'basement', nameEn: 'Basement', nameZh: '地下室', sortOrder: 1 },
  { slug: 'ground', nameEn: 'Ground Floor', nameZh: '一楼', sortOrder: 2 },
  { slug: '1', nameEn: '1st Floor', nameZh: '1楼', sortOrder: 3 },
  { slug: '2', nameEn: '2nd Floor', nameZh: '2楼', sortOrder: 4 },
  { slug: '3', nameEn: '3rd Floor', nameZh: '3楼', sortOrder: 5 },
  { slug: '4', nameEn: '4th Floor', nameZh: '4楼', sortOrder: 6 },
  { slug: '5', nameEn: '5th Floor', nameZh: '5楼', sortOrder: 7 },
  { slug: '6', nameEn: '6th Floor', nameZh: '6楼', sortOrder: 8 },
  { slug: '7', nameEn: '7th Floor', nameZh: '7楼', sortOrder: 9 },
  { slug: '8', nameEn: '8th Floor', nameZh: '8楼', sortOrder: 10 },
  { slug: '9', nameEn: '9th Floor', nameZh: '9楼', sortOrder: 11 },
  { slug: '10', nameEn: '10th Floor', nameZh: '10楼', sortOrder: 12 },
  { slug: 'penthouse', nameEn: 'Penthouse', nameZh: '顶层', sortOrder: 13 },
] as const;

const ROOM_TYPE_SEED = [
  {
    slug: 'drawing_room',
    nameEn: 'Drawing Room',
    nameZh: '客厅',
    labelEn: 'Drawing Room',
    labelZh: '客厅',
    autoNumber: false,
    sortOrder: 1,
  },
  {
    slug: 'bedroom',
    nameEn: 'Bedroom',
    nameZh: '卧室',
    labelEn: 'Bed',
    labelZh: '卧室',
    autoNumber: true,
    sortOrder: 2,
  },
  {
    slug: 'bathroom',
    nameEn: 'Bathroom',
    nameZh: '浴室',
    labelEn: 'Bath',
    labelZh: '浴室',
    autoNumber: true,
    sortOrder: 3,
  },
  {
    slug: 'kitchen',
    nameEn: 'Kitchen',
    nameZh: '厨房',
    labelEn: 'Kitchen',
    labelZh: '厨房',
    autoNumber: false,
    sortOrder: 4,
  },
  {
    slug: 'dining',
    nameEn: 'Dining Room',
    nameZh: '餐厅',
    labelEn: 'Dining',
    labelZh: '餐厅',
    autoNumber: false,
    sortOrder: 5,
  },
  {
    slug: 'lounge',
    nameEn: 'Lounge',
    nameZh: '休息室',
    labelEn: 'Lounge',
    labelZh: '休息室',
    autoNumber: false,
    sortOrder: 6,
  },
  {
    slug: 'store',
    nameEn: 'Store',
    nameZh: '储藏室',
    labelEn: 'Store',
    labelZh: '储藏室',
    autoNumber: false,
    sortOrder: 7,
  },
  {
    slug: 'garage',
    nameEn: 'Garage',
    nameZh: '车库',
    labelEn: 'Garage',
    labelZh: '车库',
    autoNumber: false,
    sortOrder: 8,
  },
  {
    slug: 'lawn',
    nameEn: 'Lawn',
    nameZh: '草坪',
    labelEn: 'Lawn',
    labelZh: '草坪',
    autoNumber: false,
    sortOrder: 9,
  },
  {
    slug: 'terrace',
    nameEn: 'Terrace',
    nameZh: '露台',
    labelEn: 'Terrace',
    labelZh: '露台',
    autoNumber: false,
    sortOrder: 10,
  },
  {
    slug: 'other',
    nameEn: 'Other',
    nameZh: '其他',
    labelEn: 'Other',
    labelZh: '其他',
    autoNumber: false,
    sortOrder: 11,
  },
] as const;

const PORTION_SUBTYPES = ['upper_portion', 'lower_portion', 'any_portion'] as const;
const PORTION_FLOOR_SLUGS = [
  'basement',
  'ground',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
] as const;

export async function seedPhotoConfig(): Promise<void> {
  for (const floor of FLOOR_SEED) {
    await db.insert(photoFloors).values(floor).onConflictDoNothing({ target: photoFloors.slug });
  }

  for (const roomType of ROOM_TYPE_SEED) {
    await db
      .insert(photoRoomTypes)
      .values(roomType)
      .onConflictDoNothing({ target: photoRoomTypes.slug });
  }

  const floors = await db.select().from(photoFloors);
  const roomTypes = await db.select().from(photoRoomTypes);
  const existingLinks = await db.select().from(photoFloorRoomTypes);
  const linked = new Set(existingLinks.map((l) => `${l.floorId}:${l.roomTypeId}`));

  for (const floor of floors) {
    for (const roomType of roomTypes) {
      const key = `${floor.id}:${roomType.id}`;
      if (linked.has(key)) continue;
      await db.insert(photoFloorRoomTypes).values({
        floorId: floor.id,
        roomTypeId: roomType.id,
      });
    }
  }

  const floorBySlug = Object.fromEntries(floors.map((f) => [f.slug, f.id]));
  const allFloorIds = floors.map((f) => f.id);
  const portionFloorIds = PORTION_FLOOR_SLUGS.map((slug) => floorBySlug[slug]).filter(
    (id): id is number => id != null,
  );

  async function ensureSubtypeFloors(propertySubtype: string, floorIds: number[]) {
    const existing = await db
      .select()
      .from(photoSubtypeFloors)
      .where(eq(photoSubtypeFloors.propertySubtype, propertySubtype));
    if (existing.length > 0) return;

    if (floorIds.length === 0) return;
    await db.insert(photoSubtypeFloors).values(
      floorIds.map((floorId) => ({ propertySubtype, floorId })),
    );
  }

  await ensureSubtypeFloors('house', allFloorIds);
  for (const subtype of PORTION_SUBTYPES) {
    await ensureSubtypeFloors(subtype, portionFloorIds);
  }

  console.log(
    `Photo config seeded: ${floors.length} floors, ${roomTypes.length} room types`,
  );
}
