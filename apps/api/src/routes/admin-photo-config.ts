import { Router } from 'express';
import { eq, inArray } from 'drizzle-orm';
import {
  createPhotoFloorSchema,
  updatePhotoFloorSchema,
  createPhotoRoomTypeSchema,
  updatePhotoRoomTypeSchema,
  setPhotoFloorRoomTypesSchema,
} from '@property-rental/shared';
import { db } from '../db/index.js';
import {
  photoFloors,
  photoRoomTypes,
  photoFloorRoomTypes,
  listingPhotos,
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

router.get('/photo-config', requirePermission('locations:read'), async (_req, res, next) => {
  try {
    const floors = await db.select().from(photoFloors).orderBy(photoFloors.sortOrder, photoFloors.nameEn);
    const roomTypes = await db
      .select()
      .from(photoRoomTypes)
      .orderBy(photoRoomTypes.sortOrder, photoRoomTypes.nameEn);
    const floorRoomTypes = await db.select().from(photoFloorRoomTypes);
    res.json({ floors, roomTypes, floorRoomTypes });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/photo-floors',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(createPhotoFloorSchema),
  async (req, res, next) => {
    try {
      const { slug, nameEn, nameZh, isActive, sortOrder } = req.body;
      const [floor] = await db
        .insert(photoFloors)
        .values({
          slug: slug ?? slugify(nameEn),
          nameEn,
          nameZh,
          isActive,
          sortOrder,
        })
        .returning();
      res.status(201).json(floor);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/photo-floors/:id',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(updatePhotoFloorSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [floor] = await db
        .update(photoFloors)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(photoFloors.id, id))
        .returning();
      if (!floor) {
        res.status(404).json({ error: 'Floor not found' });
        return;
      }
      res.json(floor);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/photo-floors/:id',
  requirePermission('locations:write'),
  csrfProtection,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [floor] = await db.select().from(photoFloors).where(eq(photoFloors.id, id));
      if (!floor) {
        res.status(404).json({ error: 'Floor not found' });
        return;
      }
      const used = await db
        .select()
        .from(listingPhotos)
        .where(eq(listingPhotos.floor, floor.slug))
        .limit(1);
      if (used.length > 0) {
        res.status(409).json({ error: 'Floor is used by listing photos; mark inactive instead' });
        return;
      }
      await db.delete(photoFloors).where(eq(photoFloors.id, id));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/photo-room-types',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(createPhotoRoomTypeSchema),
  async (req, res, next) => {
    try {
      const { slug, nameEn, nameZh, labelEn, labelZh, autoNumber, isActive, sortOrder } = req.body;
      const [roomType] = await db
        .insert(photoRoomTypes)
        .values({
          slug: slug ?? slugify(nameEn),
          nameEn,
          nameZh,
          labelEn,
          labelZh,
          autoNumber,
          isActive,
          sortOrder,
        })
        .returning();
      res.status(201).json(roomType);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/photo-room-types/:id',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(updatePhotoRoomTypeSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [roomType] = await db
        .update(photoRoomTypes)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(photoRoomTypes.id, id))
        .returning();
      if (!roomType) {
        res.status(404).json({ error: 'Room type not found' });
        return;
      }
      res.json(roomType);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/photo-room-types/:id',
  requirePermission('locations:write'),
  csrfProtection,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [roomType] = await db.select().from(photoRoomTypes).where(eq(photoRoomTypes.id, id));
      if (!roomType) {
        res.status(404).json({ error: 'Room type not found' });
        return;
      }
      const used = await db
        .select()
        .from(listingPhotos)
        .where(eq(listingPhotos.roomType, roomType.slug))
        .limit(1);
      if (used.length > 0) {
        res.status(409).json({ error: 'Room type is used by listing photos; mark inactive instead' });
        return;
      }
      await db.delete(photoRoomTypes).where(eq(photoRoomTypes.id, id));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/photo-floors/:id/room-types',
  requirePermission('locations:write'),
  csrfProtection,
  validateBody(setPhotoFloorRoomTypesSchema),
  async (req, res, next) => {
    try {
      const floorId = Number(req.params.id);
      const { roomTypeIds } = req.body;

      const [floor] = await db.select().from(photoFloors).where(eq(photoFloors.id, floorId));
      if (!floor) {
        res.status(404).json({ error: 'Floor not found' });
        return;
      }

      if (roomTypeIds.length > 0) {
        const existing = await db
          .select()
          .from(photoRoomTypes)
          .where(inArray(photoRoomTypes.id, roomTypeIds));
        if (existing.length !== roomTypeIds.length) {
          res.status(400).json({ error: 'One or more room type IDs are invalid' });
          return;
        }
      }

      await db.delete(photoFloorRoomTypes).where(eq(photoFloorRoomTypes.floorId, floorId));

      if (roomTypeIds.length > 0) {
        await db.insert(photoFloorRoomTypes).values(
          roomTypeIds.map((roomTypeId: number) => ({
            floorId,
            roomTypeId,
          })),
        );
      }

      const floorRoomTypes = await db
        .select()
        .from(photoFloorRoomTypes)
        .where(eq(photoFloorRoomTypes.floorId, floorId));
      res.json({ floorRoomTypes });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
