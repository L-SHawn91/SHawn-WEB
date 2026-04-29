"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Database, ExternalLink, Filter, Search, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/data-source/client";

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

type RelatedItem = { id: string; title: string; year?: number; source: string; url: string; reason?: string; };

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

type SavedPresetState = {
  query: string;
  filters: FiltersState;
  sortBy: SortBy;
};

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
const QUICK_DATASET_QUERIES = [
  "endometrium single-cell atlas",
  "ovarian cancer organoid",
  "autophagy transcriptomics",
  "uterus microenvironment",
  "embryo implantation",
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

const SOURCE_TOOLTIPS: Record<DatasetSource, string> = {
  huggingface: "Hugging Face Datasets: ML/AI 중심 공개 데이터셋 허브",
  kaggle: "Kaggle: 커뮤니티 기반 데이터셋 + 경쟁 플랫폼",
  ncbi: "NCBI: GEO/SRA 등 생물학 데이터 인덱스",
  ena: "ENA: 유럽 시퀀싱 아카이브",
  europepmc: "Europe PMC: 문헌에서 accession 신호를 추출",
  datagov: "미국 공공 데이터 카탈로그",
  dataeu: "EU 공공 데이터 포털",
  zenodo: "Zenodo 리서치 아카이브",
  dryad: "Dryad 연구 데이터 저장소",
  dataverse: "Dataverse 학술 데이터 저장소",
  figshare: "Figshare 연구 산출물 저장소",
  github: "GitHub 공개 저장소 기반 데이터셋",
  openml: "OpenML 머신러닝 데이터셋",
  crossref: "Crossref DOI/서지 메타데이터",
  openalex: "OpenAlex 오픈 학술 그래프",
  cngb: "CNGBdb 중국 유전체/바이오 데이터베이스",
};

const DATASET_SCORE_TOOLTIP = "Dataset score는 최신성, 활용도(download/like), 메타데이터 품질로 계산됩니다.\nDataset는 저널 논문이 아니므로 IF/Q 지표가 직접 적용되지 않습니다.";

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
  const [relatedLoadingByDataset, setRelatedLoadingByDataset] = useState<Record<string, boolean>>({});
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [presetRestore, setPresetRestore] = useState<SavedPresetState | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
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
        setHasSearched(true);
        setLoading(false);
        return;
      }

      const response = await apiFetch("/api/datasets/search", {
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
      setHasSearched(true);
      const serverPage = data?.meta?.pagination?.page;
      if (typeof serverPage === "number") setPage(serverPage);
    } catch (error) {
      console.error("Dataset search failed:", error);
      setDatasets([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const searchDatasets = async (options?: SearchOptions) => executeSearch(query, filters, options);
  const runQuickQuery = async (presetQuery: string) => {
    setQuery(presetQuery);
    setPage(1);
    await executeSearch(presetQuery, filters, { page: 1 });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get("query");
    if (!q) return;
    setQuery(q);
  }, []);

  const applyBioPreset = async (preset: BioPreset) => {
    const isActive = activePresetId === preset.id;

    if (isActive) {
      if (presetRestore) {
        setActivePresetId(null);
        setQuery(presetRestore.query);
        setFilters(presetRestore.filters);
        setSortBy(presetRestore.sortBy);
        setPage(1);
        await executeSearch(presetRestore.query, presetRestore.filters, { page: 1, sortBy: presetRestore.sortBy });
        setPresetRestore(null);
        return;
      }

      setActivePresetId(null);
      setQuery("");
      setFilters({
        sources: [...BIO_CORE_SOURCES] as string[],
        yearFrom: "",
        yearTo: "",
        modality: "single-cell RNA-seq",
        context: "",
      });
      setSortBy("rank");
      setPage(1);
      return;
    }

    setPresetRestore({
      query,
      filters,
      sortBy,
    });

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
    setActivePresetId(preset.id);

    await executeSearch(preset.query, nextFilters, { page: 1, sortBy: nextSort });
  };

  const loadRelatedForDataset = async (dataset: DatasetItem) => {
    if (relatedByDataset[dataset.id] || relatedLoadingByDataset[dataset.id]) return;
    setRelatedLoadingByDataset((prev) => ({ ...prev, [dataset.id]: true }));
    try {
      const res = await apiFetch('/api/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'dataset', title: dataset.title, accessionIds: dataset.accessionIds || [] }),
      });
      const data = await res.json();
      setRelatedByDataset((prev) => ({ ...prev, [dataset.id]: data.items || [] }));
    } catch {
      setRelatedByDataset((prev) => ({ ...prev, [dataset.id]: [] }));
    } finally {
      setRelatedLoadingByDataset((prev) => ({ ...prev, [dataset.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
          <Link href="/" className="rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">Home</Link>
          <Link href="/papers" className="rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">Papers</Link>
          <Link href="/datasets" className="rounded-md bg-indigo-100 px-2 py-1 font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">Datasets</Link>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
            <Database className="w-10 h-10 text-indigo-600" />
            Dataset Search
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Search across global dataset registries and repositories
          </p>
        </div>
        <div className="sticky top-3 z-30 mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 p-4 shadow-sm dark:border-indigo-900/50 dark:from-gray-900 dark:via-indigo-950/30 dark:to-gray-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Dataset Search Control Center</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">키워드 입력 후 Enter 또는 Search</p>
          </div>
          <div className="flex gap-3 flex-col md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchDatasets({ page: 1 })}
                placeholder="예: endometrium single-cell atlas"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => searchDatasets({ page: 1 })}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-semibold transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          <p className="mt-3 rounded-xl border border-indigo-200 bg-white/70 px-3 py-2 text-xs leading-5 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100">
            정밀 검색 팁: <strong>조직명 + modality + accession 힌트</strong>를 함께 넣으세요. 예: <code>endometrial organoid single-cell RNA-seq GSE</code>. 넓은 질의는 여러 조직의 organoid dataset이 섞일 수 있습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_DATASET_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  void runQuickQuery(q);
                }}
                className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-200 dark:hover:bg-indigo-900/30"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <p className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200">
            검색 입력은 상단 고정 패널에서 진행하고, 이 섹션에서는 프리셋과 상세 필터를 조정합니다.
          </p>
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Bio Presets</p>
            <div className="flex flex-wrap gap-2">
              {BIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyBioPreset(preset)}
                  disabled={loading}
                  className={`px-3 py-1.5 text-xs rounded-full border ${
                    activePresetId === preset.id
                      ? "border-indigo-500 bg-indigo-200 text-indigo-900"
                      : "border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  } disabled:opacity-50`}
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
                  <span className="text-sm text-gray-700 dark:text-gray-300" title={SOURCE_TOOLTIPS[source]}>{SOURCE_LABELS[source]}</span>
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
                  placeholder="tissue/disease/accession hint (e.g. endometrium GSE)"
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
                          {relatedLoadingByDataset[dataset.id] ? (
                            <p className="text-gray-500">불러오는 중...</p>
                          ) : (relatedByDataset[dataset.id] || []).length === 0 ? (
                            <p className="text-gray-500">연관 논문이 없습니다.</p>
                          ) : (
                            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {(relatedByDataset[dataset.id] || []).map((r) => (
                                <li key={r.id}>
                                  <a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-blue-600 hover:underline dark:text-blue-300">
                                    {r.title}
                                  </a>
                                  <p className="text-[11px] text-gray-500">{r.source}{r.year ? ` · ${r.year}` : ""}{r.reason ? ` · ${r.reason}` : ""}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800" title={SOURCE_TOOLTIPS[dataset.source]}>
                        {dataset.source}
                      </span>
                      <span className="text-sm text-gray-500">{dataset.updatedAt ? dataset.updatedAt.slice(0, 10) : "No Date"}</span>
                      {dataset.rankScore !== undefined && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full" title={DATASET_SCORE_TOOLTIP}>
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
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={dataset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Open dataset <ExternalLink className="w-3 h-3" />
                      </a>
                      <Link
                        href={`/papers?query=${encodeURIComponent(dataset.title)}`}
                        className="inline-flex items-center gap-1 text-sm text-violet-700 hover:text-violet-800 dark:text-violet-300"
                        title="이 데이터셋과 연관된 논문 검색"
                      >
                        Related papers
                      </Link>
                    </div>
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

        {datasets.length === 0 && !loading && hasSearched && (
          <div className="text-center py-12 text-gray-500">No datasets found. Try different keywords or adjust filters.</div>
        )}
      </div>
    </div>
  );
}
