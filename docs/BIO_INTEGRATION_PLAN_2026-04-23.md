# SHawn-BIO Integration Plan (2026-04-23)

## Context
SHawn-WEB previously integrated deeply with SHawn-INV (sync scripts, snapshot proxy, reports routes) but only exposed placeholder pages for SHawn-BIO. This document records the mirror of the INV pipeline onto BIO and the addition of a unified `/lab` hub that aggregates INV + BIO + BOT status.

## Architecture Mirror

| Concern | SHawn-INV (existing) | SHawn-BIO (new) |
|---|---|---|
| Publishing target | `public/reports/` | `public/bio-data/` |
| Filename convention | `YYYY-MM-DD_HH-MM_TYPE.json` | `YYYY-MM-DD_TYPE_SLUG.json` |
| Index builder | `scripts/sync-reports-index.mjs` | `scripts/sync-bio-index.mjs` |
| Daily orchestrator | `scripts/run-daily-market-reports.sh` | `scripts/run-daily-bio-sync.sh` |
| Index API | `GET /api/reports` | `GET /api/bio/index` |
| Item API | (file served static) | `GET /api/bio/items/[slug]` |
| Snapshot proxy | `GET /api/invest/snapshot` | `GET /api/bio/snapshot` |
| CI sync | `.github/workflows/reports-sync.yml` | `.github/workflows/bio-sync.yml` |
| Hub UI | `components/invest/invest-hub-page.tsx` | `components/bio/bio-hub-page.tsx` |
| Route tree | `/invest{,/reports,/archive,/dashboard,/search}` | `/bio{,/research,/archive,/papers,/datasets}` |

## Env Variables
- `SHAWN_BIO_SNAPSHOT_URL` — optional live BIO snapshot upstream (mirrors `SHAWN_INV_SNAPSHOT_URL`).
- `BIO_REPO_PATH` — filesystem path to `SHawn-BIO` repo; consumed by `run-daily-bio-sync.sh`.

## /lab Hub
- Route: `/lab`
- API: `GET /api/lab/status` returns `{ inv, bio, bot, generatedAt }`.
- Signals collected:
  - `inv` — latest entry from `public/reports/index.json`
  - `bio` — latest entry from `public/bio-data/index.json`
  - `bot` — HEAD check on `${GCP_BRAIN_URL}/healthz` (2.5s timeout, degrades to `unknown` on failure)

## SHawn-BIO Producer Contract
SHawn-BIO should provide a `tools/publish_bio_feed.py --target <path>` that writes files matching:
```
public/bio-data/<YYYY-MM-DD>_<TYPE>_<slug>.json
```
with payload shape:
```json
{
  "meta": {
    "title": "…",
    "summary": "…",
    "tags": ["…"],
    "type": "NOTE | ORGANOID | DATASET | PAPER | PROTOCOL",
    "slug": "…",
    "date": "YYYY-MM-DD",
    "timestamp": "YYYY-MM-DDTHH:mm:ss+09:00"
  },
  "body": "…"
}
```

## Verification
1. Drop a sample file under `public/bio-data/`, run `npm run bio:sync-index`, confirm `index.json` picks it up.
2. `curl /api/bio/index` → page of items; `curl /api/bio/items/<slug>` → single payload.
3. Visit `/bio`, `/bio/research`, `/bio/archive` — overview cards and feed render.
4. Visit `/lab` — three status cards (INV/BIO/BOT) render with deep links.
5. `npm run check:i18n && npm run check:forbidden-terms && npm run lint && npm run build`.
