import { Router } from 'express';
import { photoCompressionSettingsSchema } from '@property-rental/shared';
import { requirePermission, csrfProtection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  getPhotoCompressionSettings,
  savePhotoCompressionSettings,
} from '../lib/photo-compression-settings.js';

const router = Router();

router.get(
  '/settings/photo-compression',
  requirePermission('settings:read'),
  async (_req, res, next) => {
    try {
      const settings = await getPhotoCompressionSettings();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/settings/photo-compression',
  requirePermission('settings:write'),
  csrfProtection,
  validateBody(photoCompressionSettingsSchema),
  async (req, res, next) => {
    try {
      const settings = await savePhotoCompressionSettings(req.body);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
