import { db } from './index.js';
import { propertyTypes, propertySubtypes } from './schema.js';

const PROPERTY_TYPE_SEED = [
  { slug: 'residential', nameEn: 'Residential', nameZh: '住宅', sortOrder: 1 },
  { slug: 'commercial', nameEn: 'Commercial', nameZh: '商业', sortOrder: 2 },
  { slug: 'industrial', nameEn: 'Industrial', nameZh: '工业', sortOrder: 3 },
] as const;

const PROPERTY_SUBTYPE_SEED = [
  { typeSlug: 'residential', slug: 'house', nameEn: 'House', nameZh: '独立屋', sortOrder: 1 },
  { typeSlug: 'residential', slug: 'flat', nameEn: 'Flat/Apartment', nameZh: '公寓', sortOrder: 2 },
  {
    typeSlug: 'residential',
    slug: 'upper_portion',
    nameEn: 'Upper Portion',
    nameZh: '上层',
    sortOrder: 3,
  },
  {
    typeSlug: 'residential',
    slug: 'lower_portion',
    nameEn: 'Lower Portion',
    nameZh: '下层',
    sortOrder: 4,
  },
  {
    typeSlug: 'residential',
    slug: 'any_portion',
    nameEn: 'Any Portion',
    nameZh: '任意层',
    sortOrder: 5,
  },
  { typeSlug: 'commercial', slug: 'office', nameEn: 'Office', nameZh: '办公室', sortOrder: 1 },
  { typeSlug: 'commercial', slug: 'shop', nameEn: 'Shop', nameZh: '商铺', sortOrder: 2 },
  {
    typeSlug: 'commercial',
    slug: 'building',
    nameEn: 'Building/Plaza',
    nameZh: '建筑/广场',
    sortOrder: 3,
  },
  { typeSlug: 'industrial', slug: 'warehouse', nameEn: 'Warehouse', nameZh: '仓库', sortOrder: 1 },
  { typeSlug: 'industrial', slug: 'factory', nameEn: 'Factory', nameZh: '工厂', sortOrder: 2 },
] as const;

export async function seedPropertyTypes(): Promise<void> {
  for (const type of PROPERTY_TYPE_SEED) {
    await db
      .insert(propertyTypes)
      .values(type)
      .onConflictDoUpdate({
        target: propertyTypes.slug,
        set: {
          nameEn: type.nameEn,
          nameZh: type.nameZh,
          sortOrder: type.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  const types = await db.select().from(propertyTypes);
  const typeBySlug = Object.fromEntries(types.map((t) => [t.slug, t.id]));

  for (const subtype of PROPERTY_SUBTYPE_SEED) {
    const propertyTypeId = typeBySlug[subtype.typeSlug];
    if (!propertyTypeId) continue;

    await db
      .insert(propertySubtypes)
      .values({
        propertyTypeId,
        slug: subtype.slug,
        nameEn: subtype.nameEn,
        nameZh: subtype.nameZh,
        sortOrder: subtype.sortOrder,
      })
      .onConflictDoUpdate({
        target: [propertySubtypes.propertyTypeId, propertySubtypes.slug],
        set: {
          nameEn: subtype.nameEn,
          nameZh: subtype.nameZh,
          sortOrder: subtype.sortOrder,
          updatedAt: new Date(),
        },
      });
  }
}
