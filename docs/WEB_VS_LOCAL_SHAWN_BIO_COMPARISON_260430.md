# Web Public Bio Search vs Local SHawn Bio Ecosystem Comparison 260430

## Scope

Compared the public-safe `SHawn-WEB` adapter branch against local `SHawn-bio-search` ecosystem runs.

- Web branch: `feature/public-bio-search-adapter`
- Web APIs:
  - `/api/papers/search-parallel`
  - `/api/datasets/search`
- Local tools:
  - `python3 -m shawn_bio_search.cli`
  - `python3 scripts/dataset_search.py`

All web-side checks used public metadata only. No API key, private path, local corpus, Zotero, PDF store, or institutional access was used by the web adapter.

## Why the live web did not show changes

The branch existed only locally. It was not on the GitHub remote, and it was not merged into the deploy branch. Therefore production web could not reflect it yet.

## Paper comparison

### Query: `endometrial organoid implantation`

| Metric | Web public adapter | Local SHawn-bio-search |
|---|---:|---:|
| Returned count | 27 | 56 |
| Top-10 strong topical matches | 8/10 | 1/10 |
| Top-10 obvious negative-topic hits | 0 | 2 |
| Top-20 overlap | 0 | 0 |

Web top result:

- `Modelling the impact of decidual senescence on embryo implantation in human endometrial assembloids`

Local top result:

- `Organoid Models and Applications in Biomedical Research`

Interpretation: the current web adapter is narrower and better aligned for this query than the local broad retrieval configuration. Local ecosystem covers more sources and returns more total records, but the broad ranking can surface generic or off-topic high-impact records unless stronger claim/verification settings are used.

### Query: `single cell RNA sequencing endometrium decidualization`

| Metric | Web public adapter | Local SHawn-bio-search |
|---|---:|---:|
| Returned count | 24 | 56 |
| Top-10 strong topical matches | about 2/10 by strict token check | 0/10 by strict token check |
| Top-10 obvious negative-topic hits | 0 | 1 |
| Top-20 overlap | 0 | 0 |

Interpretation: both systems need stronger precision for this query. Web is safer, but still allows broad maternal-fetal/interface and general single-cell papers. Local ecosystem has broader coverage but needs claim-level verification or stricter topic guard for citation-critical usage.

## Dataset comparison

### Query: `endometrial single cell RNA seq`

| Metric | Web public adapter after NCBI expansion | Local dataset search |
|---|---:|---:|
| Returned count | 30 | 97 |
| NCBI-source hits | 40 before guard/merge | local includes GEO/SRA/BioProject directly |
| Top-20 overlap | 1 | 1 |
| Accession-backed top results | yes | yes |

Web now includes NCBI `gds`, `sra`, and `bioproject` public E-utilities sequentially to reduce rate-limit failures and better match local ecosystem coverage.

Important overlapping record:

- `GSE294752` — `Single Cell RNA-seq of PgrCre/+Srfflox/flox and Srfflox/flox mouse uterus at gestation day 3.5`

Interpretation: dataset web coverage improved materially after adding NCBI SRA/BioProject style expansion, but local ecosystem still has deeper source-specific dataset discovery.

### Query: `organoid RNA seq dataset`

| Metric | Web public adapter after NCBI expansion | Local dataset search |
|---|---:|---:|
| Returned count | 13 | 83 |
| Top-20 overlap | 0 | 0 |
| Issue | broad organoid multi-tissue hits | broad organoid multi-tissue hits |

Interpretation: this query is under-specified. Both web and local ecosystem return multi-tissue organoid RNA-seq datasets. This is expected. Precision requires adding tissue/context, e.g. `endometrial organoid RNA-seq GSE`.

## Web-side improvements made from comparison

1. Added public NCBI dataset expansion across:
   - `gds`
   - `sra`
   - `bioproject`
2. Switched NCBI calls to sequential execution to avoid public E-utilities rate-limit collapse.
3. Kept web runtime public-safe: no local Python execution, no private paths, no secret-dependent sources.
4. Preserved web UI response shape while adding source health and better dataset coverage.

## Remaining gap

The local SHawn bio ecosystem still has broader dataset-source coverage and richer local workflow options. The web adapter should not try to fully mirror private/local behavior. Instead, it should aim for:

- safe public discovery,
- good first-pass relevance,
- clear source health,
- public accession/DOI traceability,
- handoff to local SHawn-bio-search for citation-critical or manuscript-grade verification.

## Recommendation

Use the web search as a public-safe discovery surface. For final paper citation or dataset selection, route through local SHawn-bio-search verification.

Next public-safe improvement should be a dedicated citation/dataset verification endpoint that checks DOI/accession metadata against public sources only.
