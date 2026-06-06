import { Router, raw } from 'express';
import { writeLocalFile } from '../lib/local-storage.js';

const router = Router();

router.put('/:storageKey', raw({ type: '*/*', limit: '20mb' }), async (req, res, next) => {
  try {
    const storageKey = decodeURIComponent(req.params.storageKey!);
    if (!storageKey.startsWith('listings/')) {
      res.status(400).json({ error: 'Invalid storage key' });
      return;
    }
    const body = req.body as Buffer;
    if (!body?.length) {
      res.status(400).json({ error: 'Empty body' });
      return;
    }
    await writeLocalFile(storageKey, body);
    res.status(200).json({ ok: true, storageKey });
  } catch (err) {
    next(err);
  }
});

export default router;
