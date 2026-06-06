import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cities, sectors, propertyTypes, propertySubtypes } from '../db/schema.js';

const router = Router();

router.get('/cities', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(cities)
      .where(eq(cities.isActive, true))
      .orderBy(cities.nameEn);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/sectors', async (req, res, next) => {
  try {
    const citySlug = req.query.city as string | undefined;
    if (!citySlug) {
      res.status(400).json({ error: 'city query param required' });
      return;
    }

    const [city] = await db
      .select()
      .from(cities)
      .where(and(eq(cities.slug, citySlug), eq(cities.isActive, true)));
    if (!city) {
      res.status(404).json({ error: 'City not found' });
      return;
    }

    const rows = await db
      .select()
      .from(sectors)
      .where(and(eq(sectors.cityId, city.id), eq(sectors.isActive, true)))
      .orderBy(sectors.nameEn);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/property-types', async (_req, res, next) => {
  try {
    const types = await db
      .select()
      .from(propertyTypes)
      .where(eq(propertyTypes.isActive, true))
      .orderBy(propertyTypes.sortOrder, propertyTypes.nameEn);
    const subtypes = await db
      .select()
      .from(propertySubtypes)
      .where(eq(propertySubtypes.isActive, true))
      .orderBy(propertySubtypes.sortOrder, propertySubtypes.nameEn);
    res.json({ types, subtypes });
  } catch (err) {
    next(err);
  }
});

export default router;
