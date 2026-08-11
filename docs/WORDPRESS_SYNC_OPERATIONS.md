# WordPress → SHawn-WEB → Vercel Operations

## Purpose

The public website mirrors all currently published posts from three read-only WordPress sources:

| WordPress source | SHawn-WEB lane |
|---|---|
| `shawnaiintelligence.wordpress.com` | AI Notes |
| `shawnbiohub.wordpress.com` | Bio Notes |
| `shawnassets.wordpress.com` | Asset Signals |

The importer preserves the WordPress post ID, source site, canonical source URL, publication date, body images, and featured image. A post that is unpublished or removed from WordPress is removed from the managed SHawn-WEB mirror only after all three source fetches pass completeness checks.

## Commands

```bash
# Deterministic fixture test: create, no-change idempotency, update, removal, URL safety
corepack pnpm run test:wordpress-public-sync

# Read-only live source preview
corepack pnpm run sync:wordpress-public:dry

# Live write to content/posts and content/wordpress-sync-manifest.json
corepack pnpm run sync:wordpress-public

# Full public-content preflight and sync
corepack pnpm run sync:public-content

# Read-only production-alias HTTP verification
/home/mdge/.hermes/scripts/shawn_web_wordpress_sync.sh --verify-production-only
```

## Scheduled production path

- Scheduler job: `[SUPPORT] SHawn-WEB nightly WordPress→Vercel sync`
- Schedule: daily at 03:30 KST, after the three WordPress publishing pipelines
- Script: `/home/mdge/.hermes/scripts/shawn_web_wordpress_sync.sh`
- Delivery: script-only watchdog; unchanged runs produce no message
- Git behavior: the managed public mirror (`content/` plus `public/reports/index.json` and `public/reports/latest.json`) is committed locally with that scope only; no remote push
- Deployment: verified production build, then an isolated file snapshot is sent to Vercel production and read back over HTTP
- Boundary: generated market time-slice packages under `public/reports/time-sliced/` have their own producer/release lifecycle. They are excluded from this WordPress/public-index baseline and deploy snapshot; this job never silently promotes them.

## Safety gates

1. A non-blocking file lock prevents overlapping runs.
2. Vercel account identity and linked-project read access are verified before any sync write or generated-content commit; an empty or rejected identity fails before mutation. Final production deploy permission is still validated by the deploy command itself.
3. A reviewed non-content source baseline prevents unrelated dirty code from entering an automatic deployment; independently generated `public/reports/time-sliced/` packages are excluded from this blog/public-index lane.
4. Pre-existing managed public-mirror dirtiness (`content/`, `public/reports/index.json`, or `public/reports/latest.json`) blocks the run, preventing manual and generated content from being mixed.
5. The nightly job runs the full `sync:public-content` pipeline: deterministic WordPress fixture test, SHide package test, investment public-safety test, forbidden-term pre/post checks, WordPress import, and report-index refresh.
6. Public forbidden-term checks run before and after the import.
7. All three WordPress sources must return `fetched === remote_total`; otherwise no removal reconciliation occurs.
8. Unsupported URL protocols are stripped from imported links and images.
9. Unchanged MDX files are not rewritten, and an unchanged manifest keeps its prior hash and timestamp.
10. The last deployed managed-public digest (`content/` plus the public report index/latest) is stored outside the repository. A failed deployment is retried on the next run even when WordPress has no newer change.
11. After the build, the approved non-content digest and committed managed-public state are checked again.
12. Deployment uses a temporary snapshot containing only tracked and non-ignored untracked files, excluding separate generated time-slice report artifacts, plus the local Vercel project link; ignored secrets and later worktree mutations are excluded.
13. Vercel inspection must show the expected production alias (`https://shawnlab.vercel.app`), and that alias must keep all redirects on the same origin while passing content-aware HTTP readback for `/`, `/blog`, `/privacy`, and `/sitemap.xml`; only then does the deployment state marker advance.

## Approving intentional website source changes

The scheduled job refuses to deploy when non-content website files differ from the last reviewed baseline. After reviewing and verifying an intentional source/UI change, refresh the baseline explicitly:

```bash
/home/mdge/.hermes/scripts/shawn_web_wordpress_sync.sh --approve-baseline-only
```

This records a digest only. It does not store file contents or secrets and does not deploy.

## Recovery

- **WordPress/API failure:** fix the source/API issue and rerun; no partial deletion is performed.
- **Build failure:** fix the website gate failure, reapprove the source baseline, and rerun.
- **Vercel failure after local content commit:** rerun the same script. The undeployed content-tree digest causes deployment to retry.
- **Unexpected `content/` dirtiness:** inspect and separate manual edits before rerunning. Never bypass the guard by staging unrelated content.
