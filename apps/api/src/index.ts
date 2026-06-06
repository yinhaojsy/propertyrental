import './load-env.js';
import { existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, isProd } from './config.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import locationRoutes from './routes/locations.js';
import offerRoutes from './routes/offers.js';
import adminRoutes from './routes/admin.js';
import adminLocationsRoutes from './routes/admin-locations.js';
import localStorageRoutes from './routes/local-storage.js';
import { ensureBucket, storageMode } from './lib/storage.js';
import { uploadsRoot } from './lib/local-storage.js';
import { runMigrations } from './db/run-migrations.js';
import { seedDatabase } from './db/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(authenticate);

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminLocationsRoutes);
app.use('/api/local-storage', localStorageRoutes);
app.use('/uploads', express.static(uploadsRoot));

if (existsSync(config.webDist)) {
  app.use(express.static(config.webDist, { index: false }));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(config.webDist, 'index.html'));
  });
}

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  },
);

export let httpServer: ReturnType<typeof app.listen> | undefined;

async function start(): Promise<void> {
  if (isProd && process.env.RUN_MIGRATIONS_ON_START !== 'false') {
    try {
      await runMigrations();
      if (process.env.RUN_SEED_ON_START !== 'false') {
        await seedDatabase();
      }
    } catch (err) {
      console.error('Database setup failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  try {
    await ensureBucket();
    if (storageMode === 'local') {
      console.log(`Local storage ready (${config.uploadsDir})`);
    } else {
      console.log(`S3 storage ready (${config.s3.endpoint}, bucket: ${config.s3.bucket})`);
    }
  } catch (err) {
    console.error('Storage setup failed:', err instanceof Error ? err.message : err);
    if (config.nodeEnv === 'production') process.exit(1);
  }

  if (!existsSync(config.webDist)) {
    console.warn(`Web app not found at ${config.webDist} — only API routes will be served`);
  }

  return new Promise((resolve) => {
    httpServer = app.listen(config.port, () => {
      console.log(`API running on http://localhost:${config.port}`);
      if (existsSync(config.webDist)) {
        console.log(`Web app served from ${config.webDist}`);
      }
      resolve();
    });
  });
}

const isDirectRun = process.argv[1]?.endsWith('/index.js');
if (isDirectRun) {
  start();
}

export { start };
