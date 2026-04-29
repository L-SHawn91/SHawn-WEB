# Public Bio Search Adapter vs SHawn Bio Ecosystem — 260430

## Scope

This note compares the current `SHawn-WEB` public-safe adapter branch with the broader SHawn bio ecosystem. It focuses on what can safely run on the public web without private credentials, local paths, private corpus databases, institutional access, or unpublished project material.

## Current web branch

- Repo: `SHawn-WEB`
- Branch: `feature/public-bio-search-adapter`
- Commit: `26c4522 feat(web): add public-safe bio search workflow adapter`
- Adapter: `lib/bio-search-public/workflow.ts`
- Connected API: `app/api/papers/search-parallel/route.ts`

## Smoke test

Local API smoke test against `/api/papers/search-parallel`:

- Query: `endometrial organoid implantation`
- Mode: `broad`
- Sources: `pubmed`, `crossref`, `openalex`
- Year from: `2020`

Observed result:

- Final paper count: `27`
- Track counts: PubMed `15`, Crossref `12`, OpenAlex `13`, final `27`
- First result: `Modelling the impact of decidual senescence on embryo implantation in human endometrial assembloids` / OpenAlex / 2021 / DOI URL available

## Comparison table

| Capability | SHawn bio ecosystem / `SHawn-bio-search` | Public web adapter status | Note |
|---|---|---|---|
| Multi-source paper search | 16-source design including PubMed, Europe PMC, OpenAlex, Crossref, clinical trials, preprints, optional keyed sources | Partial | Web currently uses PubMed, arXiv, Semantic Scholar, Crossref, OpenAlex. Public adapter adds workflow scoring but not all sources yet. |
| Credential-free public mode | Supported through free-source selection and graceful degradation | Yes | Public adapter intentionally excludes keyed/private sources. |
| Query expansion | Biomedical synonym expansion + safe expansion mode | Partial | Static public-safe synonym expansion added in TypeScript. Needs broader map parity. |
| PubMed MeSH shaping | Static + optional live MeSH lookup | Partial | Static MeSH shaping added. No live lookup/API key use in public web. |
| Parallel fetch | ThreadPool source fetch in Python | Existing web parallel route | Next.js route already performs parallel public fetches. |
| Fetch cache / source health | TTL cache and failure monitor in Python | Missing | Good next public-safe improvement. No secrets required. |
| Deduplication | DOI > title > id with merge metadata/source hits | Partial | Public adapter now uses DOI/public id/title key. Full source-hit merge is not yet ported. |
| Ranking | Claim/hypothesis overlap, citation velocity, recency, source weight, metadata, optional embeddings/LLM | Partial | Public adapter uses public citation/recency/source/metadata scoring. No embeddings/LLM/private model. |
| Topic guard | Negative off-topic filters and expansion drift control | Partial | Public topic guard added. Needs organism/tissue negative filter parity. |
| Citation verification | DOI/PMID/claim-level evidence verification | Missing from web adapter | Should be a separate public-safe endpoint/phase after search. |
| Export bundle | JSON/BibTeX/RIS in ecosystem | Missing from web UI | Safe to add later if only public metadata is exported. |
| Dataset search | Ecosystem supports dataset/retrieval workflows | Existing independent web API | Not yet connected to the new public adapter. |
| Private corpus / Zotero / full-text | Available in local ecosystem | Excluded | Must stay excluded from public web. |
| Keyed sources: Scopus/SciVal/SerpAPI/Core etc. | Available when configured locally | Excluded | Must stay excluded from public web branch. |
| LLM triage / embeddings | Optional in local ecosystem | Excluded | Public web should not depend on local Ollama/API keys. |

## Interpretation

The current branch is a first public-safe subset, not a full transplant. The safe transplant boundary is correct: keep the web self-contained, use only public sources, and port the workflow logic rather than executing local Python or private machine state.

## Recommended next steps

1. Add public-safe source health and timeout accounting to `lib/bio-search-public/`.
2. Port stronger dedupe merge behavior: keep `source_hits`, DOI/PMID/PMCID, best abstract, best URL.
3. Add citation velocity scoring instead of simple citation count.
4. Add negative topic guard terms from `SHawn-bio-search` while allowing query-mentioned exceptions.
5. Add a second public-safe endpoint for citation verification using DOI/title/abstract metadata only.
6. Only after paper search stabilizes, apply the same adapter pattern to `/api/datasets/search`.

## Safety rule

Do not add private paths, `.env.local`, API keys, local Python execution, institutional access, Zotero/PDF/corpus access, or unpublished internal outputs to public web runtime or public web responses.
