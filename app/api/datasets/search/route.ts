import { NextRequest, NextResponse } from "next/server";

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
  | "openml";

type SortBy = "rank" | "recent" | "popular" | "title";

interface DatasetItem {
  id: string;
  title: string;
  description: string;
  source: DatasetSource;
  url: string;
  license?: string;
  downloads?: number;
  likes?: number;
  updatedAt?: string;
  tags?: string[];
  rankScore?: number;
}

interface FiltersInput {
  sources?: string[];
  yearFrom?: string;
  yearTo?: string;
  sortBy?: string;
  page?: number | string;
  pageSize?: number | string;
}

const ALL_SOURCES: DatasetSource[] = [
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
];

function isDatasetSource(source: string): source is DatasetSource {
  return ALL_SOURCES.includes(source as DatasetSource);
}

function cleanText(input?: string): string {
  if (!input) return "No description available";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function yearFromDateString(value?: string): number | null {
  if (!value) return null;
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function inYearRange(value: string | undefined, yearFrom?: string, yearTo?: string): boolean {
  const y = yearFromDateString(value);
  if (y === null) return true;
  const from = yearFrom ? Number.parseInt(yearFrom, 10) : null;
  const to = yearTo ? Number.parseInt(yearTo, 10) : null;
  if (from !== null && y < from) return false;
  if (to !== null && y > to) return false;
  return true;
}

function normalizeQueryForGithub(query: string): string {
  return query.trim().replace(/\s+/g, "+");
}

function extractAccessions(text: string): string[] {
  const regex = /\b(GSE\d+|GSM\d+|SRP\d+|SRS\d+|SRX\d+|SRR\d+|PRJNA\d+|PRJEB\d+|E-MTAB-\d+)\b/gi;
  const matches = text.match(regex) || [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}

async function searchHuggingFace(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const url = `https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=20`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((row: any) => inYearRange(row.lastModified, yearFrom, yearTo))
      .map((row: any) => ({
        id: `hf-${row.id || row._id || Math.random().toString(36).slice(2)}`,
        title: row.id || "Untitled dataset",
        description: cleanText(row.description),
        source: "huggingface" as const,
        url: `https://huggingface.co/datasets/${row.id}`,
        downloads: typeof row.downloads === "number" ? row.downloads : undefined,
        likes: typeof row.likes === "number" ? row.likes : undefined,
        updatedAt: row.lastModified,
        tags: Array.isArray(row.tags) ? row.tags.filter((t: unknown): t is string => typeof t === "string") : [],
      }));
  } catch (error) {
    console.error("[datasets] Hugging Face search failed:", error);
    return [];
  }
}

async function searchKaggle(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ search: query, page: "1" });
    const res = await fetch(`https://www.kaggle.com/api/v1/datasets/list?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((row: any) => inYearRange(row.lastUpdated, yearFrom, yearTo))
      .slice(0, 20)
      .map((row: any) => ({
        id: `kaggle-${row.ref || row.id || Math.random().toString(36).slice(2)}`,
        title: row.title || row.titleNullable || row.ref || "Untitled dataset",
        description: cleanText(row.subtitle || row.description || row.subtitleNullable),
        source: "kaggle" as const,
        url: row.url || row.urlNullable || (row.ref ? `https://www.kaggle.com/datasets/${row.ref}` : "https://www.kaggle.com/datasets"),
        license: row.licenseName || row.licenseNameNullable || undefined,
        downloads: typeof row.downloadCount === "number" ? row.downloadCount : undefined,
        likes: typeof row.voteCount === "number" ? row.voteCount : undefined,
        updatedAt: row.lastUpdated,
        tags: Array.isArray(row.tags)
          ? row.tags
              .map((tag: any) => tag?.name || tag?.fullPath || tag?.description)
              .filter((tag: unknown): tag is string => typeof tag === "string")
          : [],
      }));
  } catch (error) {
    console.error("[datasets] Kaggle search failed:", error);
    return [];
  }
}

async function searchNcbiEutils(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const searchParams = new URLSearchParams({
      db: "gds",
      term: query,
      retmax: "20",
      retmode: "json",
      sort: "relevance",
    });
    if (yearFrom || yearTo) {
      searchParams.set("mindate", `${yearFrom || "1900"}/01/01`);
      searchParams.set("maxdate", `${yearTo || "2100"}/12/31`);
      searchParams.set("datetype", "pdat");
    }
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams.toString()}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryParams = new URLSearchParams({
      db: "gds",
      id: ids.join(","),
      retmode: "json",
    });
    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams.toString()}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const summaryData = await summaryRes.json();

    return ids
      .map<DatasetItem | null>((id) => {
        const row = summaryData?.result?.[id];
        if (!row) return null;
        const accession = row.accession || row.gse || row.gpl || id;
        return {
          id: `ncbi-${accession}`,
          title: row.title || `NCBI dataset ${accession}`,
          description: cleanText(row.summary || row.description),
          source: "ncbi" as const,
          url: `https://www.ncbi.nlm.nih.gov/gds/?term=${encodeURIComponent(accession)}`,
          updatedAt: row.pdat || row.updatedate,
          tags: Array.isArray(row.taxon) ? row.taxon : undefined,
        };
      })
      .filter((item): item is DatasetItem => item !== null && inYearRange(item.updatedAt, yearFrom, yearTo));
  } catch (error) {
    console.error("[datasets] NCBI E-utilities search failed:", error);
    return [];
  }
}

async function searchEnaPortal(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const enaQuery = `(study_title="${query}" OR study_description="${query}" OR sample_alias="${query}" OR center_name="${query}")`;
    const params = new URLSearchParams({
      result: "study",
      query: enaQuery,
      fields: "study_accession,study_title,study_description,last_updated,center_name",
      format: "json",
      limit: "20",
    });
    const res = await fetch(`https://www.ebi.ac.uk/ena/portal/api/search?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((row: any) => ({
        id: `ena-${row.study_accession || Math.random().toString(36).slice(2)}`,
        title: row.study_title || row.study_accession || "ENA study",
        description: cleanText(row.study_description),
        source: "ena" as const,
        url: row.study_accession
          ? `https://www.ebi.ac.uk/ena/browser/view/${row.study_accession}`
          : "https://www.ebi.ac.uk/ena/browser/home",
        updatedAt: row.last_updated,
        tags: row.center_name ? [row.center_name] : undefined,
      }))
      .filter((item) => inYearRange(item.updatedAt, yearFrom, yearTo));
  } catch (error) {
    console.error("[datasets] ENA search failed:", error);
    return [];
  }
}

async function searchEuropePmcAccessions(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({
      query,
      format: "json",
      pageSize: "25",
      resultType: "core",
    });
    const res = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?.resultList?.result;
    if (!Array.isArray(rows)) return [];

    const found: DatasetItem[] = [];
    rows.forEach((row: any) => {
      const blob = `${row.title || ""} ${row.abstractText || ""}`;
      const accessions = extractAccessions(blob);
      if (accessions.length === 0) return;
      const updatedAt = row.firstPublicationDate || (row.pubYear ? `${row.pubYear}-01-01` : undefined);
      if (!inYearRange(updatedAt, yearFrom, yearTo)) return;
      accessions.forEach((acc) => {
        found.push({
          id: `eupmc-${acc}-${row.id || Math.random().toString(36).slice(2)}`,
          title: `${acc} (from Europe PMC)`,
          description: cleanText(row.title || row.abstractText),
          source: "europepmc",
          url: `https://europepmc.org/article/${row.source || "MED"}/${row.id}`,
          updatedAt,
          tags: ["accession-mined", "literature-derived"],
        });
      });
    });

    return found;
  } catch (error) {
    console.error("[datasets] Europe PMC search failed:", error);
    return [];
  }
}

async function searchDataGov(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ q: query, rows: "20" });
    const res = await fetch(`https://catalog.data.gov/api/3/action/package_search?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?.result?.results;
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row: any) => inYearRange(row.metadata_modified, yearFrom, yearTo))
      .map((row: any) => {
        const tags = Array.isArray(row.tags)
          ? row.tags
              .map((t: any) => t?.display_name || t?.name)
              .filter((t: unknown): t is string => typeof t === "string")
          : [];
        const primaryUrl =
          row.url ||
          row.resources?.find((r: any) => typeof r?.url === "string")?.url ||
          `https://catalog.data.gov/dataset/${row.name || row.id}`;

        return {
          id: `datagov-${row.id || Math.random().toString(36).slice(2)}`,
          title: row.title || row.name || "Untitled dataset",
          description: cleanText(row.notes),
          source: "datagov" as const,
          url: primaryUrl,
          license: row.license_title || undefined,
          updatedAt: row.metadata_modified,
          tags,
        };
      });
  } catch (error) {
    console.error("[datasets] Data.gov search failed:", error);
    return [];
  }
}

async function searchDataEu(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: "20" });
    const res = await fetch(`https://data.europa.eu/api/hub/search/search?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?.result?.results;
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row: any) => inYearRange(row.modified || row.issued, yearFrom, yearTo))
      .map((row: any) => {
        const tags = Array.isArray(row.keywords)
          ? row.keywords
              .map((k: any) => k?.label)
              .filter((k: unknown): k is string => typeof k === "string")
          : [];
        const id = Array.isArray(row.identifier) ? row.identifier[0] : row.identifier;
        const url = row.resource || (id ? `https://data.europa.eu/data/datasets/${id}` : undefined);

        return {
          id: `dataeu-${id || Math.random().toString(36).slice(2)}`,
          title: row.title || id || "Untitled dataset",
          description: cleanText(row.description),
          source: "dataeu" as const,
          url: url || "https://data.europa.eu/data/datasets",
          updatedAt: row.modified || row.issued,
          tags,
        };
      });
  } catch (error) {
    console.error("[datasets] data.europa.eu search failed:", error);
    return [];
  }
}

async function searchZenodo(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ q: query, size: "20", sort: "mostrecent" });
    const res = await fetch(`https://zenodo.org/api/records?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?.hits?.hits;
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row: any) => inYearRange(row.modified || row.created, yearFrom, yearTo))
      .map((row: any) => {
        const metadata = row.metadata || {};
        const tags = Array.isArray(metadata.keywords)
          ? metadata.keywords.filter((t: unknown): t is string => typeof t === "string")
          : [];

        return {
          id: `zenodo-${row.id || Math.random().toString(36).slice(2)}`,
          title: metadata.title || "Untitled dataset",
          description: cleanText(metadata.description),
          source: "zenodo" as const,
          url: row.doi_url || row.links?.self_html || `https://zenodo.org/records/${row.id}`,
          license: metadata.license?.id || metadata.license || undefined,
          downloads: typeof row.stats?.downloads === "number" ? row.stats.downloads : undefined,
          updatedAt: row.modified || row.created,
          tags,
        };
      });
  } catch (error) {
    console.error("[datasets] Zenodo search failed:", error);
    return [];
  }
}

async function searchDryad(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ query, "page[size]": "20" });
    const res = await fetch(`https://datadryad.org/api/v2/search?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?._embedded?.["stash:datasets"];
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row: any) => inYearRange(row.lastModificationDate, yearFrom, yearTo))
      .map((row: any) => ({
        id: `dryad-${row.id || row.identifier || Math.random().toString(36).slice(2)}`,
        title: row.title || "Untitled dataset",
        description: cleanText(row.abstract),
        source: "dryad" as const,
        url: row?._links?.stash?.href || row?.identifier || "https://datadryad.org/stash",
        license: row.license || undefined,
        updatedAt: row.lastModificationDate,
        tags: Array.isArray(row.subjects) ? row.subjects : [],
      }));
  } catch (error) {
    console.error("[datasets] Dryad search failed:", error);
    return [];
  }
}

async function searchDataverse(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ q: query, type: "dataset", per_page: "20" });
    const res = await fetch(`https://dataverse.harvard.edu/api/search?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?.data?.items;
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row: any) => inYearRange(row.published_at, yearFrom, yearTo))
      .map((row: any) => ({
        id: `dataverse-${row.global_id || row.name || Math.random().toString(36).slice(2)}`,
        title: row.name || "Untitled dataset",
        description: cleanText(row.description),
        source: "dataverse" as const,
        url: row.url || (row.global_id ? `https://doi.org/${row.global_id.replace(/^doi:/i, "")}` : "https://dataverse.harvard.edu"),
        updatedAt: row.published_at,
      }));
  } catch (error) {
    console.error("[datasets] Dataverse search failed:", error);
    return [];
  }
}

async function searchFigshare(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const res = await fetch("https://api.figshare.com/v2/articles/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search_for: query, page_size: 20 }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((row: any) => inYearRange(row.published_date, yearFrom, yearTo))
      .map((row: any) => ({
        id: `figshare-${row.id || Math.random().toString(36).slice(2)}`,
        title: row.title || "Untitled dataset",
        description: cleanText(row.description),
        source: "figshare" as const,
        url: row.url || `https://figshare.com/articles/dataset/${row.id}`,
        likes: typeof row.thumb === "string" ? 1 : undefined,
        updatedAt: row.published_date,
      }));
  } catch (error) {
    console.error("[datasets] Figshare search failed:", error);
    return [];
  }
}

async function searchGithubDatasets(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const q = `${normalizeQueryForGithub(query)}+topic:dataset`;
    const res = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?.items;
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row: any) => inYearRange(row.updated_at, yearFrom, yearTo))
      .map((row: any) => ({
        id: `github-${row.full_name || row.id || Math.random().toString(36).slice(2)}`,
        title: row.full_name || row.name || "Untitled repository",
        description: cleanText(row.description),
        source: "github" as const,
        url: row.html_url || "https://github.com/topics/dataset",
        license: row.license?.spdx_id || undefined,
        likes: typeof row.stargazers_count === "number" ? row.stargazers_count : undefined,
        updatedAt: row.updated_at,
        tags: Array.isArray(row.topics) ? row.topics : [],
      }));
  } catch (error) {
    console.error("[datasets] GitHub dataset search failed:", error);
    return [];
  }
}

async function searchOpenMl(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const res = await fetch("https://api.openml.org/api/v1/json/data/list/limit/200", {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const rows = data?.data?.dataset;
    if (!Array.isArray(rows)) return [];

    const q = query.toLowerCase();
    return rows
      .filter((row: any) => {
        const text = `${row.name || ""} ${row.did || ""}`.toLowerCase();
        return text.includes(q) && inYearRange(row.upload_date, yearFrom, yearTo);
      })
      .slice(0, 20)
      .map((row: any) => ({
        id: `openml-${row.did || Math.random().toString(36).slice(2)}`,
        title: row.name || `OpenML dataset ${row.did}`,
        description: cleanText(`OpenML data id ${row.did}, format ${row.format || "unknown"}`),
        source: "openml" as const,
        url: `https://www.openml.org/search?type=data&id=${row.did}`,
        updatedAt: row.upload_date,
      }));
  } catch (error) {
    console.error("[datasets] OpenML search failed:", error);
    return [];
  }
}

function integrateAndRank(items: DatasetItem[]): DatasetItem[] {
  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const currentYear = new Date().getFullYear();
  return deduped.map((item) => {
    let score = 0;
    const year = yearFromDateString(item.updatedAt);
    if (year !== null) {
      const age = currentYear - year;
      score += Math.max(0, 30 - age * 3);
    }
    if (item.downloads) {
      score += Math.min(30, Math.log10(item.downloads + 1) * 10);
    }
    if (item.likes) {
      score += Math.min(25, Math.log10(item.likes + 1) * 10);
    }
    if (item.license) score += 5;
    if (item.tags?.length) score += Math.min(10, item.tags.length);
    if (item.description && item.description.length > 80) score += 10;
    return { ...item, rankScore: Math.round(score) };
  });
}

function popularityScore(item: DatasetItem): number {
  const downloads = item.downloads || 0;
  const likes = item.likes || 0;
  return downloads + likes * 20;
}

function sortDatasets(items: DatasetItem[], sortBy: SortBy): DatasetItem[] {
  const sorted = [...items];
  if (sortBy === "recent") {
    return sorted.sort((a, b) => {
      const ay = yearFromDateString(a.updatedAt) || 0;
      const by = yearFromDateString(b.updatedAt) || 0;
      return by - ay;
    });
  }
  if (sortBy === "popular") {
    return sorted.sort((a, b) => popularityScore(b) - popularityScore(a));
  }
  if (sortBy === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
}

function parseFilters(input: FiltersInput | undefined) {
  const sources = Array.isArray(input?.sources)
    ? input.sources.filter((source): source is DatasetSource => isDatasetSource(source))
    : ALL_SOURCES;
  const yearFrom = input?.yearFrom;
  const yearTo = input?.yearTo;
  const sortBy: SortBy = ["rank", "recent", "popular", "title"].includes(input?.sortBy || "")
    ? (input?.sortBy as SortBy)
    : "rank";
  const page = Math.max(1, Number.parseInt(String(input?.page || "1"), 10) || 1);
  const pageSizeRaw = Number.parseInt(String(input?.pageSize || "10"), 10) || 10;
  const pageSize = Math.min(50, Math.max(1, pageSizeRaw));
  return { sources: sources.length > 0 ? sources : ALL_SOURCES, yearFrom, yearTo, sortBy, page, pageSize };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const query = payload?.query;
    if (!query || !String(query).trim()) {
      return NextResponse.json({ error: "Query is required", datasets: [] }, { status: 400 });
    }

    // Backward compatibility: allow either { query, filters } or top-level filter fields.
    const filterInput: FiltersInput = payload?.filters && typeof payload.filters === "object"
      ? payload.filters
      : {
          sources: payload?.sources,
          yearFrom: payload?.yearFrom,
          yearTo: payload?.yearTo,
          sortBy: payload?.sortBy,
          page: payload?.page,
          pageSize: payload?.pageSize,
        };

    const { sources, yearFrom, yearTo, sortBy, page, pageSize } = parseFilters(filterInput);

    const sourceJobs: Record<DatasetSource, (q: string, yf?: string, yt?: string) => Promise<DatasetItem[]>> = {
      huggingface: searchHuggingFace,
      kaggle: searchKaggle,
      ncbi: searchNcbiEutils,
      ena: searchEnaPortal,
      europepmc: searchEuropePmcAccessions,
      datagov: searchDataGov,
      dataeu: searchDataEu,
      zenodo: searchZenodo,
      dryad: searchDryad,
      dataverse: searchDataverse,
      figshare: searchFigshare,
      github: searchGithubDatasets,
      openml: searchOpenMl,
    };

    const jobs = sources.map((source) => ({ source, promise: sourceJobs[source](query, yearFrom, yearTo) }));
    const settled = await Promise.allSettled(jobs.map((job) => job.promise));

    const bySource: Record<DatasetSource, DatasetItem[]> = {
      huggingface: [],
      kaggle: [],
      ncbi: [],
      ena: [],
      europepmc: [],
      datagov: [],
      dataeu: [],
      zenodo: [],
      dryad: [],
      dataverse: [],
      figshare: [],
      github: [],
      openml: [],
    };

    settled.forEach((result, index) => {
      const source = jobs[index]?.source;
      if (!source) return;
      bySource[source] = result.status === "fulfilled" ? result.value : [];
    });

    const merged = ALL_SOURCES.flatMap((source) => bySource[source]);
    const ranked = integrateAndRank(merged);
    const sorted = sortDatasets(ranked, sortBy);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paged = sorted.slice(start, start + pageSize);

    const trackResults = ALL_SOURCES.reduce<Record<string, number>>((acc, source) => {
      acc[source] = bySource[source].length;
      return acc;
    }, {});
    trackResults.final = total;

    return NextResponse.json({
      datasets: paged,
      meta: {
        trackResults,
        pagination: { page: safePage, pageSize, total, totalPages },
        sort: { by: sortBy },
      },
    });
  } catch (error) {
    console.error("[datasets] Search failed:", error);
    return NextResponse.json({ error: "Search failed", datasets: [] }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
