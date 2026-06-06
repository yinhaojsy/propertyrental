import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import {
  createCitySchema,
  updateCitySchema,
  createSectorSchema,
  updateSectorSchema,
  createPropertyTypeSchema,
  updatePropertyTypeSchema,
  createPropertySubtypeSchema,
  updatePropertySubtypeSchema,
} from '@property-rental/shared';
import { db } from '../db/index.js';
import {
  cities,
  sectors,
  listings,
  propertyTypes,
  propertySubtypes,
} from '../db/schema.js';
import { requirePermission, csrfProtection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

router.get('/cities', requirePermission('locations:read'), async (_req, res, next) => {
  try {
    const rows = await db.select().from(cities).orderBy(cities.nameEn);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/cities',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(createCitySchema),
  async (req, res, next) => {
    try {
      const { slug, nameEn, nameZh, isActive } = req.body;
      const [city] = await db
        .insert(cities)
        .values({
          slug: slug ?? slugify(nameEn),
          nameEn,
          nameZh,
          isActive,
        })
        .returning();
      res.status(201).json(city);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/cities/:id',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(updateCitySchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [city] = await db
        .update(cities)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(cities.id, id))
        .returning();
      if (!city) {
        res.status(404).json({ error: 'City not found' });
        return;
      }
      res.json(city);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/cities/:id',
  requirePermission('locations:write'),
  csrfProtection,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const sectorCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sectors)
        .where(eq(sectors.cityId, id));
      if ((sectorCount[0]?.count ?? 0) > 0) {
        res.status(409).json({ error: 'Delete all sectors first or mark city inactive' });
        return;
      }
      const [deleted] = await db.delete(cities).where(eq(cities.id, id)).returning();
      if (!deleted) {
        res.status(404).json({ error: 'City not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/sectors', requirePermission('locations:read'), async (req, res, next) => {
  try {
    const cityId = req.query.cityId ? Number(req.query.cityId) : undefined;
    const rows = cityId
      ? await db.select().from(sectors).where(eq(sectors.cityId, cityId)).orderBy(sectors.nameEn)
      : await db.select().from(sectors).orderBy(sectors.nameEn);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sectors',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(createSectorSchema),
  async (req, res, next) => {
    try {
      const { cityId, slug, nameEn, nameZh, isActive } = req.body;
      const [sector] = await db
        .insert(sectors)
        .values({
          cityId,
          slug: slug ?? slugify(nameEn),
          nameEn,
          nameZh: nameZh ?? nameEn,
          isActive,
        })
        .returning();
      res.status(201).json(sector);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/sectors/:id',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(updateSectorSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [sector] = await db
        .update(sectors)
        .set(req.body)
        .where(eq(sectors.id, id))
        .returning();
      if (!sector) {
        res.status(404).json({ error: 'Sector not found' });
        return;
      }
      res.json(sector);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/sectors/:id',
  requirePermission('locations:write'),
  csrfProtection,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const listingCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.sectorId, id));
      if ((listingCount[0]?.count ?? 0) > 0) {
        res.status(409).json({ error: 'Sector has listings; mark inactive instead' });
        return;
      }
      const [deleted] = await db.delete(sectors).where(eq(sectors.id, id)).returning();
      if (!deleted) {
        res.status(404).json({ error: 'Sector not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/property-types', requirePermission('locations:read'), async (_req, res, next) => {
  try {
    const types = await db.select().from(propertyTypes).orderBy(propertyTypes.sortOrder, propertyTypes.nameEn);
    const subtypes = await db
      .select()
      .from(propertySubtypes)
      .orderBy(propertySubtypes.sortOrder, propertySubtypes.nameEn);
    res.json({ types, subtypes });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/property-types',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(createPropertyTypeSchema),
  async (req, res, next) => {
    try {
      const { slug, nameEn, nameZh, isActive, sortOrder } = req.body;
      const [type] = await db
        .insert(propertyTypes)
        .values({
          slug: slug ?? slugify(nameEn),
          nameEn,
          nameZh,
          isActive,
          sortOrder,
        })
        .returning();
      res.status(201).json(type);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/property-types/:id',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(updatePropertyTypeSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [type] = await db
        .update(propertyTypes)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(propertyTypes.id, id))
        .returning();
      if (!type) {
        res.status(404).json({ error: 'Property type not found' });
        return;
      }
      res.json(type);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/property-types/:id',
  requirePermission('locations:write'),
  csrfProtection,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [type] = await db.select().from(propertyTypes).where(eq(propertyTypes.id, id));
      if (!type) {
        res.status(404).json({ error: 'Property type not found' });
        return;
      }
      const listingCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.listingType, type.slug));
      if ((listingCount[0]?.count ?? 0) > 0) {
        res.status(409).json({ error: 'Type is used by listings; mark inactive instead' });
        return;
      }
      await db.delete(propertyTypes).where(eq(propertyTypes.id, id));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/property-subtypes',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(createPropertySubtypeSchema),
  async (req, res, next) => {
    try {
      const { propertyTypeId, slug, nameEn, nameZh, isActive, sortOrder } = req.body;
      const [subtype] = await db
        .insert(propertySubtypes)
        .values({
          propertyTypeId,
          slug: slug ?? slugify(nameEn),
          nameEn,
          nameZh,
          isActive,
          sortOrder,
        })
        .returning();
      res.status(201).json(subtype);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/property-subtypes/:id',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(updatePropertySubtypeSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [subtype] = await db
        .update(propertySubtypes)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(propertySubtypes.id, id))
        .returning();
      if (!subtype) {
        res.status(404).json({ error: 'Property subtype not found' });
        return;
      }
      res.json(subtype);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/property-subtypes/:id',
  requirePermission('locations:write'),
  csrfProtection,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [subtype] = await db.select().from(propertySubtypes).where(eq(propertySubtypes.id, id));
      if (!subtype) {
        res.status(404).json({ error: 'Property subtype not found' });
        return;
      }
      const used = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.propertySubtype, subtype.slug));
      if ((used[0]?.count ?? 0) > 0) {
        res.status(409).json({ error: 'Subtype is used by listings; mark inactive instead' });
        return;
      }
      await db.delete(propertySubtypes).where(eq(propertySubtypes.id, id));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
