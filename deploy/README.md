# Deployment Guide

Deploy to managed cloud (Railway, Render, or Fly.io) with:

- **PostgreSQL** (managed)
- **Redis** (managed)
- **Photo storage:** Railway volume (simple) **or** S3-compatible storage (Cloudflare R2 / AWS S3)
- **2–3 services:** API (+ worker), Web (static)

## Environment variables

### API (+ worker on same service)

```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
CORS_ORIGIN=https://your-web-domain.com
NODE_ENV=production
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
API_PUBLIC_URL=https://your-api-domain.com
```

**Option A — Railway volume (no R2/S3 needed):**

```
USE_LOCAL_STORAGE=true
UPLOADS_DIR=/data/uploads
```

Set the API service **Start Command** to (no extra `sh -c` wrapper):

```bash
npm run start:with-worker -w @property-rental/api
```

The worker must run on the **same service** as the API so both can read/write the volume. Do not deploy a separate worker service when using a volume.

**Option B — Cloudflare R2 / AWS S3:**

```
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_URL=https://your-cdn-or-public-bucket-url
```

Deploy API and worker as separate services (see Dockerfiles).

**Optional email (offer notifications):**

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=
```

### Web (build-time)

```
VITE_API_URL=https://your-api-domain.com
```

## Railway volume setup

1. Open your **API service** → **Settings** → **Volumes** → **Add Volume**
2. Mount path: `/data/uploads`
3. Add variables on the API service:

| Variable | Value |
|---|---|
| `USE_LOCAL_STORAGE` | `true` |
| `UPLOADS_DIR` | `/data/uploads` |
| `API_PUBLIC_URL` | your API public URL (e.g. `https://propertyrental-api.up.railway.app`) |

4. Set **Start Command** to `npm run start:with-worker -w @property-rental/api`
5. Redeploy

Photos are stored on the volume and served at `https://your-api-domain.com/uploads/...`.

**Notes:**

- Volumes persist across redeploys; container disk does not.
- Volume size limits depend on your Railway plan.
- For high traffic or many photos, R2/S3 scales better than a single volume.

## R2/S3 CORS

Only needed for Option B. Allow your web origin for PUT uploads:

```json
[
  {
    "AllowedOrigins": ["https://your-web-domain.com", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Docker

Build and run locally:

```bash
docker build -f deploy/Dockerfile.api -t property-rental-api .
docker build -f deploy/Dockerfile.worker -t property-rental-worker .
docker build -f deploy/Dockerfile.web -t property-rental-web .
```

## Railway example

1. Create project with Postgres + Redis plugins
2. Choose photo storage: **Railway volume** (above) **or** R2 bucket + credentials
3. Deploy API (+ worker via `start:with-worker` if using volume) and Web from repo root
4. Run migration job once: `npm run db:migrate -w @property-rental/api && npm run db:seed -w @property-rental/api`

## Smoke test

After deploy:

```bash
API_URL=https://your-api-domain.com npm run test:smoke
```
