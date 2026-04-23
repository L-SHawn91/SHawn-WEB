#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB="$ROOT/SHawn-WEB"
BIO="${BIO_REPO_PATH:-$ROOT/SHawn-BIO}"
LOG_DIR="$WEB/public/bio-data/_logs"
STATUS_FILE="$LOG_DIR/last-sync.json"
MAX_ATTEMPTS="${BIO_SYNC_MAX_ATTEMPTS:-3}"
mkdir -p "$LOG_DIR"

TS="$(date '+%Y-%m-%d_%H-%M-%S')"
LOG_FILE="$LOG_DIR/daily-bio-$TS.log"

publish_status="skipped"
publish_attempts=0
publish_detail=""
index_status="pending"
index_detail=""
started_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

run_publisher() {
  if [ ! -d "$BIO" ] || [ ! -f "$BIO/tools/publish_bio_feed.py" ]; then
    publish_status="skipped"
    publish_detail="publisher not found at $BIO/tools/publish_bio_feed.py"
    echo "[warn] $publish_detail"
    return 0
  fi

  local delay=2
  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    publish_attempts="$attempt"
    echo "[info] publisher attempt $attempt/$MAX_ATTEMPTS"
    if (cd "$BIO" && python3 tools/publish_bio_feed.py --target "$WEB/public/bio-data"); then
      publish_status="ok"
      publish_detail="succeeded on attempt $attempt"
      return 0
    fi
    echo "[warn] publisher attempt $attempt failed"
    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      sleep "$delay"
      delay=$((delay * 2))
    fi
  done
  publish_status="error"
  publish_detail="publisher failed after $MAX_ATTEMPTS attempts"
  return 0
}

run_indexer() {
  if (cd "$WEB" && node scripts/sync-bio-index.mjs); then
    index_status="ok"
    index_detail="sync-bio-index completed"
    return 0
  fi
  index_status="error"
  index_detail="sync-bio-index failed"
  return 1
}

write_status() {
  local finished_at
  finished_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  cat >"$STATUS_FILE" <<JSON
{
  "startedAt": "$started_at",
  "finishedAt": "$finished_at",
  "publish": {
    "status": "$publish_status",
    "attempts": $publish_attempts,
    "detail": "$publish_detail"
  },
  "index": {
    "status": "$index_status",
    "detail": "$index_detail"
  },
  "log": "$(basename "$LOG_FILE")"
}
JSON
}

# Route stdout/stderr through tee via process substitution so status variables
# mutated by run_publisher/run_indexer remain visible to write_status.
exec > >(tee "$LOG_FILE") 2>&1

echo "[$(date '+%F %T %z')] start daily bio sync"
run_publisher || true
run_indexer || true
echo "[$(date '+%F %T %z')] done — publish=$publish_status index=$index_status"

write_status

# Exit non-zero only if indexer failed; publisher failures are tolerated so the
# index still reflects whatever has already been persisted locally.
if [ "$index_status" != "ok" ]; then
  exit 1
fi
