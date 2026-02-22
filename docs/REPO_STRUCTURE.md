# Repository Structure Guide

## Core Directories (Keep)
- `app/`: Next.js routes, pages, and API route handlers.
- `components/`: Reusable UI and domain-specific components.
- `lib/`: Shared runtime logic, utilities, and data access.
- `content/posts/`: MDX source files for blog content.
- `public/`: Static assets and generated report/data artifacts.
- `scripts/`: Operational scripts for sync/test tasks.

## Supporting Directories (Keep)
- `.github/`: CI/workflow and issue templates.
- `docs/`: Runbooks, strategy, and operational documents.
- `fixtures/`: Test/sample query inputs.
- `.meta/`: Lightweight operational trigger files.

## Generated/Local Directories (Do Not Commit)
- `.next/`: Next.js build output/cache.
- `node_modules/`: Installed dependencies.

## Cleanup Policy
- Remove OS/editor leftovers: `.DS_Store`, `*.bak`, swap files.
- Keep a single source of truth for content:
  - Blog posts must live in `content/posts/`.
  - Avoid duplicate legacy content folders.
- Archive imports/backups outside the active repo root, not beside runtime code.
- Before deleting a folder, verify there are no references with:
  - `rg -n "<folder-or-file-name>" app components lib scripts docs`

## Current Standard Top Level
- `.github/`, `.meta/`, `app/`, `apps/`, `components/`, `content/`, `docs/`, `fixtures/`, `lib/`, `public/`, `scripts/`
