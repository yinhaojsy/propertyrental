# Deployment Guide

Deploy to managed cloud (Railway, Render, or Fly.io) with:

- **PostgreSQL** (managed)
- **Redis** (managed)
- **One app service** — API + web frontend + background worker
- **Photo storage:** Railway volume (simple) **or** S3-compatible storage (Cloudflare R2 / AWS S3)

## Single-service deploy (recommended)

One Railway service from this repo serves:

- React web app at `/`, `/search`, etc.
- API at `/api/*`
- Photos at `/uploads/*`

### Build & start (Railway)

| Setting | Value |
|---|---|
| **Root Directory** | `apps/api` is OK (web is copied into `apps/api/web-dist` at build time) |
| **Build Command** | `npm run build` (runs from `apps/api` if that is the root) |
| **Start Command** | `node dist/start-with-worker.js` |
| **Health Check Path** | `/api/health` |

If root directory is **empty** (repo root), use build `npm run build -w @property-rental/api` and start `node apps/api/dist/start-with-worker.js` instead.

Use **`node ...` directly** for Start Command — do not wrap in `npm run` or `sh -c`, or Railway may SIGTERM the process during health checks.

The API build also compiles the web app. Leave **`VITE_API_URL` unset** — the frontend uses same-origin `/api` requests.

### Environment variables (API service)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<long random string>
NODE_ENV=production
CORS_ORIGIN=https://your-app.up.railway.app
API_PUBLIC_URL=https://your-app.up.railway.app
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

**Photo storage — Railway volume (no R2/S3):**

```
USE_LOCAL_STORAGE=true
UPLOADS_DIR=/data/uploads
```

Mount a volume at `/data/uploads` on this service.

**Photo storage — Cloudflare R2 / AWS S3 (optional):**

```
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_URL=https://your-cdn-or-public-bucket-url
```

**Optional email (offer notifications):**

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=
```

### Railway volume setup

1. Open your **app service** → **Settings** → **Volumes** → **Add Volume**
2. Mount path: `/data/uploads`
3. Set `USE_LOCAL_STORAGE=true` and `UPLOADS_DIR=/data/uploads`
4. Set `CORS_ORIGIN` and `API_PUBLIC_URL` to your **public Railway domain** (same URL for both)
5. Start command: `node apps/api/dist/start-with-worker.js` (from repo root)
6. Health check path: `/api/health`
7. Redeploy

Photos are stored on the volume and served at `https://your-app.up.railway.app/uploads/...`.

### First deploy

Run migrations once on the service:

```bash
npm run db:migrate -w @property-rental/api && npm run db:seed -w @property-rental/api
```

Then open `https://your-app.up.railway.app/search`.

## R2/S3 CORS

Only needed when using S3/R2 (not Railway volume). Allow your app origin for PUT uploads:

```json
[
  {
    "AllowedOrigins": ["https://your-app.up.railway.app", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Docker

Build and run locally:

```bash
docker build -f deploy/Dockerfile.api -t property-rental .
docker run -p 3000:3000 --env-file .env property-rental
```

Separate web-only container (optional):

```bash
docker build -f deploy/Dockerfile.web -t property-rental-web .
```

## Smoke test

After deploy:

```bash
API_URL=https://your-app.up.railway.app npm run test:smoke
```
