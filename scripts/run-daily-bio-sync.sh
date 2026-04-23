#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB="$ROOT/SHawn-WEB"
BIO="${BIO_REPO_PATH:-$ROOT/SHawn-BIO}"
LOG_DIR="$WEB/public/bio-data/_logs"
mkdir -p "$LOG_DIR"

TS="$(date '+%Y-%m-%d_%H-%M-%S')"
LOG_FILE="$LOG_DIR/daily-bio-$TS.log"

{
  echo "[$(date '+%F %T %z')] start daily bio sync"
  if [ -d "$BIO" ] && [ -f "$BIO/tools/publish_bio_feed.py" ]; then
    cd "$BIO"
    python3 tools/publish_bio_feed.py --target "$WEB/public/bio-data"
  else
    echo "[warn] SHawn-BIO publisher not found at $BIO/tools/publish_bio_feed.py (skipping upstream)"
  fi
  cd "$WEB"
  node scripts/sync-bio-index.mjs
  echo "[$(date '+%F %T %z')] done"
} | tee "$LOG_FILE"
