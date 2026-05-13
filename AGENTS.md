# SHawn-WEB — Agent Instructions

## Repo role

Web/product surface repo for SHawn ecosystem components.

This repository is part of the SHawn system ecosystem. Treat improvements to its structure, tests, documentation, and automation as ecosystem work, not as incidental helper-code edits.

## Operating rules

1. Start by checking `git status -sb` and do not overwrite dirty work from another agent.
2. Keep secrets, credentials, raw private data, temporary caches, and large generated intermediates out of git.
3. Route durable cross-repo decisions to `/home/mdge/github/SHawn-sync/memory/YYYY-MM-DD.md` or `rules/` as appropriate.
4. Route active handoff/work logs to `/home/mdge/github/SHawn-sync/workflow/active/` or `workflow/handoff/`.
5. Route repeated corrections, tool failures, missing features, and best practices to `/home/mdge/github/SHawn-learn`.
6. Prefer small, reviewable commits with clear owner scope. Do not mix generated artifacts with source-code or rule changes unless the repo explicitly owns those generated assets.

## Cross-repo boundaries

- `SHawn-sync` owns ecosystem rules, path contracts, workflow/handoff, and cross-machine coordination.
- `SHawn-learn` owns cross-agent learning intake and promotion candidates.
- `~/SHawn` is the active DB workspace; OneDrive/GDrive are not live DB write locations.

## Frontend gate

For React/Next.js UI changes, apply `docs/REACT_BEST_PRACTICE_GATE.md` and the canonical SHawn policy at `<git_root>/SHawn-sync/rules/frontend_react_best_practice_gate.md`.

## Verification

Before reporting completion, run the repo's available tests/checks if present, then re-run `git status -sb` and summarize remaining dirty/untracked files.
