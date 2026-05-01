"use client";
// i18n-exempt: legacy client page uses fixed bilingual/search UI copy; full i18n migration is separate.

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Database, ExternalLink, Filter, Search, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/data-source/client";

type DatasetSource =
  | "ncbi"
  | "ena"
  | "europepmc"
  | "zenodo"
  | "dryad"
  | "dataverse"
  | "figshare"
  | "cngb"
  | "arrayexpress"
  | "cellxgene"
  | "huggingface"
  | "kaggle"
  | "datagov"
  | "dataeu"
  | "openml";

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
  context: string;
}

interface SearchOptions {
  page?: number;
  sortBy?: SortBy;
  pageSize?: number;
}

const SOURCE_OPTIONS: DatasetSource[] = [
  "ncbi",
  "ena",
  "europepmc",
  "zenodo",
  "dryad",
  "dataverse",
  "figshare",
  "cngb",
  "arrayexpress",
  "cellxgene",
  "huggingface",
  "kaggle",
  "datagov",
  "dataeu",
  "openml",
];




const SOURCE_LABELS: Record<DatasetSource, string> = {
  ncbi: "NCBI",
  ena: "ENA",
  europepmc: "Europe PMC",
  zenodo: "Zenodo",
  dryad: "Dryad",
  dataverse: "Dataverse",
  figshare: "Figshare",
  cngb: "CNGBdb",
  arrayexpress: "ArrayExpress",
  cellxgene: "CellxGene",
  huggingface: "HuggingFace",
  kaggle: "Kaggle",
  datagov: "Data.gov",
  dataeu: "Data.europa.eu",
  openml: "OpenML",
};

const SOURCE_TOOLTIPS: Record<DatasetSource, string> = {
  ncbi: "NCBI: GEO/SRA 등 생물학 데이터 인덱스",
  ena: "ENA: 유럽 시퀀싱 아카이브",
  europepmc: "Europe PMC: 문헌에서 accession 신호를 추출",
  zenodo: "Zenodo 리서치 아카이브",
  dryad: "Dryad 연구 데이터 저장소",
  dataverse: "Dataverse 학술 데이터 저장소",
  figshare: "Figshare 연구 산출물 저장소",
  cngb: "CNGBdb 중국 유전체/바이오 데이터베이스",
  arrayexpress: "ArrayExpress: EBI 전사체/기능유전체 실험 데이터",
  cellxgene: "CellxGene: Chan Zuckerberg 단일세포 아틀라스",
  huggingface: "HuggingFace: ML/AI 데이터셋 허브",
  kaggle: "Kaggle: 데이터사이언스 대회 및 공개 데이터셋",
  datagov: "Data.gov: 미국 정부 공개 데이터",
  dataeu: "Data.europa.eu: EU 공개 데이터 포털",
  openml: "OpenML: 머신러닝 벤치마크 데이터셋",
};

const DATASET_SCORE_TOOLTIP = "Dataset score는 최신성, 활용도(download/like), 메타데이터 품질로 계산됩니다.\nDataset는 저널 논문이 아니므로 IF/Q 지표가 직접 적용되지 않습니다.";

export default function DatasetsPage() {
  const [query, setQuery] = useState("");
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [bySource, setBySource] = useState<Record<string, DatasetItem[]>>({});
  const [activeSourceTab, setActiveSourceTab] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("rank");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [hoverDatasetId, setHoverDatasetId] = useState<string | null>(null);
  const [relatedByDataset, setRelatedByDataset] = useState<Record<string, RelatedItem[]>>({});
  const [relatedLoadingByDataset, setRelatedLoadingByDataset] = useState<Record<string, boolean>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    sources: [...SOURCE_OPTIONS] as string[],
    yearFrom: "",
    yearTo: "",
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
      const parts = [queryText?.trim(), activeFilters.context?.trim()].filter(Boolean);
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
      setBySource(data.bySource || {});
      setActiveSourceTab("all");
      setMeta(data.meta || null);
      setHasSearched(true);
      window.setTimeout(() => resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      const serverPage = data?.meta?.pagination?.page;
      if (typeof serverPage === "number") setPage(serverPage);
    } catch (error) {
      console.error("Dataset search failed:", error);
      setDatasets([]);
      setBySource({});
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const searchDatasets = async (options?: SearchOptions) => executeSearch(query, filters, options);

  const sourceOrder = useMemo(() => {
    const extras = Object.keys(bySource).filter((source) => !SOURCE_OPTIONS.includes(source as DatasetSource));
    return [...SOURCE_OPTIONS, ...extras];
  }, [bySource]);

  const allSourceDatasets = useMemo(() => {
    const map = new Map<string, DatasetItem>();
    for (const source of sourceOrder) {
      for (const item of bySource[source] || []) {
        if (!map.has(item.id)) map.set(item.id, item);
      }
    }
    return map.size ? Array.from(map.values()) : datasets;
  }, [bySource, datasets, sourceOrder]);

  const displayedDatasets = useMemo(() => {
    if (activeSourceTab !== "all") return bySource[activeSourceTab] || [];
    return allSourceDatasets;
  }, [activeSourceTab, allSourceDatasets, bySource]);

  const hasSourceView = Object.keys(bySource).some((source) => (bySource[source] || []).length > 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get("query");
    if (!q) return;
    setQuery(q);
  }, []);

  const loadRelatedForDataset = async (dataset: DatasetItem) => {
    if (relatedByDataset[dataset.id] || relatedLoadingByDataset[dataset.id]) return;
    setRelatedLoadingByDataset((prev) => ({ ...prev, [dataset.id]: true }));
    try {
      const res = await apiFetch('/api/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'dataset', title: dataset.title, accessionIds: dataset.accessionIds || [], excludeId: dataset.id, excludeTitle: dataset.title, excludeUrl: dataset.url }),
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
    <div className="min-h-screen bg-[#F7F3EA] dark:bg-slate-950 text-[#263238] dark:text-slate-200 paper-ruled py-12">
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10243A]/25 backdrop-blur-md" aria-live="polite" aria-busy="true">
          <div className="sketch-card border border-white/40 bg-white/90 px-8 py-7 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900/90">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#7B6BA8]/20 border-t-[#7B6BA8]" />
            <p className="text-lg font-bold text-[#10243A] dark:text-slate-100">검색중입니다</p>
            <p className="mt-1 text-sm text-[#263238]/60 dark:text-slate-400">여러 데이터셋 소스를 동시에 확인하는 중입니다.</p>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-1 rounded-2xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA]/90 dark:bg-slate-950/90 px-3 py-2 text-sm backdrop-blur">
          <Link href="/" className="rounded-lg px-3 py-1.5 text-[#263238]/60 dark:text-slate-400 transition hover:bg-[#2A9D8F]/10 dark:hover:bg-teal-900/30 hover:text-[#10243A] dark:text-slate-100">Home</Link>
          <Link href="/papers" className="rounded-lg px-3 py-1.5 text-[#263238]/60 dark:text-slate-400 transition hover:bg-[#2A9D8F]/10 dark:hover:bg-teal-900/30 hover:text-[#10243A] dark:text-slate-100">Papers</Link>
          <Link href="/datasets" className="rounded-lg bg-[#7B6BA8] px-3 py-1.5 font-semibold text-white">Datasets</Link>
        </nav>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#10243A] dark:text-slate-100 mb-4 flex items-center justify-center gap-3">
            <Database className="w-10 h-10 text-[#7B6BA8]" />
            Dataset Search
          </h1>
          <p className="text-xl text-[#263238]/70 dark:text-slate-400">
            Search across global dataset registries and repositories
          </p>
        </div>
        <div className="sticky top-3 z-30 mb-6 rounded-2xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA]/95 dark:bg-slate-950/95 p-4 shadow-md shadow-[#7B6BA8]/10 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#10243A] dark:text-slate-100">Dataset Search Control Center</p>
            <p className="text-xs text-[#263238]/50 dark:text-slate-500">키워드 입력 후 Enter 또는 Search</p>
          </div>
          <div className="flex gap-3 flex-col md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#263238]/40 dark:text-slate-600 w-5 h-5" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchDatasets({ page: 1 })}
                placeholder="예: endometrium single-cell atlas"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#263238] dark:text-slate-200 placeholder:text-[#263238]/40 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#7B6BA8] focus:border-[#7B6BA8] outline-none"
              />
            </div>
            <button
              onClick={() => searchDatasets({ page: 1 })}
              disabled={loading}
              className="sketch-btn px-6 py-3 bg-[#7B6BA8] hover:bg-[#6a5a97] disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          <p className="mt-3 rounded-xl border border-[#7B6BA8]/20 bg-[#7B6BA8]/5 dark:bg-purple-900/10 px-3 py-2 text-xs leading-5 text-[#263238]/70 dark:text-slate-400">
            정밀 검색 팁: <strong>조직명 + modality + accession 힌트</strong>를 함께 넣으세요. 예: <code>endometrial organoid single-cell RNA-seq GSE</code>. 넓은 질의는 여러 조직의 organoid dataset이 섞일 수 있습니다.
          </p>
        </div>

        <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-6 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#263238]/40 dark:text-slate-600" />
                <span className="text-sm font-medium text-[#263238]/70 dark:text-slate-400">Sources:</span>
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
                    className="w-4 h-4 accent-[#7B6BA8] rounded"
                  />
                  <span className="text-sm text-[#263238]/70 dark:text-slate-400" title={SOURCE_TOOLTIPS[source]}>{SOURCE_LABELS[source]}</span>
                </label>
              ))}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-[#263238]/70 dark:text-slate-400">Context:</span>
                <input
                  type="text"
                  placeholder="tissue/disease/accession hint (e.g. endometrium GSE)"
                  value={filters.context}
                  onChange={(e) => setFilters({ ...filters, context: e.target.value })}
                  className="w-64 px-2 py-1 rounded border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#263238] dark:text-slate-200 placeholder:text-[#263238]/40 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-[#263238]/70 dark:text-slate-400">Year:</span>
                <input
                  type="number"
                  placeholder="From"
                  value={filters.yearFrom}
                  onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })}
                  className="w-20 px-2 py-1 rounded border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#263238] dark:text-slate-200"
                />
                <span className="text-[#263238]/40 dark:text-slate-600">-</span>
                <input
                  type="number"
                  placeholder="To"
                  value={filters.yearTo}
                  onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })}
                  className="w-20 px-2 py-1 rounded border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#263238] dark:text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-[#263238]/70 dark:text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const next = e.target.value as SortBy;
                    setSortBy(next);
                    setPage(1);
                    if (query.trim()) searchDatasets({ page: 1, sortBy: next });
                  }}
                  className="px-2 py-1 rounded border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#263238] dark:text-slate-200"
                >
                  <option value="rank">Rank</option>
                  <option value="recent">Most recent</option>
                  <option value="popular">Most popular</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#263238]/70 dark:text-slate-400">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    setPageSize(next);
                    setPage(1);
                    if (query.trim()) searchDatasets({ page: 1, pageSize: next });
                  }}
                  className="px-2 py-1 rounded border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#263238] dark:text-slate-200"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {meta && (
            <div className="mt-4 text-xs text-[#263238]/40 dark:text-slate-600">
              {SOURCE_OPTIONS.map((source) => `${SOURCE_LABELS[source]}: ${meta.trackResults?.[source] || 0}`).join(" | ")} | Final:{" "}
              {meta.trackResults?.final || 0} | Sort: {meta.sort?.by || sortBy}
            </div>
          )}
        </div>

        <div ref={resultsTopRef} className="scroll-mt-28" />
        {displayedDatasets.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#10243A] dark:text-slate-100">
                {displayedDatasets.length} datasets found
              </h2>
              {pagination && !hasSourceView && (
                <p className="text-sm text-[#263238]/50 dark:text-slate-500">
                  Page {pagination.page} / {pagination.totalPages}
                </p>
              )}
            </div>
            {hasSourceView && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSourceTab("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeSourceTab === "all" ? "bg-[#10243A] text-white shadow" : "border border-[#D8DEE6] dark:border-slate-700 text-[#263238]/60 dark:text-slate-400 hover:border-[#7B6BA8] hover:text-[#7B6BA8]"}`}
                >
                  All ({allSourceDatasets.length})
                </button>
                {sourceOrder.map((source) => {
                  const count = (bySource[source] || []).length;
                  if (!count) return null;
                  const label = SOURCE_LABELS[source as DatasetSource] || source;
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setActiveSourceTab(source)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeSourceTab === source ? "bg-[#7B6BA8] text-white shadow" : "border border-[#D8DEE6] dark:border-slate-700 text-[#263238]/60 dark:text-slate-400 hover:border-[#7B6BA8] hover:text-[#7B6BA8]"}`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
            )}
            {displayedDatasets.map((dataset) => (
              <div key={dataset.id} className="sketch-card relative bg-white dark:bg-slate-900 border border-[#D8DEE6] dark:border-slate-700 hover:border-[#7B6BA8]/40 transition-all p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="absolute right-4 top-4">
                      <button
                        onMouseEnter={() => {
                          setHoverDatasetId(dataset.id);
                          void loadRelatedForDataset(dataset);
                        }}
                        onMouseLeave={() => setHoverDatasetId((id) => (id === dataset.id ? null : id))}
                        className="rounded-full border border-[#7B6BA8]/40 px-2 py-1 text-[11px] text-[#7B6BA8] transition hover:border-[#7B6BA8]"
                        title="연관 논문 미리보기"
                      >
                        <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Related</span>
                      </button>
                      {hoverDatasetId === dataset.id && (
                        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs shadow-xl">
                          <p className="mb-2 font-semibold text-[#10243A] dark:text-slate-100">연관 논문</p>
                          {relatedLoadingByDataset[dataset.id] ? (
                            <p className="text-[#263238]/40 dark:text-slate-600">불러오는 중...</p>
                          ) : (relatedByDataset[dataset.id] || []).length === 0 ? (
                            <p className="text-[#263238]/40 dark:text-slate-600">연관 논문이 없습니다.</p>
                          ) : (
                            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {(relatedByDataset[dataset.id] || []).map((r) => (
                                <li key={r.id}>
                                  <a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[#2A9D8F] hover:underline">
                                    {r.title}
                                  </a>
                                  <p className="text-[11px] text-[#263238]/40 dark:text-slate-600">{r.source}{r.year ? ` · ${r.year}` : ""}{r.reason ? ` · ${r.reason}` : ""}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#7B6BA8]/15 dark:bg-purple-900/20 text-[#7B6BA8]" title={SOURCE_TOOLTIPS[dataset.source]}>
                        {dataset.source}
                      </span>
                      <span className="text-sm text-[#263238]/50 dark:text-slate-500">{dataset.updatedAt ? dataset.updatedAt.slice(0, 10) : "No Date"}</span>
                      {dataset.rankScore !== undefined && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full" title={DATASET_SCORE_TOOLTIP}>
                          Score: {dataset.rankScore}
                        </span>
                      )}
                      {dataset.downloads !== undefined && (
                        <span className="text-sm text-[#263238]/50 dark:text-slate-500">Downloads: {dataset.downloads}</span>
                      )}
                      {dataset.likes !== undefined && (
                        <span className="text-sm text-[#263238]/50 dark:text-slate-500">Likes: {dataset.likes}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-[#10243A] dark:text-slate-100 mb-2">{dataset.title}</h3>
                    {dataset.license && (
                      <p className="text-xs text-[#263238]/50 dark:text-slate-500 mb-2">License: {dataset.license}</p>
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
                          <span key={`${dataset.id}-${tag}`} className="text-xs bg-[#7B6BA8]/10 dark:bg-purple-900/20 text-[#7B6BA8] px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[#263238]/70 dark:text-slate-400 text-sm line-clamp-3 mb-4">{dataset.description}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={dataset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#2A9D8F] hover:text-[#238a7e] transition"
                      >
                        Open dataset <ExternalLink className="w-3 h-3" />
                      </a>
                      <Link
                        href={`/papers?query=${encodeURIComponent(dataset.title)}`}
                        className="inline-flex items-center gap-1 text-sm text-[#7B6BA8] hover:text-[#6a5a97] transition"
                        title="이 데이터셋과 연관된 논문 검색"
                      >
                        Related papers
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!hasSourceView && pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    searchDatasets({ page: prev });
                  }}
                  disabled={loading || page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[#D8DEE6] dark:border-slate-700 text-sm text-[#263238] dark:text-slate-200 disabled:opacity-50 hover:border-[#7B6BA8]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-[#263238]/60 dark:text-slate-400">
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
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[#D8DEE6] dark:border-slate-700 text-sm text-[#263238] dark:text-slate-200 disabled:opacity-50 hover:border-[#7B6BA8]"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {displayedDatasets.length === 0 && !loading && hasSearched && (
          <div className="text-center py-12 text-[#263238]/50 dark:text-slate-500">No datasets found. Try different keywords or adjust filters.</div>
        )}
      </div>
    </div>
  );
}
