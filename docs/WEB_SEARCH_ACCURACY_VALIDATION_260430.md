# Web Search Accuracy / Consistency Validation 260430

## Scope

Branch: `feature/public-bio-search-adapter`

Validated public web search APIs:

- `/api/papers/search-parallel`
- `/api/datasets/search`

Safety constraints checked:

- no API keys or private env dependency in changed runtime files
- no private local path in changed runtime files
- no private corpus/Zotero/PDF access
- public source metadata only

## Validation method

Local production server was started from the built app and POST requests were sent to paper/dataset APIs. Top results were checked for:

1. query term overlap / topical relevance,
2. URL presence and public URL shape,
3. source count consistency,
4. source health metadata,
5. duplicate behavior,
6. obvious negative-topic leakage.

## Paper search results

### Query: `endometrial organoid implantation`

- Final result count: 27
- Sources: PubMed 15, Crossref 12, OpenAlex 13
- Source health: all OK
- Top-10 URL validity: 10/10
- Top-10 obvious negative-topic hits: 0
- Top-10 strong topical matches: 8/10

Top result:

- `Modelling the impact of decidual senescence on embryo implantation in human endometrial assembloids`
- Source: OpenAlex
- DOI URL present

Assessment: good. Top results are mostly endometrium / implantation / organoid aligned. Two weaker top-10 items are broader endometrial or implantation review items, but still biologically adjacent.

### Query: `single cell RNA sequencing endometrium decidualization`

- Final result count: 24
- Sources: PubMed 15, Crossref 14, OpenAlex 14
- Source health: all OK
- Top-10 URL validity: 10/10
- Top-10 obvious negative-topic hits: 0
- Top-10 strong topical matches: 6/10

Assessment: acceptable but slightly broader than desired. Some maternal-fetal/interface or segmentation papers appear. Precision mode or stricter topic guard should be used for citation-critical work.

## Dataset search results

### Query: `endometrial single cell RNA seq`

- Final result count: 27
- Requested page size: 10
- Sources: NCBI 14, Europe PMC 8, OpenAlex 19, ENA 0
- Source health: all requested sources OK
- Top results include accession-backed records such as GSE IDs.

Assessment: usable for discovery. Accession-backed records rank high, which is correct for dataset search. Some titles are broad because public source summaries are sparse; accession-backed results should be opened and verified before downstream use.

### Query: `organoid RNA seq dataset`

- Final result count: 13
- Requested page size: 10
- Sources: NCBI-backed and OpenAlex-derived records
- Source health: all requested sources OK

Assessment: query is too broad, so broad organoid RNA-seq datasets from multiple tissues appear. This is expected. For high precision, UI should encourage tissue/context terms such as `endometrial organoid RNA-seq GSE` rather than generic `organoid RNA seq dataset`.

## Consistency findings

### Passed

- Paper API returns stable public metadata: title, source, URL, score, source health.
- Dataset API now returns source health and selected query.
- Changed runtime files pass privacy grep for API key/private path/personal-data patterns.
- Build passes.
- Paper search precision is acceptable for discovery.
- Dataset search prioritizes accession-backed records after the latest adjustment.

### Needs improvement

1. Dataset generic queries still need better tissue/context disambiguation.
2. Dataset ranking should explicitly boost accession-backed records whose title/description also matches tissue/context tokens.
3. Paper precision query mode should expose a clearer UI toggle or default when users are doing citation-critical searches.
4. Source health duration currently reflects total settled timing rather than each individual source's exact start/finish time. It is useful but not a true per-source latency benchmark.

## Recommendation

Keep this branch as a public-safe MVP. Before production merge, add one UI/help line:

> For dataset search, include tissue + modality + accession hints when possible, e.g. `endometrial organoid single-cell RNA-seq GSE`.

For manuscript/citation-critical use, paper search should still be followed by SHawn-bio-search local verification or a future public-safe citation verification endpoint.
