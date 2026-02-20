"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Database, ExternalLink, Filter, Search, Sparkles } from "lucide-react";

type DatasetSource =
  | "huggingface"
  | "kaggle"
  | "ncbi"
  | "ena"
  | "europepmc"
  | "datagov"
  | "dataeu"
  | "zenodo"
  | "dryad"
  | "dataverse"
  | "figshare"
  | "github"
  | "openml"
  | "crossref"
  | "openalex"
  | "cngb";

interface DatasetItem {
  id: string;
  title: string;
  description: string;
  source: DatasetSource;
  url: string;
  accessionIds?: string[];
  license?: string;
  downloads?: number;
  likes?: number;
  updatedAt?: string;
  tags?: string[];
  rankScore?: number;
}

type SortBy = "rank" | "recent" | "popular" | "title";

interface DatasetMeta {
  trackResults?: Record<string, number>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sort?: {
    by: SortBy;
  };
}

type RelatedItem = { id: string; title: string; year?: number; source: string; url: string };

interface FiltersState {
  sources: string[];
  yearFrom: string;
  yearTo: string;
  modality: string;
  context: string;
}

interface SearchOptions {
  page?: number;
  sortBy?: SortBy;
  pageSize?: number;
}

interface BioPreset {
  id: string;
  label: string;
  query: string;
  yearFrom?: string;
  yearTo?: string;
  sortBy?: SortBy;
  sources?: DatasetSource[];
}

const SOURCE_OPTIONS: DatasetSource[] = [
  "huggingface",
  "kaggle",
  "ncbi",
  "ena",
  "europepmc",
  "datagov",
  "dataeu",
  "zenodo",
  "dryad",
  "dataverse",
  "figshare",
  "github",
  "openml",
  "crossref",
  "openalex",
  "cngb",
];

const BIO_CORE_SOURCES: DatasetSource[] = ["ncbi", "ena", "europepmc", "dryad", "zenodo", "dataverse", "openalex", "crossref", "cngb"];

const BIO_PRESETS: BioPreset[] = [
  {
    id: "single-cell",
    label: "Single-cell RNA-seq",
    query: "single-cell RNA-seq",
    yearFrom: "2018",
    sortBy: "recent",
    sources: BIO_CORE_SOURCES,
  },
  {
    id: "differential-expression",
    label: "Differential Expression",
    query: "bulk RNA-seq differential expression",
    yearFrom: "2015",
    sortBy: "recent",
    sources: BIO_CORE_SOURCES,
  },
  {
    id: "spatial-transcriptomics",
    label: "Spatial Transcriptomics",
    query: "spatial transcriptomics",
    yearFrom: "2019",
    sortBy: "recent",
    sources: BIO_CORE_SOURCES,
  },
  {
    id: "atac-seq",
    label: "ATAC-seq",
    query: "ATAC-seq chromatin accessibility",
    yearFrom: "2016",
    sortBy: "recent",
    sources: BIO_CORE_SOURCES,
  },
  {
    id: "chip-seq",
    label: "ChIP-seq",
    query: "ChIP-seq transcription factor",
    yearFrom: "2012",
    sortBy: "recent",
    sources: BIO_CORE_SOURCES,
  },
  {
    id: "alternative-splicing",
    label: "Alternative Splicing",
    query: "alternative splicing RNA-seq",
    yearFrom: "2014",
    sortBy: "recent",
    sources: BIO_CORE_SOURCES,
  },
];

const MODALITY_OPTIONS = [
  "single-cell RNA-seq",
  "bulk RNA-seq",
  "spatial transcriptomics",
  "ATAC-seq",
  "ChIP-seq",
  "proteomics",
  "metabolomics",
  "multi-omics",
  "epigenomics",
];

const SOURCE_LABELS: Record<DatasetSource, string> = {
  huggingface: "Hugging Face",
  kaggle: "Kaggle",
  ncbi: "NCBI E-utilities",
  ena: "ENA Portal",
  europepmc: "Europe PMC",
  datagov: "Data.gov",
  dataeu: "data.europa.eu",
  zenodo: "Zenodo",
  dryad: "Dryad",
  dataverse: "Dataverse",
  figshare: "Figshare",
  github: "GitHub",
  openml: "OpenML",
  crossref: "Crossref",
  openalex: "OpenAlex",
  cngb: "CNGBdb (China)",
};

export default function DatasetsPage() {
  const [query, setQuery] = useState("");
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("rank");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hoverDatasetId, setHoverDatasetId] = useState<string | null>(null);
  const [relatedByDataset, setRelatedByDataset] = useState<Record<string, RelatedItem[]>>({});
  const [filters, setFilters] = useState({
    sources: [...BIO_CORE_SOURCES] as string[],
    yearFrom: "",
    yearTo: "",
    modality: "single-cell RNA-seq",
    context: "",
  });
  const pagination = meta?.pagination;

  const executeSearch = async (queryText: string, activeFilters: FiltersState, options?: SearchOptions) => {
    const nextPage = options?.page ?? page;
    const nextSortBy = options?.sortBy ?? sortBy;
    const nextPageSize = options?.pageSize ?? pageSize;

    setLoading(true);
    setMeta(null);
    try {
      const parts = [queryText?.trim(), activeFilters.modality?.trim(), activeFilters.context?.trim()].filter(Boolean);
      const combinedQuery = parts.join(" ").trim();
      if (!combinedQuery) {
        setDatasets([]);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/datasets/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: combinedQuery,
          filters: {
            ...activeFilters,
            sortBy: nextSortBy,
            page: nextPage,
            pageSize: nextPageSize,
          },
        }),
      });
      const data = await response.json();
      setDatasets(data.datasets || []);
      setMeta(data.meta || null);
      const serverPage = data?.meta?.pagination?.page;
      if (typeof serverPage === "number") setPage(serverPage);
    } catch (error) {
      console.error("Dataset search failed:", error);
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  };

  const searchDatasets = async (options?: SearchOptions) => executeSearch(query, filters, options);

  const applyBioPreset = async (preset: BioPreset) => {
    const nextFilters: FiltersState = {
      sources: preset.sources ? [...preset.sources] : [...BIO_CORE_SOURCES],
      yearFrom: preset.yearFrom || "",
      yearTo: preset.yearTo || "",
      modality: preset.query,
      context: "",
    };
    const nextSort = preset.sortBy || "recent";

    setQuery("");
    setFilters(nextFilters);
    setSortBy(nextSort);
    setPage(1);

    await executeSearch(preset.query, nextFilters, { page: 1, sortBy: nextSort });
  };

  const loadRelatedForDataset = async (dataset: DatasetItem) => {
    if (relatedByDataset[dataset.id]) return;
    try {
      const res = await fetch('/api/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'dataset', title: dataset.title, accessionIds: dataset.accessionIds || [] }),
      });
      const data = await res.json();
      setRelatedByDataset((prev) => ({ ...prev, [dataset.id]: data.items || [] }));
    } catch {
      setRelatedByDataset((prev) => ({ ...prev, [dataset.id]: [] }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
            <Database className="w-10 h-10 text-indigo-600" />
            Dataset Search
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Search across global dataset registries and repositories
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchDatasets({ page: 1 })}
                placeholder="Enter topic, task, or domain..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => searchDatasets({ page: 1 })}
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Bio Presets</p>
            <div className="flex flex-wrap gap-2">
              {BIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyBioPreset(preset)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sources:</span>
              </div>
              {SOURCE_OPTIONS.map((source) => (
                <label key={source} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.sources.includes(source)}
                    onChange={(e) => {
                      const nextSources = e.target.checked
                        ? [...filters.sources, source]
                        : filters.sources.filter((s) => s !== source);
                      setFilters({ ...filters, sources: nextSources });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{SOURCE_LABELS[source]}</span>
                </label>
              ))}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Modality:</span>
                <select
                  value={filters.modality}
                  onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
                >
                  {MODALITY_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Context:</span>
                <input
                  type="text"
                  placeholder="optional tissue/disease (e.g. endometrium)"
                  value={filters.context}
                  onChange={(e) => setFilters({ ...filters, context: e.target.value })}
                  className="w-64 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</span>
                <input
                  type="number"
                  placeholder="From"
                  value={filters.yearFrom}
                  onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })}
                  className="w-20 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="To"
                  value={filters.yearTo}
                  onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })}
                  className="w-20 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const next = e.target.value as SortBy;
                    setSortBy(next);
                    setPage(1);
                    if (query.trim()) searchDatasets({ page: 1, sortBy: next });
                  }}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
                >
                  <option value="rank">Rank</option>
                  <option value="recent">Most recent</option>
                  <option value="popular">Most popular</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    setPageSize(next);
                    setPage(1);
                    if (query.trim()) searchDatasets({ page: 1, pageSize: next });
                  }}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>
          </div>

          {meta && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              {SOURCE_OPTIONS.map((source) => `${SOURCE_LABELS[source]}: ${meta.trackResults?.[source] || 0}`).join(" | ")} | Final:{" "}
              {meta.trackResults?.final || 0} | Sort: {meta.sort?.by || sortBy}
            </div>
          )}
        </div>

        {datasets.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {meta?.pagination?.total || datasets.length} datasets found
              </h2>
              {pagination && (
                <p className="text-sm text-gray-500">
                  Page {pagination.page} / {pagination.totalPages}
                </p>
              )}
            </div>
            {datasets.map((dataset) => (
              <div key={dataset.id} className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="absolute right-4 top-4">
                      <button
                        onMouseEnter={() => {
                          setHoverDatasetId(dataset.id);
                          void loadRelatedForDataset(dataset);
                        }}
                        onMouseLeave={() => setHoverDatasetId((id) => (id === dataset.id ? null : id))}
                        className="rounded-full border border-violet-300 px-2 py-1 text-[11px] text-violet-700"
                        title="연관 논문 미리보기"
                      >
                        <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Related</span>
                      </button>
                      {hoverDatasetId === dataset.id && (
                        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-xl dark:border-gray-700 dark:bg-gray-900">
                          <p className="mb-2 font-semibold text-gray-700 dark:text-gray-200">연관 논문</p>
                          {(relatedByDataset[dataset.id] || []).length === 0 ? (
                            <p className="text-gray-500">불러오는 중이거나 결과가 없습니다.</p>
                          ) : (
                            <ul className="space-y-2">
                              {(relatedByDataset[dataset.id] || []).slice(0, 5).map((r) => (
                                <li key={r.id}>
                                  <a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-blue-600 hover:underline dark:text-blue-300">
                                    {r.title}
                                  </a>
                                  <p className="text-[11px] text-gray-500">{r.source}{r.year ? ` · ${r.year}` : ''}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                        {dataset.source}
                      </span>
                      {dataset.updatedAt && (
                        <span className="text-sm text-gray-500">{dataset.updatedAt.slice(0, 10)}</span>
                      )}
                      {dataset.rankScore !== undefined && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Score: {dataset.rankScore}
                        </span>
                      )}
                      {dataset.downloads !== undefined && (
                        <span className="text-sm text-gray-500">Downloads: {dataset.downloads}</span>
                      )}
                      {dataset.likes !== undefined && (
                        <span className="text-sm text-gray-500">Likes: {dataset.likes}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{dataset.title}</h3>
                    {dataset.license && (
                      <p className="text-xs text-gray-500 mb-2">License: {dataset.license}</p>
                    )}
                    {dataset.accessionIds && dataset.accessionIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3" title="Dataset accession identifiers (e.g., GEO GSE, SRA SRP/SRR, PRJNA, CNP)">
                        {dataset.accessionIds.slice(0, 6).map((acc) => (
                          <span key={`${dataset.id}-${acc}`} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200">
                            {acc}
                          </span>
                        ))}
                      </div>
                    )}
                    {dataset.tags && dataset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {dataset.tags.slice(0, 8).map((tag) => (
                          <span key={`${dataset.id}-${tag}`} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-4">{dataset.description}</p>
                    <a
                      href={dataset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Open dataset <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    searchDatasets({ page: prev });
                  }}
                  disabled={loading || page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(pagination.totalPages, page + 1);
                    setPage(next);
                    searchDatasets({ page: next });
                  }}
                  disabled={loading || page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {datasets.length === 0 && !loading && query && (
          <div className="text-center py-12 text-gray-500">No datasets found. Try different keywords or adjust filters.</div>
        )}
      </div>
    </div>
  );
}
