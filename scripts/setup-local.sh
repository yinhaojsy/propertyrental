#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PG_SERVICE="postgresql@18"
PG_FORMULA="postgresql@18"

echo "==> Checking Homebrew..."
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install from https://brew.sh"
  exit 1
fi

echo "==> Installing PostgreSQL 18 (if needed)..."
if ! brew list "$PG_FORMULA" >/dev/null 2>&1; then
  brew install "$PG_FORMULA"
fi

BREW_PG="$(brew --prefix "$PG_FORMULA")"
export PATH="$BREW_PG/bin:$PATH"

echo "==> Starting PostgreSQL 18..."
brew services start "$PG_SERVICE" 2>/dev/null || true

# Wait for postgres to accept connections
for i in {1..30}; do
  if pg_isready -q 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "==> Creating database property_rental (if missing)..."
createdb property_rental 2>/dev/null || echo "Database property_rental already exists."

echo "==> Installing Redis (if needed, for background jobs)..."
if ! brew list redis >/dev/null 2>&1; then
  brew install redis
fi
echo "==> Starting Redis..."
brew services start redis 2>/dev/null || true

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
fi

DB_USER="$(whoami)"
echo "==> Setting DATABASE_URL for user ${DB_USER}..."
if grep -q '^DATABASE_URL=' .env; then
  sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}@localhost:5432/property_rental|" .env 2>/dev/null \
    || sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}@localhost:5432/property_rental|" .env
fi

fi

echo ""
echo "Local services ready."
echo "  PostgreSQL: 18 (property_rental on localhost:5432)"
echo "  Redis:      localhost:6379"
echo "  Photos:     local disk (apps/api/uploads/) if MinIO not running"
echo ""
echo "Add PostgreSQL 18 to your shell profile if needed:"
echo "  export PATH=\"$(brew --prefix postgresql@18)/bin:\$PATH\""
echo ""
echo "Next steps:"
echo "  npm install"
echo "  npm run db:migrate"
echo "  npm run db:seed"
echo "  npm run dev"
