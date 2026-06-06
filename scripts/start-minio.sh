#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MINIO_DATA="$ROOT/.minio-data"
MINIO_LOG="$MINIO_DATA/minio.log"
MINIO_PID="$MINIO_DATA/minio.pid"

mkdir -p "$MINIO_DATA"

if lsof -ti:9000 >/dev/null 2>&1; then
  echo "MinIO already running on http://127.0.0.1:9000"
else
  echo "==> Starting MinIO..."
  if ! command -v minio >/dev/null 2>&1; then
    echo "==> Installing MinIO via Homebrew..."
    brew install minio/stable/minio
  fi

  export MINIO_ROOT_USER="${S3_ACCESS_KEY:-minioadmin}"
  export MINIO_ROOT_PASSWORD="${S3_SECRET_KEY:-minioadmin}"

  nohup minio server "$MINIO_DATA" \
    --address "127.0.0.1:9000" \
    --console-address "127.0.0.1:9001" \
    > "$MINIO_LOG" 2>&1 &

  echo $! > "$MINIO_PID"

  for i in {1..30}; do
    if curl -sf "http://127.0.0.1:9000/minio/health/live" >/dev/null 2>&1; then
      echo "MinIO ready:"
      echo "  API:     http://127.0.0.1:9000"
      echo "  Console: http://127.0.0.1:9001  (${MINIO_ROOT_USER}/${MINIO_ROOT_PASSWORD})"
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "MinIO failed to start. See $MINIO_LOG"
      exit 1
    fi
    sleep 1
  done
fi

echo "==> Ensuring S3 bucket exists..."
cd "$ROOT"
npm run s3:ensure-bucket -w @property-rental/api --silent 2>/dev/null \
  || npm run s3:ensure-bucket -w @property-rental/api
