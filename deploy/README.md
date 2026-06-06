# Deployment Guide

Deploy to managed cloud (Railway, Render, or Fly.io) with:

- **PostgreSQL** (managed)
- **Redis** (managed)
- **S3-compatible storage** (Cloudflare R2 or AWS S3)
- **3 services:** API, Worker, Web (static)

## Environment variables

### API + Worker

```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
CORS_ORIGIN=https://your-web-domain.com
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_URL=https://your-cdn-or-public-bucket-url
NODE_ENV=production
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
SMTP_HOST=          # optional
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=
```

### Web (build-time)

```
VITE_API_URL=https://your-api-domain.com
```

## R2/S3 CORS

Allow your web origin for PUT uploads:

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
2. Add R2 bucket and credentials
3. Deploy three services from repo root using Dockerfiles in `deploy/`
4. Run migration job once: `npm run db:migrate && npm run db:seed`

## Smoke test

After deploy:

```bash
API_URL=https://your-api-domain.com npm run test:smoke
```
