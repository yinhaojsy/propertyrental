import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { createOfferSchema } from '@property-rental/shared';
import { db } from '../db/index.js';
import { offers, listings } from '../db/schema.js';
import { enqueueOfferNotification } from '../lib/queue.js';
import {
  authenticate,
  requireAuth,
  csrfProtection,
  type AuthRequest,
} from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/', csrfProtection, authenticate, validateBody(createOfferSchema), async (req: AuthRequest, res, next) => {
  try {
    const data = req.body;
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, data.listingId));

    if (!listing || listing.status !== 'published') {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const [offer] = await db
      .insert(offers)
      .values({
        listingId: data.listingId,
        userId: req.user?.userId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        offeredRent: data.offeredRent ? String(data.offeredRent) : null,
        message: data.message,
      })
      .returning();

    await enqueueOfferNotification(offer!.id);
    res.status(201).json(offer);
  } catch (err) {
    next(err);
  }
});

router.get('/my', authenticate, requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rows = await db
      .select({
        offer: offers,
        listing: listings,
      })
      .from(offers)
      .innerJoin(listings, eq(offers.listingId, listings.id))
      .where(eq(offers.userId, req.user!.userId))
      .orderBy(desc(offers.createdAt));

    res.json(
      rows.map(({ offer, listing }) => ({
        ...offer,
        offeredRent: offer.offeredRent ? Number(offer.offeredRent) : null,
        listing: {
          id: listing.id,
          slug: listing.slug,
          titleEn: listing.titleEn,
          titleZh: listing.titleZh,
          rentAmount: Number(listing.rentAmount),
        },
      })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
