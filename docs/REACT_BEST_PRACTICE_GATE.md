# React / Next.js Best-Practice Gate

This repo follows the shared SHawn frontend gate:

- Canonical policy: `<git_root>/SHawn-sync/rules/frontend_react_best_practice_gate.md`
- Scope: Next.js `app/`, route handlers, React components, UI providers, search pages, dashboard pages, and browser-visible behavior.

## SHawn-WEB-specific guardrails

- Default to server components; use `"use client"` only for browser state, event handlers, effects, or client-only libraries.
- Keep secrets, filesystem, DB, and server-only logic out of client components.
- Search/data pages must show loading, error, no-result, and external-source outage states.
- Public-facing pages must keep source attribution, disclaimers, and forbidden-term/i18n checks intact.
- Do not import heavy server-only libraries into client bundles.

## Minimum verification for frontend changes

```bash
git status -sb
corepack pnpm run check:i18n
corepack pnpm run check:forbidden-terms
corepack pnpm run lint
corepack pnpm run build
```

For search UI/API changes, also run:

```bash
corepack pnpm run test:search
corepack pnpm run test:search:regression
```

For visible layout/interaction changes, run browser smoke:

1. Start dev/preview server.
2. Open the touched route.
3. Check console errors.
4. Exercise the changed interaction or search path.
5. Capture screenshot/vision evidence if readability/layout is part of the change.

## Review questions

- Is `use client` necessary and tightly scoped?
- Is state/effect usage simpler than the implementation?
- Are server-only data and credentials isolated from client code?
- Are loading/error/empty states complete?
- Does mobile/narrow layout handle Korean/English mixed labels?
- Are accessibility labels and keyboard paths present?
