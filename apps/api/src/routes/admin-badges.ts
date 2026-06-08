import { Router } from 'express';
import { eq, inArray, asc } from 'drizzle-orm';
import {
  createListingBadgeSchema,
  updateListingBadgeSchema,
  setListingBadgesSchema,
} from '@property-rental/shared';
import { db } from '../db/index.js';
import { listingBadges, listingBadgeAssignments, listings } from '../db/schema.js';
import { requirePermission, csrfProtection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

router.get('/badges', requirePermission('listings:read'), async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(listingBadges)
      .orderBy(asc(listingBadges.sortOrder), asc(listingBadges.labelEn));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/badges',
  requirePermission('listings:write'),
  csrfProtection,
  validateBody(createListingBadgeSchema),
  async (req, res, next) => {
    try {
      const { slug, labelEn, labelZh, backgroundColor, textColor, isActive, sortOrder } =
        req.body;
      const [badge] = await db
        .insert(listingBadges)
        .values({
          slug: slug ?? slugify(labelEn),
          labelEn,
          labelZh,
          backgroundColor,
          textColor,
          isActive,
          sortOrder,
        })
        .returning();
      res.status(201).json(badge);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/badges/:id',
  requirePermission('listings:write'),
  csrfProtection,
  validateBody(updateListingBadgeSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [badge] = await db
        .update(listingBadges)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(listingBadges.id, id))
        .returning();
      if (!badge) {
        res.status(404).json({ error: 'Badge not found' });
        return;
      }
      res.json(badge);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/badges/:id',
  requirePermission('listings:write'),
  csrfProtection,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [badge] = await db
        .delete(listingBadges)
        .where(eq(listingBadges.id, id))
        .returning();
      if (!badge) {
        res.status(404).json({ error: 'Badge not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/listings/:id/badges',
  requirePermission('listings:write'),
  csrfProtection,
  validateBody(setListingBadgesSchema),
  async (req, res, next) => {
    try {
      const listingId = Number(req.params.id);
      const { badgeIds } = req.body;

      const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      if (badgeIds.length > 0) {
        const existing = await db
          .select()
          .from(listingBadges)
          .where(inArray(listingBadges.id, badgeIds));
        if (existing.length !== badgeIds.length) {
          res.status(400).json({ error: 'One or more badge IDs are invalid' });
          return;
        }
      }

      await db
        .delete(listingBadgeAssignments)
        .where(eq(listingBadgeAssignments.listingId, listingId));

      if (badgeIds.length > 0) {
        await db.insert(listingBadgeAssignments).values(
          badgeIds.map((badgeId: number) => ({
            listingId,
            badgeId,
          })),
        );
      }

      const assignments = await db
        .select({
          badge: listingBadges,
        })
        .from(listingBadgeAssignments)
        .innerJoin(listingBadges, eq(listingBadgeAssignments.badgeId, listingBadges.id))
        .where(eq(listingBadgeAssignments.listingId, listingId))
        .orderBy(asc(listingBadges.sortOrder), asc(listingBadges.labelEn));

      res.json({ badges: assignments.map((a) => a.badge) });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
