import { Router } from 'express';
import { eq, desc, asc, and, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  createListingSchema,
  updateListingSchema,
  createDraftListingSchema,
  listingStatusSchema,
  createUserSchema,
  photoUploadRequestSchema,
  photoConfirmSchema,
  photoReorderSchema,
  rentalRecordSchema,
} from '@property-rental/shared';
import { db } from '../db/index.js';
import {
  listings,
  listingPhotos,
  offers,
  rentalRecords,
  users,
  roles,
  userRoles,
  cities,
  sectors,
} from '../db/schema.js';
import {
  authenticate,
  requireAuth,
  requirePermission,
  csrfProtection,
  type AuthRequest,
} from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  computeAreaSqft,
  createListingSlug,
  deriveBedsBathsFromPhotos,
  syncListingBedsBathsFromPhotos,
  getDashboardStats,
} from '../services/listings.js';
import { getPresignedUploadUrl } from '../lib/storage.js';
import { enqueueImageProcessing } from '../lib/queue.js';
import { publicPhotoUrl } from '../lib/utils.js';

const router = Router();

router.use(authenticate, requireAuth);

router.get('/dashboard', requirePermission('listings:read'), async (_req, res, next) => {
  try {
    const stats = await getDashboardStats();
    const recentOffers = await db
      .select()
      .from(offers)
      .orderBy(desc(offers.createdAt))
      .limit(10);
    res.json({ stats, recentOffers });
  } catch (err) {
    next(err);
  }
});

router.get('/listings', requirePermission('listings:read'), async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        listing: listings,
        sector: sectors,
        city: cities,
      })
      .from(listings)
      .innerJoin(sectors, eq(listings.sectorId, sectors.id))
      .innerJoin(cities, eq(listings.cityId, cities.id))
      .orderBy(desc(listings.updatedAt));

    const listingIds = rows.map(({ listing }) => listing.id);
    const rentalRows =
      listingIds.length > 0
        ? await db
            .select({
              listingId: rentalRecords.listingId,
              rentAmount: rentalRecords.rentAmount,
            })
            .from(rentalRecords)
            .where(inArray(rentalRecords.listingId, listingIds))
            .orderBy(desc(rentalRecords.createdAt))
        : [];

    const finalRentByListing = new Map<number, number>();
    for (const record of rentalRows) {
      if (!finalRentByListing.has(record.listingId)) {
        finalRentByListing.set(record.listingId, Number(record.rentAmount));
      }
    }

    res.json(
      rows.map(({ listing, sector, city }) => ({
        ...listing,
        rentAmount: Number(listing.rentAmount),
        finalRent: finalRentByListing.get(listing.id) ?? null,
        areaValue: listing.areaValue ? Number(listing.areaValue) : null,
        sector,
        city,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/listings/:id', requirePermission('listings:read'), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [row] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id));

    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const photos = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, id));

    res.json({
      ...row,
      rentAmount: Number(row.rentAmount),
      areaValue: row.areaValue ? Number(row.areaValue) : null,
      photos: photos.map((p) => ({
        ...p,
        url: publicPhotoUrl(p.thumbnailKey ?? p.storageKey),
        originalUrl: publicPhotoUrl(p.storageKey),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/listings/draft',
  csrfProtection,
  requirePermission('listings:write'),
  validateBody(createDraftListingSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const data = req.body;
      const titleEn = data.titleEn?.trim() || 'Draft listing';
      const rentAmount = data.rentAmount ?? 1;

      const [inserted] = await db
        .insert(listings)
        .values({
          slug: 'temp',
          cityId: data.cityId,
          sectorId: data.sectorId,
          listingType: data.listingType,
          propertySubtype: data.propertySubtype,
          status: 'draft',
          rentAmount: String(rentAmount),
          currency: data.currency ?? 'PKR',
          areaValue: data.areaValue ? String(data.areaValue) : null,
          areaUnit: data.areaUnit ?? 'sqft',
          areaSqftNormalized: computeAreaSqft(data.areaValue, data.areaUnit ?? 'sqft')
            ? String(computeAreaSqft(data.areaValue, data.areaUnit ?? 'sqft'))
            : null,
          beds: data.isStudio ? 0 : (data.beds ?? null),
          isStudio: data.isStudio ?? false,
          baths: data.baths ?? null,
          isPenthouse: data.isPenthouse ?? false,
          titleEn,
          titleZh: data.titleZh,
          descriptionEn: data.descriptionEn,
          descriptionZh: data.descriptionZh,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          createdById: req.user!.userId,
        })
        .returning();

      const slug = await createListingSlug(titleEn, inserted!.id);
      const [listing] = await db
        .update(listings)
        .set({ slug, updatedAt: new Date() })
        .where(eq(listings.id, inserted!.id))
        .returning();

      res.status(201).json(listing);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/listings',
  csrfProtection,
  requirePermission('listings:write'),
  validateBody(createListingSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const data = req.body;
      const [inserted] = await db
        .insert(listings)
        .values({
          slug: 'temp',
          cityId: data.cityId,
          sectorId: data.sectorId,
          listingType: data.listingType,
          propertySubtype: data.propertySubtype,
          status: 'draft',
          rentAmount: String(data.rentAmount),
          currency: data.currency,
          areaValue: data.areaValue ? String(data.areaValue) : null,
          areaUnit: data.areaUnit,
          areaSqftNormalized: computeAreaSqft(data.areaValue, data.areaUnit)
            ? String(computeAreaSqft(data.areaValue, data.areaUnit))
            : null,
          beds: data.isStudio ? 0 : data.beds,
          isStudio: data.isStudio,
          baths: data.baths,
          isPenthouse: data.isPenthouse,
          titleEn: data.titleEn,
          titleZh: data.titleZh,
          descriptionEn: data.descriptionEn,
          descriptionZh: data.descriptionZh,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          createdById: req.user!.userId,
        })
        .returning();

      const slug = await createListingSlug(data.titleEn, inserted!.id);
      const [listing] = await db
        .update(listings)
        .set({ slug, updatedAt: new Date() })
        .where(eq(listings.id, inserted!.id))
        .returning();

      res.status(201).json(listing);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/listings/:id',
  csrfProtection,
  requirePermission('listings:write'),
  validateBody(updateListingSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const data = req.body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.cityId != null) updateData.cityId = data.cityId;
      if (data.sectorId != null) updateData.sectorId = data.sectorId;
      if (data.listingType != null) updateData.listingType = data.listingType;
      if (data.propertySubtype != null) updateData.propertySubtype = data.propertySubtype;
      if (data.rentAmount != null) updateData.rentAmount = String(data.rentAmount);
      if (data.areaValue != null) {
        updateData.areaValue = String(data.areaValue);
        updateData.areaSqftNormalized = String(
          computeAreaSqft(data.areaValue, data.areaUnit ?? 'sqft'),
        );
      }
      if (data.areaUnit != null) updateData.areaUnit = data.areaUnit;
      if (data.beds != null) updateData.beds = data.beds;
      if (data.isStudio != null) updateData.isStudio = data.isStudio;
      if (data.baths != null) updateData.baths = data.baths;
      if (data.isPenthouse != null) updateData.isPenthouse = data.isPenthouse;
      if (data.titleEn != null) updateData.titleEn = data.titleEn;
      if (data.titleZh != null) updateData.titleZh = data.titleZh;
      if (data.descriptionEn != null) updateData.descriptionEn = data.descriptionEn;
      if (data.descriptionZh != null) updateData.descriptionZh = data.descriptionZh;
      if (data.contactPhone != null) updateData.contactPhone = data.contactPhone;
      if (data.contactEmail != null) updateData.contactEmail = data.contactEmail;

      const [listing] = await db
        .update(listings)
        .set(updateData)
        .where(eq(listings.id, id))
        .returning();

      if (!listing) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(listing);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/listings/:id/status',
  csrfProtection,
  requirePermission('listings:publish'),
  validateBody(listingStatusSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { status } = req.body;
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'published') {
        updateData.publishedAt = new Date();
      }
      if (status === 'rented_out') {
        updateData.rentedOutAt = new Date();
      }

      const [listing] = await db
        .update(listings)
        .set(updateData)
        .where(eq(listings.id, id))
        .returning();

      if (!listing) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(listing);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/listings/:id/photos/presign',
  csrfProtection,
  requirePermission('listings:write'),
  validateBody(photoUploadRequestSchema),
  async (req, res, next) => {
    try {
      const listingId = parseInt(String(req.params.id), 10);
      const { filename, contentType } = req.body;
      const result = await getPresignedUploadUrl(listingId, filename, contentType);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/listings/:id/photos/confirm',
  csrfProtection,
  requirePermission('listings:write'),
  validateBody(photoConfirmSchema),
  async (req, res, next) => {
    try {
      const listingId = parseInt(String(req.params.id), 10);
      const data = req.body;

      const [photo] = await db
        .insert(listingPhotos)
        .values({
          listingId,
          storageKey: data.storageKey,
          floor: data.floor,
          roomType: data.roomType,
          roomLabel: data.roomLabel,
          roomLabelZh: data.roomLabelZh,
          sortOrder: data.sortOrder,
          isCover: data.isCover,
          uploadMode: data.uploadMode,
          processingStatus: 'pending',
        })
        .returning();

      await enqueueImageProcessing({
        photoId: photo!.id,
        listingId,
        storageKey: data.storageKey,
      });

      if (data.uploadMode === 'structured') {
        const derived = await deriveBedsBathsFromPhotos(listingId);
        await db
          .update(listings)
          .set({
            beds: derived.beds > 0 ? derived.beds : null,
            baths: derived.baths > 0 ? derived.baths : null,
            updatedAt: new Date(),
          })
          .where(eq(listings.id, listingId));

        res.status(201).json({ photo, derived });
        return;
      }

      res.status(201).json({ photo });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/listings/:id/photos/reorder',
  csrfProtection,
  requirePermission('listings:write'),
  validateBody(photoReorderSchema),
  async (req, res, next) => {
    try {
      const listingId = parseInt(String(req.params.id), 10);
      const { photos } = req.body;

      for (const photo of photos) {
        await db
          .update(listingPhotos)
          .set({
            sortOrder: photo.sortOrder,
            ...(photo.isCover != null ? { isCover: photo.isCover } : {}),
          })
          .where(
            and(eq(listingPhotos.id, photo.id), eq(listingPhotos.listingId, listingId)),
          );
      }

      if (photos.some((p: { isCover?: boolean }) => p.isCover)) {
        const coverId = photos.find((p: { id: number; isCover?: boolean }) => p.isCover)!.id;
        await db
          .update(listingPhotos)
          .set({ isCover: false })
          .where(
            and(eq(listingPhotos.listingId, listingId), eq(listingPhotos.isCover, true)),
          );
        await db
          .update(listingPhotos)
          .set({ isCover: true })
          .where(eq(listingPhotos.id, coverId));
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/listings/:id/photos',
  csrfProtection,
  requirePermission('listings:write'),
  async (req, res, next) => {
    try {
      const listingId = parseInt(String(req.params.id), 10);
      await db.delete(listingPhotos).where(eq(listingPhotos.listingId, listingId));
      const derived = await syncListingBedsBathsFromPhotos(listingId);
      res.json({ ok: true, derived: derived ?? undefined });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/listings/:id/photos/:photoId',
  csrfProtection,
  requirePermission('listings:write'),
  async (req, res, next) => {
    try {
      const listingId = parseInt(String(req.params.id), 10);
      const photoId = parseInt(String(req.params.photoId), 10);
      const [photo] = await db
        .select()
        .from(listingPhotos)
        .where(and(eq(listingPhotos.id, photoId), eq(listingPhotos.listingId, listingId)));
      if (!photo) {
        res.status(404).json({ error: 'Photo not found' });
        return;
      }

      const wasCover = photo.isCover;
      await db
        .delete(listingPhotos)
        .where(and(eq(listingPhotos.id, photoId), eq(listingPhotos.listingId, listingId)));

      if (wasCover) {
        const [nextCover] = await db
          .select()
          .from(listingPhotos)
          .where(eq(listingPhotos.listingId, listingId))
          .orderBy(asc(listingPhotos.sortOrder))
          .limit(1);
        if (nextCover) {
          await db
            .update(listingPhotos)
            .set({ isCover: true })
            .where(eq(listingPhotos.id, nextCover.id));
        }
      }

      const derived = await syncListingBedsBathsFromPhotos(listingId);
      res.json({ ok: true, derived: derived ?? undefined });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/offers', requirePermission('offers:read'), async (req, res, next) => {
  try {
    const listingId = req.query.listingId
      ? parseInt(req.query.listingId as string, 10)
      : undefined;

    const rows = listingId
      ? await db
          .select()
          .from(offers)
          .where(eq(offers.listingId, listingId))
          .orderBy(desc(offers.createdAt))
      : await db.select().from(offers).orderBy(desc(offers.createdAt));

    res.json(
      rows.map((o) => ({
        ...o,
        offeredRent: o.offeredRent ? Number(o.offeredRent) : null,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post(
  '/rental-records',
  csrfProtection,
  requirePermission('listings:publish'),
  validateBody(rentalRecordSchema),
  async (req, res, next) => {
    try {
      const data = req.body;
      const [record] = await db
        .insert(rentalRecords)
        .values({
          listingId: data.listingId,
          offerId: data.offerId,
          tenantName: data.tenantName,
          tenantPhone: data.tenantPhone,
          rentAmount: String(data.rentAmount),
          source: data.source,
        })
        .returning();

      await db
        .update(listings)
        .set({ status: 'rented_out', rentedOutAt: new Date(), updatedAt: new Date() })
        .where(eq(listings.id, data.listingId));

      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/users', requirePermission('users:read'), async (_req, res, next) => {
  try {
    const roleRows = await db
      .select({
        userId: userRoles.userId,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id));

    const staffUserIds = [...new Set(roleRows.map((r) => r.userId))];
    if (staffUserIds.length === 0) {
      res.json([]);
      return;
    }

    const staffUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, staffUserIds))
      .orderBy(users.createdAt);

    const rolesByUser = roleRows.reduce<Record<number, string[]>>((acc, row) => {
      acc[row.userId] ??= [];
      acc[row.userId]!.push(row.roleName);
      return acc;
    }, {});

    res.json(
      staffUsers.map(({ passwordHash: _, ...user }) => ({
        ...user,
        roles: rolesByUser[user.id] ?? [],
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/clients', requirePermission('offers:read'), async (_req, res, next) => {
  try {
    const roleRows = await db.select({ userId: userRoles.userId }).from(userRoles);
    const staffUserIds = [...new Set(roleRows.map((r) => r.userId))];

    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const clients = allUsers.filter((user) => !staffUserIds.includes(user.id));

    res.json(
      clients.map(({ passwordHash: _, ...user }) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post(
  '/users',
  csrfProtection,
  requirePermission('users:write'),
  validateBody(createUserSchema),
  async (req, res, next) => {
    try {
      const data = req.body;
      const passwordHash = await bcrypt.hash(data.password, 12);
      const [user] = await db
        .insert(users)
        .values({
          email: data.email,
          passwordHash,
          name: data.name,
          phone: data.phone,
        })
        .returning();

      const [role] = await db.select().from(roles).where(eq(roles.name, data.role));
      if (role && user) {
        await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
      }

      const { passwordHash: _, ...safe } = user!;
      res.status(201).json(safe);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/roles', requirePermission('roles:read'), async (_req, res, next) => {
  try {
    const allRoles = await db.select().from(roles);
    res.json(allRoles);
  } catch (err) {
    next(err);
  }
});

export default router;
