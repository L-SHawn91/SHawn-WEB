# SHawnbrain Platform Strategy (Web + Desktop + Mobile)

## Context
- Existing production web hub: `shawnlab.vercel.app` (Next.js App Router)
- Existing domain repo: `LinuxSH` (bio dataset + analysis docs/metadata)
- Goal: one UX, multi-runtime
  - Web (share/search)
  - Desktop app (local read/write/watch)
  - Mobile (PWA-like app UX)

## Decision (recommended)
**Hybrid B architecture**
- Keep Web on Vercel as primary shared interface
- Add local gateway for desktop runtime (file system read/write/watch)
- Reuse UI components across Web and Desktop (Tauri shell)

## Data Source Layer (must-have)
Create a single adapter boundary:
- `remote` adapter (current `/api/papers`, `/api/datasets`, `/api/related`)
- `local` adapter (`/tree`, `/doc`, `/write`, `/watch`)

Switch by runtime/env:
- Web: remote-first
- Desktop: local-first + remote optional for cloud features

## Mobile Strategy
- Do **not** replicate desktop local-FS behavior in mobile browser
- Use mobile web + PWA:
  - installable app shell
  - responsive tree/search UI
  - read + light edit + PR workflow

## Open-source references to adopt
1. **Tauri v2** (desktop shell, cross-platform)
2. **next-pwa / Workbox** (PWA install/offline)
3. **React Aria Tree / TanStack Virtual** (large tree performance)
4. **CodeMirror 6 / Monaco** (markdown editor)
5. **Mermaid + react-markdown** (structured scientific docs)
6. **Chokidar / watchdog** (file watcher, local gateway)
7. **isomorphic-git / simple-git** (optional commit/PR helpers)
8. **OpenAlex + Crossref + PubMed E-utils + Semantic Scholar** (already in use, unify quality scoring)

## Model/AI references to integrate
- Retrieval and assistant layer (for feature explainability and task routing):
  - OpenAI GPT-4.1/4o class
  - Anthropic Claude 3.5/3.7 Sonnet class
  - Google Gemini 2.0/2.5 class
- Local-friendly option for desktop privacy mode:
  - Llama 3.1 8B/70B via Ollama (fallback, lower quality but local)

## 4-Phase Execution
### Phase 1 (1 week): Adapter split + capability index
- Add `lib/data-source/*` with runtime switch
- Auto-index capabilities/content for chatbot responses
- Add source reliability metadata in UI tooltips

### Phase 2 (1-2 weeks): Local Gateway MVP
- Endpoints: `/tree`, `/doc`, `/write`
- Path safety + root sandbox + audit logging
- Desktop-only route wiring

### Phase 3 (1 week): Tauri Desktop shell
- Reuse existing Next UI
- Add folder picker, recent roots, watcher events
- Offline-first cache

### Phase 4 (1 week): Mobile PWA + PR workflow
- manifest + SW + install prompt
- mobile optimized navigation and chips/search
- web edit -> PR (safe write path)

## Risk & Mitigation
1. SSR/static mismatch in desktop bundle
   - Mitigate with adapter abstraction + local gateway process
2. File collision in bidirectional edits
   - Version token + conflict dialog
3. Mobile cannot full local-FS edit
   - Explicit role split: mobile light-edit + PR flow
4. Source trust/noise in paper/dataset retrieval
   - Intent-aware filtering + explainable score badges

## Immediate next actions
1. Implement adapter skeleton in SHawn-WEB
2. Implement local gateway MVP in LinuxSH workspace
3. Add PWA baseline in SHawn-WEB
4. Create integration test matrix (Web/Desktop/Mobile)
