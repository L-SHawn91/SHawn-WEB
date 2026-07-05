# Content syndication module

Fans one piece of hub content out to multiple channels (Create Once, Publish
Everywhere). Design: `docs/SYNDICATION_ORCHESTRATOR_SPEC.md`,
`docs/WORDPRESS_ADAPTER_SPEC.md`, `docs/NAVER_BLOG_ADAPTER_SPEC.md`,
`docs/CONTENT_SYNDICATION_ARCHITECTURE.md`.

## Model

The **hub** is SHawn-WEB (`content/posts/*.mdx`, canonical `phdshawn.com/blog/{slug}`),
produced by the existing `pnpm sync:shide-blog` pipeline. This module reads the
**already-baked MDX** as the normalized source (so slug/canonical always match
production) and pushes to spokes.

```
SHide package --(pnpm sync:shide-blog)--> content/posts/{slug}.mdx  (HUB)
                                              │  orchestrate.mjs
                        ┌─────────────────────┼───────────────────┐
                   shawn-web (deploy)     wordpress (REST)      naver (draft)
```

| Channel | Mode | Notes |
|---|---|---|
| `shawn-web` | hub | verifies MDX + triggers Vercel Deploy Hook |
| `wordpress` | spoke, auto | WordPress.com REST OAuth2, create/update + media |
| `naver` | spoke, semi-auto | writes a paste-ready draft bundle; human publishes (write API terminated 2020) |

## Usage

```bash
# Preview everything, no writes / no network:
node scripts/syndication/orchestrate.mjs --slug assets-20260702-semiconductor-trend --dry-run

# Generate the Naver draft bundle only:
node scripts/syndication/orchestrate.mjs --slug <slug> --channels naver

# Draft to WordPress (draft-first) + Naver bundle + deploy hub:
node scripts/syndication/orchestrate.mjs --slug <slug>

# Publish (not draft) — respect SHide 1/day cadence:
node scripts/syndication/orchestrate.mjs --slug <slug> --publish

# All recent posts:
node scripts/syndication/orchestrate.mjs --all --filter 20260702 --dry-run
```

## Env

| Var | Purpose |
|---|---|
| `WP_TOKEN_AI` / `WP_TOKEN_ASSETS` / `WP_TOKEN_BIO` | WordPress.com OAuth2 bearer per site |
| `VERCEL_DEPLOY_HOOK_URL` | hub redeploy trigger |
| `SYNDICATION_HUB_BASE_URL` | override canonical base (default `https://phdshawn.com`) |

Tokens/secrets go in env only — never commit (`credential_bridge_safety`).

## State

`content/syndication-state.json` maps `packageId → channel → target → {postId,url,...}`
for idempotent updates. Delete an entry to force re-create.

## Suggested package.json scripts

```json
"syndicate": "node scripts/syndication/orchestrate.mjs",
"syndicate:dry": "node scripts/syndication/orchestrate.mjs --dry-run"
```

## Not implemented on purpose

- Naver auto-publish (API terminated 2020; browser automation = ToS/ban risk).
- Tistory (Open API terminated 2024).
