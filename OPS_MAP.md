# SHawn-WEB Ops Map

> L1 entrypoint for Cursor/Hermes/Codex routing. Read this before `AGENTS.md` for normal repo entry.

## Repo role

`SHawn-WEB` is the canonical web/product surface for SHawn user-facing routes,
including the long-term dashboard surface after promotion from prototype layers.

## Trigger phrases

- website, web app, homepage, blog
- dashboard route, public dashboard, `/dashboard`
- Next.js, React UI, public release hygiene
- search regression, paper-search UX, production deploy

## Canonical paths

- Mac: `~/GitHub/SHawn-WEB`
- Linux: `/home/mdge/github/SHawn-WEB`

## Project-workspace relation

This repo owns the web/product code surface. It does not own control-plane policy,
cross-agent routing, or live DB state.

## Lightweight load path

Read this file first. Escalate to `AGENTS.md` only for editing/running this repo.

## Deep refs

- `AGENTS.md`
- `README.md`
- `docs/REACT_BEST_PRACTICE_GATE.md`
- `docs/PUBLIC_RELEASE_CHECKLIST.md`

## Allowed operations

- Web/frontend code edits
- Public-safety, lint, build, and search-regression verification
- Promotion of validated dashboard behavior from prototype repos

## Forbidden operations

- Do not move SHawn control-plane truth here
- Do not treat cloud-synced folders as live DB paths
- Do not skip public release hygiene before shipping web changes

## Verification

```bash
git status -sb
npm run check:public-safety
npm run lint
npm run build
```
