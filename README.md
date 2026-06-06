# Property Rental App

Bilingual (EN/ZH) rental marketplace for Islamabad and Rawalpindi.

## Stack

- **Frontend:** React, Vite, TypeScript, Redux Toolkit, RTK Query, Tailwind CSS, i18next, Recharts, dnd-kit, PWA
- **Backend:** Node.js 22+, Express, TypeScript, PostgreSQL 18, Drizzle ORM, Zod, JWT (httpOnly cookies), S3/MinIO, BullMQ

## Quick start (macOS with Homebrew)

### 1. Install local services

```bash
# One-time setup: PostgreSQL + Redis + create database
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

Or manually:

```bash
brew install postgresql@18 redis
brew services start postgresql@18
brew services start redis
export PATH="$(brew --prefix postgresql@18)/bin:$PATH"
createdb property_rental
cp .env.example .env
# Edit .env: set DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/property_rental
```

Add PostgreSQL 18 to your PATH permanently (keg-only formula):

```bash
echo 'export PATH="$(brew --prefix postgresql@18)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Update `.env` if needed — Homebrew Postgres typically uses your macOS username with no password:

```
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/property_rental
```

### 2. Install dependencies and run

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- **Web:** http://localhost:5173/search (public search)
- **Staff portal:** http://localhost:5173/staff/login (admin & listing staff)
- **API:** http://localhost:3000

**Bootstrap admin:** `admin@example.com` / `Admin123!` (from `.env`)

### Photo uploads

**Local dev (default):** If MinIO is not running, the API automatically stores photos on disk at `apps/api/uploads/` and serves them at `http://localhost:3000/uploads/...`. No extra setup needed.

**Optional MinIO** (S3-compatible, closer to production):

```bash
npm run minio:start
```

- Console: http://127.0.0.1:9001 (`minioadmin` / `minioadmin`)

For production, use a **Railway volume** (simplest) or Cloudflare R2 / AWS S3 — see [`deploy/README.md`](deploy/README.md).

## Scripts

| Command | Description |
|---------|-------------|
| `./scripts/setup-local.sh` | Install/start PostgreSQL 18 + Redis, create DB |
| `npm run dev` | API + web + worker |
| `npm run build` | Build all packages |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:seed` | Seed cities, sectors, roles, admin |
| `npm run test:smoke` | API smoke tests |

## Deployment (managed cloud)

See [`deploy/README.md`](deploy/README.md) for Railway/Render setup with PostgreSQL, Redis, and R2/S3.

## Features

- Zameen-inspired rental search (city, multi-sector, property type tabs, area/beds/baths/price)
- Listing cards with Email, Call, Make Offer
- Optional public accounts + My Offers
- Admin RBAC (super_admin, admin, lister, viewer)
- Draft → publish → inactive → rented out lifecycle
- Structured + bulk photo upload with drag-and-drop reorder
- Background image processing (thumbnails via BullMQ)
