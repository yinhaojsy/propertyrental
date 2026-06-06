import { Router } from 'express';
import { searchListingsSchema } from '@property-rental/shared';
import { searchListings, getListingBySlugOrId } from '../services/listings.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

router.get(
  '/search',
  validateQuery(searchListingsSchema),
  async (req, res, next) => {
    try {
      const query = (req as typeof req & { validatedQuery: ReturnType<typeof searchListingsSchema.parse> })
        .validatedQuery;
      const result = await searchListings(query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:slugOrId', async (req, res, next) => {
  try {
    const listing = await getListingBySlugOrId(req.params.slugOrId!);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    res.json(listing);
  } catch (err) {
    next(err);
  }
});

export default router;
