#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB="$ROOT/SHawn-WEB"
LOG_DIR="$WEB/public/reports/_logs"
mkdir -p "$LOG_DIR"

TS="$(date '+%Y-%m-%d_%H-%M-%S')"
LOG_FILE="$LOG_DIR/daily-report-$TS.log"

{
  echo "[$(date '+%F %T %z')] start daily market reports"
  cd "$ROOT"
  python3 tools/generate_daily_market_reports.py --workspace "$ROOT"
  cd "$WEB"
  node scripts/sync-reports-index.mjs
  echo "[$(date '+%F %T %z')] done"
} | tee "$LOG_FILE"
