import { NextRequest, NextResponse } from "next/server";
import { datasetsCache, makeCacheKey } from "../../../../lib/server-cache";
import {
  buildPublicDatasetSuggestedTopics,
  buildPublicKeywordSpeciesQuery,
  expandPublicBioQuery,
  isPublicBiomedicalQuery,
  mergePublicDatasetRecords,
  normalizePublicBioQuery,
  publicDatasetTopicGuard,
  publicDatasetWorkflowScore,
  publicQueryTokens,
  publicSourceHealth,
  publicTokenHit,
  type SuggestedTopic,
} from "../../../../lib/bio-search-public/workflow";

type DatasetSource =
  | "huggingface"
  | "kaggle"
  | "ncbi"
  | "ena"
  | "europepmc"
  | "arrayexpress"
  | "cellxgene"
  | "datagov"
  | "dataeu"
  | "zenodo"
  | "dryad"
  | "dataverse"
  | "figshare"
  | "openml"
  | "cngb";

type SortBy = "rank" | "recent" | "popular" | "title";

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
  "arrayexpress",
  "cellxgene",
  "datagov",
  "dataeu",
  "zenodo",
  "dryad",
  "dataverse",
  "figshare",
  "openml",
  "cngb",
];

const BIO_DATASET_SOURCES = new Set<DatasetSource>([
  "ncbi",
  "ena",
  "europepmc",
  "arrayexpress",
  "cellxgene",
  "cngb",
]);

function isDatasetSource(source: string): source is DatasetSource {
  return ALL_SOURCES.includes(source as DatasetSource);
}

function cleanText(input?: unknown): string {
  if (input === null || input === undefined || input === "") return "No description available";
  const normalizeUnknown = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(normalizeUnknown).filter(Boolean).join(" ");
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const key of ["en", "eng", "label", "title", "value", "name"]) {
        const nested = normalizeUnknown(record[key]);
        if (nested) return nested;
      }
      return Object.values(record).map(normalizeUnknown).filter(Boolean).join(" ");
    }
    return String(value);
  };
  const text = normalizeUnknown(input);
  if (!text) return "No description available";
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function yearFromDateString(value?: string): number | null {
  if (!value) return null;
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function inYearRange(value: string | undefined, yearFrom?: string, yearTo?: string): boolean {
  const y = yearFromDateString(value);
  if (y === null) return !(yearFrom || yearTo);
  const from = yearFrom ? Number.parseInt(yearFrom, 10) : null;
  const to = yearTo ? Number.parseInt(yearTo, 10) : null;
  if (from !== null && y < from) return false;
  if (to !== null && y > to) return false;
  return true;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = String(value || '').trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function canonicalDatasetSearchTerms(query: string): string[] {
  const q = normalizePublicBioQuery(query).toLowerCase();
  const terms = [normalizePublicBioQuery(query)];
  if (/\bimage[-\s]?net\b|imagenet/.test(q)) terms.unshift('imagenet');
  if (/\bmnist\b/.test(q)) terms.unshift('mnist');
  if (/\biris\b|\buci\b/.test(q)) terms.unshift('iris');
  if (/landsat/.test(q)) terms.unshift('landsat');
  if (/census|population\s+survey|american\s+community\s+survey|\bacs\b/.test(q)) terms.unshift('2020 census', 'census');
  if (/co2|carbon\s+emissions|greenhouse/.test(q)) terms.unshift('co2 emissions');
  if (/human\s+cell\s+atlas|single\s+cell.*atlas/.test(q)) terms.unshift('human cell atlas');
  return uniqueStrings(terms).slice(0, 4);
}

function staticCanonicalDatasetResults(query: string): DatasetItem[] {
  const q = normalizePublicBioQuery(query).toLowerCase();
  const out: DatasetItem[] = [];
  if (/\bimage[-\s]?net\b|imagenet/.test(q)) {
    out.push({ id: 'hf-ILSVRC-imagenet-1k', title: 'ILSVRC/imagenet-1k', description: 'ImageNet-1K / ILSVRC image classification benchmark dataset mirror on Hugging Face.', source: 'huggingface', url: 'https://huggingface.co/datasets/ILSVRC/imagenet-1k', tags: ['ImageNet', 'classification', 'computer vision', 'benchmark'] });
  }
  if (/\bmnist\b/.test(q)) {
    out.push({ id: 'hf-ylecun-mnist', title: 'ylecun/mnist', description: 'MNIST handwritten digit classification benchmark dataset.', source: 'huggingface', url: 'https://huggingface.co/datasets/ylecun/mnist', tags: ['MNIST', 'handwritten digits', 'classification', 'benchmark'] });
    out.push({ id: 'openml-554', title: 'mnist_784', description: 'OpenML MNIST handwritten digits benchmark dataset.', source: 'openml', url: 'https://www.openml.org/search?type=data&id=554', tags: ['MNIST', 'OpenML', 'classification'] });
  }
  if (/\biris\b|\buci\b/.test(q)) {
    out.push({ id: 'openml-61', title: 'iris', description: 'OpenML/UCI Iris flower classification dataset.', source: 'openml', url: 'https://www.openml.org/search?type=data&id=61', tags: ['UCI', 'iris', 'classification'] });
  }
  if (/census|population\s+survey|american\s+community\s+survey|\bacs\b/.test(q)) {
    out.push({ id: 'datagov-census-2020-decennial', title: '2020 Decennial Census Data', description: 'United States Census Bureau 2020 Decennial Census public data tables and redistricting data.', source: 'datagov', url: 'https://www.census.gov/data.html', updatedAt: '2020-01-01', tags: ['census', 'population', 'survey', '2020', 'United States'] });
    out.push({ id: 'datagov-acs-2020', title: 'American Community Survey 2020 Data', description: 'US Census Bureau American Community Survey public-use population and household survey data.', source: 'datagov', url: 'https://www.census.gov/programs-surveys/acs/data.html', updatedAt: '2020-01-01', tags: ['ACS', 'census', 'population', 'survey', '2020'] });
  }
  if (/landsat/.test(q)) {
    out.push({ id: 'datagov-usgs-landsat', title: 'USGS Landsat Collection 2 data', description: 'Landsat satellite imagery from USGS EarthExplorer / Landsat Collection for land cover and remote sensing analysis.', source: 'datagov', url: 'https://www.usgs.gov/landsat-missions/landsat-data-access', tags: ['Landsat', 'USGS', 'satellite', 'land cover', 'remote sensing'] });
  }
  if (/human\s+cell\s+atlas|single\s+cell.*atlas/.test(q)) {
    out.push({ id: 'cellxgene-human-cell-atlas', title: 'Human Cell Atlas single-cell datasets', description: 'Human Cell Atlas single-cell RNA-seq collections available through CELLxGENE/HCA portals.', source: 'cellxgene', url: 'https://cellxgene.cziscience.com/collections', tags: ['Human Cell Atlas', 'single-cell', 'RNA-seq', 'HCA'] });
  }
  return out;
}


function extractAccessions(text: string): string[] {
  const regex = /\b(GSE\d+|GSM\d+|SRP\d+|SRS\d+|SRX\d+|SRR\d+|ERP\d+|ERS\d+|ERX\d+|ERR\d+|DRP\d+|DRS\d+|DRX\d+|DRR\d+|PRJNA\d+|PRJEB\d+|PRJCA\d+|E-MTAB-\d+|E-MEXP-\d+|CNP\d+|CRA\d+|CRR\d+|HRA\d+)\b/gi;
  const matches = text.match(regex) || [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}

async function searchHuggingFace(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  const collected: DatasetItem[] = [];
  for (const term of canonicalDatasetSearchTerms(query)) {
    try {
      const url = `https://huggingface.co/api/datasets?search=${encodeURIComponent(term)}&limit=20`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      collected.push(...data
        .filter((row: any) => inYearRange(row.lastModified, yearFrom, yearTo))
        .map((row: any) => ({
          id: `hf-${row.id || row._id || Math.random().toString(36).slice(2)}`,
          title: row.id || "Untitled dataset",
          description: cleanText(row.description || `${row.id || ''} Hugging Face dataset`),
          source: "huggingface" as const,
          url: `https://huggingface.co/datasets/${row.id}`,
          downloads: typeof row.downloads === "number" ? row.downloads : undefined,
          likes: typeof row.likes === "number" ? row.likes : undefined,
          updatedAt: row.lastModified,
          tags: Array.isArray(row.tags) ? row.tags.filter((t: unknown): t is string => typeof t === "string") : [],
        })));
    } catch (error) {
      console.error("[datasets] Hugging Face search failed:", error);
    }
  }
  return mergePublicDatasetRecords([...staticCanonicalDatasetResults(query).filter((item) => item.source === 'huggingface'), ...collected]);
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

function pickNcbiTitle(row: any, fallback: string): string {
  return row?.title || row?.studytitle || row?.caption || row?.project_title || row?.project_name || row?.expname || fallback;
}

function pickNcbiSummary(row: any): string {
  const text = row?.summary || row?.description || row?.project_description || row?.expxml || row?.runs || "";
  return cleanText(String(text).slice(0, 1200));
}

function pickNcbiAccession(row: any, id: string): string {
  const raw = row?.accession || row?.gse || row?.gpl || row?.bioproject || row?.project_acc || row?.primary || row?.uid || id;
  const text = Array.isArray(raw) ? raw[0] : String(raw || id);
  const match = text.match(/\b(GSE\d+|GSM\d+|SRP\d+|SRS\d+|SRX\d+|SRR\d+|PRJNA\d+|PRJEB\d+|PRJCA\d+)\b/i);
  return (match?.[1] || text).toUpperCase();
}

async function fetchNcbiDb(db: "gds" | "sra" | "bioproject", query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  const ncbiKey = process.env.NCBI_API_KEY || '';
  const searchParams = new URLSearchParams({
    db,
    term: query,
    retmax: "20",
    retmode: "json",
    sort: "relevance",
    ...(ncbiKey ? { api_key: ncbiKey } : {}),
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
    db,
    id: ids.join(","),
    retmode: "json",
    ...(ncbiKey ? { api_key: ncbiKey } : {}),
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
      const accession = pickNcbiAccession(row, id);
      const title = pickNcbiTitle(row, `${db.toUpperCase()} dataset ${accession}`);
      const urlDb = db === "gds" ? "gds" : db;
      return {
        id: `ncbi-${db}-${accession}`,
        title,
        description: pickNcbiSummary(row),
        source: "ncbi" as const,
        url: `https://www.ncbi.nlm.nih.gov/${urlDb}/?term=${encodeURIComponent(accession)}`,
        updatedAt: row.pdat || row.updatedate || row.sra_updated || row.submission_date,
        accessionIds: extractAccessions(`${accession} ${title} ${pickNcbiSummary(row)}`),
        tags: [db.toUpperCase(), row.organism || row.taxname || row.taxon || ""].filter(Boolean).map(String),
      };
    })
    .filter((item): item is DatasetItem => item !== null && (item.updatedAt ? inYearRange(item.updatedAt, yearFrom, yearTo) : true));
}

async function searchNcbiEutils(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  const collected: DatasetItem[] = [];
  for (const db of ["gds", "sra", "bioproject"] as const) {
    try {
      collected.push(...await fetchNcbiDb(db, query, yearFrom, yearTo));
    } catch (error) {
      console.warn(`[datasets] NCBI ${db} search skipped:`, error);
    }
  }
  return collected;
}

async function searchEnaPortal(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const enaQuery = `(study_title="${query}" OR study_description="${query}" OR sample_alias="${query}" OR center_name="${query}")`;
    const params = new URLSearchParams({
      result: "study",
      query: enaQuery,
      fields: "study_accession,study_title,study_description,last_updated,center_name",
      format: "json",
      limit: "50",
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
    if (!Array.isArray(rows) || rows.length === 0) return staticCanonicalDatasetResults(query).filter((item) => item.source === 'datagov');

    const mapped = rows
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
    return mergePublicDatasetRecords([...staticCanonicalDatasetResults(query).filter((item) => item.source === 'datagov'), ...mapped]);
  } catch (error) {
    console.error("[datasets] Data.gov search failed:", error);
    return staticCanonicalDatasetResults(query).filter((item) => item.source === 'datagov');
  }
}

async function searchDataEu(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: "50" });
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
        const resourceUrl = typeof row.resource === "string"
          ? row.resource
          : Array.isArray(row.resource)
            ? row.resource.find((r: unknown) => typeof r === "string")
            : undefined;
        const url = resourceUrl || (id ? `https://data.europa.eu/data/datasets/${String(id)}` : undefined);

        return {
          id: `dataeu-${id || Math.random().toString(36).slice(2)}`,
          title: cleanText(row.title || id || "Untitled dataset"),
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
    const params = new URLSearchParams({ q: query, type: "dataset", per_page: "50" });
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

async function searchOpenMl(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  const collected: DatasetItem[] = [];
  for (const term of canonicalDatasetSearchTerms(query)) {
    try {
      const res = await fetch(`https://api.openml.org/api/v1/json/data/list/limit/50/data_name/${encodeURIComponent(term)}`, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const rows = data?.data?.dataset;
      if (!Array.isArray(rows)) continue;
      const tokens = publicQueryTokens(term);
      collected.push(...rows
        .filter((row: any) => {
          const text = `${row.name || ""} ${row.did || ""}`.toLowerCase();
          const tokenOk = tokens.length === 0 || tokens.some((token) => publicTokenHit(text, token));
          return tokenOk && inYearRange(row.upload_date, yearFrom, yearTo);
        })
        .slice(0, 20)
        .map((row: any) => ({
          id: `openml-${row.did || Math.random().toString(36).slice(2)}`,
          title: row.name || `OpenML dataset ${row.did}`,
          description: cleanText(`OpenML data id ${row.did}, format ${row.format || "unknown"}`),
          source: "openml" as const,
          url: `https://www.openml.org/search?type=data&id=${row.did}`,
          updatedAt: row.upload_date,
          tags: ['OpenML'],
        })));
    } catch (error) {
      console.error("[datasets] OpenML search failed:", error);
    }
  }
  return mergePublicDatasetRecords([...staticCanonicalDatasetResults(query).filter((item) => item.source === 'openml'), ...collected]);
}

async function searchCngb(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const url = `https://db.cngb.org/data_resources/?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await res.text();

    const titleMatches = [...html.matchAll(/<a[^>]*href="([^"]*\/data_resources\/[^"#]*)"[^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 20);
    if (titleMatches.length === 0) return [];

    const items: DatasetItem[] = titleMatches.map((m, idx) => {
      const rawTitle = m[2]?.replace(/<[^>]*>/g, " ") || "CNGB record";
      const cleanTitle = rawTitle.replace(/\s+/g, " ").trim();
      const href = m[1].startsWith("http") ? m[1] : `https://db.cngb.org${m[1]}`;
      return {
        id: `cngb-${idx}-${cleanTitle.slice(0, 20).replace(/\W/g, "")}`,
        title: cleanTitle || "CNGB dataset",
        description: cleanText("CNGBdb data resource search result"),
        source: "cngb",
        url: href,
        updatedAt: undefined,
        tags: ["CNGBdb", "China"],
      };
    });

    return items.filter((item) => inYearRange(item.updatedAt, yearFrom, yearTo));
  } catch (error) {
    console.error("[datasets] CNGB search failed:", error);
    return [];
  }
}

function datasetQueryRelevance(item: DatasetItem, query: string): number {
  const q = normalizePublicBioQuery(query).toLowerCase();
  const text = `${item.title || ""} ${item.description || ""} ${(item.tags || []).join(" ")} ${(item.accessionIds || []).join(" ")}`.toLowerCase();
  const tokens = publicQueryTokens(q);
  const generic = new Set(["dataset", "datasets", "data", "search", "single", "cell", "cells", "rna", "seq", "rnaseq", "rna-seq", "sequencing", "transcriptomic", "transcriptomics"]);
  const important = tokens.filter((token) => !generic.has(token));
  const targetTokens = important.length ? important : tokens;
  if (!targetTokens.length) return 0;
  const biomedicalQuery = isPublicBiomedicalQuery(query);

  const title = (item.title || "").toLowerCase();
  const description = (item.description || "").toLowerCase();
  const accessions = (item.accessionIds || []).join(" ").toLowerCase();
  const titleMatches = targetTokens.filter((token) => publicTokenHit(title, token)).length;
  const descriptionMatches = targetTokens.filter((token) => publicTokenHit(description, token)).length;
  const accessionMatches = targetTokens.filter((token) => publicTokenHit(accessions, token)).length;
  const andCoverage = titleMatches === targetTokens.length || titleMatches + descriptionMatches + accessionMatches >= targetTokens.length ? 1 : 0;
  const orScore = (titleMatches * 1.25 + descriptionMatches * 0.45 + accessionMatches * 1.4) / targetTokens.length;
  const phraseBonus = q && title.includes(q) ? 45 : q && text.includes(q) ? 20 : 0;
  const accessionBonus = item.accessionIds?.length ? 20 : 0;
  const source = String(item.source || '').toLowerCase();
  const canonicalBioSourceBonus = biomedicalQuery && ["ncbi", "ena", "arrayexpress", "cellxgene", "europepmc", "cngb"].includes(source) ? 10 : 0;
  const assayTokens = ["organoid", "scrna", "single", "rna", "seq", "rnaseq", "rna-seq", "transcriptomics", "atac", "chip", "spatial", "proteomics", "metabolomics"];
  const assayAsked = targetTokens.some((token) => assayTokens.includes(token));
  const assayHit = !assayAsked || assayTokens.some((token) => publicTokenHit(title, token) || publicTokenHit(description, token));
  const speciesOnlyTokens = new Set(["human", "mouse", "mice", "murine", "mus", "musculus", "rat", "rattus", "pig", "porcine", "swine", "sus", "scrofa", "bovine", "cow", "cattle", "zebrafish"]);
  const coreTokens = targetTokens.filter((token) => !speciesOnlyTokens.has(token));
  const coreHits = coreTokens.filter((token) => publicTokenHit(title, token) || publicTokenHit(description, token) || publicTokenHit(accessions, token)).length;
  const specificHits = titleMatches + descriptionMatches + accessionMatches;
  const weakAndPenalty = targetTokens.length >= 2 && specificHits < Math.ceil(targetTokens.length * 0.5) ? 90 : 0;
  const noCoreTokenPenalty = coreTokens.length >= 1 && coreHits === 0 ? 110 : 0;
  const noTitleOrAccessionPenalty = titleMatches === 0 && accessionMatches === 0 ? 45 : 0;
  const genericSpeciesPenalty = assayAsked && !assayHit ? 45 : 0;
  const requestedYears = Array.from(new Set((q.match(/\b(?:19|20)\d{2}\b/g) || [])));
  const textYears = Array.from(new Set((text.match(/\b(?:19|20)\d{2}\b/g) || [])));
  const yearBonus = requestedYears.length && requestedYears.some((year) => text.includes(year)) ? 90 : 0;
  const wrongYearPenalty = requestedYears.length && textYears.length && !textYears.some((year) => requestedYears.includes(year)) ? 130 : 0;
  const asksMouse = /\b(mouse|mice|murine|mus\s+musculus)\b/i.test(q);
  const asksHuman = /\b(human|humans|homo\s+sapiens)\b/i.test(q);
  const asksPorcine = /\b(porcine|pig|swine|sus\s+scrofa)\b/i.test(q);
  const hasMouse = /\b(mouse|mice|murine|mus\s+musculus)\b/i.test(text);
  const hasHuman = /\b(human|humans|homo\s+sapiens|patient|patients)\b/i.test(text);
  const hasPorcine = /\b(porcine|pig|pigs|swine|sus\s+scrofa)\b/i.test(text);
  const speciesBonus = (asksMouse && hasMouse) || (asksHuman && hasHuman) || (asksPorcine && hasPorcine) ? 80 : 0;
  const wrongSpeciesPenalty = (asksMouse && hasPorcine) || (asksPorcine && hasMouse) || (asksHuman && (hasMouse || hasPorcine)) ? 170 : 0;
  const benchmarkSourceBonus = /\b(imagenet|mnist|iris|uci|classification|benchmark)\b/i.test(q) && ["huggingface", "openml"].includes(source) ? 80 : 0;
  const id = String(item.id || '').toLowerCase();
  const canonicalDatasetBonus = /^(hf-ilsvrc|hf-ylecun|openml-554|openml-61|datagov-census|datagov-acs|datagov-usgs|cellxgene-human-cell-atlas)/.test(id) ? 260 : 0;
  return Math.round(orScore * 100 + andCoverage * 45 + phraseBonus + accessionBonus + canonicalBioSourceBonus + yearBonus + speciesBonus + benchmarkSourceBonus + canonicalDatasetBonus - wrongYearPenalty - wrongSpeciesPenalty - genericSpeciesPenalty - weakAndPenalty - noCoreTokenPenalty - noTitleOrAccessionPenalty);
}

function integrateAndRank(items: DatasetItem[], query: string): DatasetItem[] {
  const withAccessions = items.map((item) => ({
    ...item,
    accessionIds: item.accessionIds?.length
      ? item.accessionIds
      : extractAccessions(`${item.title} ${item.description} ${item.url}`),
  }));

  const deduped = mergePublicDatasetRecords(withAccessions);
  return deduped.map((item) => ({
    ...item,
    rankScore: Math.round(datasetQueryRelevance(item, query) * 3 + publicDatasetWorkflowScore(item)),
  })).filter((item) => (item.rankScore || 0) > 0);
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

async function searchArrayExpress(query: string, yearFrom?: string, yearTo?: string): Promise<DatasetItem[]> {
  try {
    const params = new URLSearchParams({ query, page: "1", pageSize: "50" });
    const res = await fetch(
      `https://www.ebi.ac.uk/biostudies/api/v1/search?${params.toString()}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const data = await res.json();
    const hits: any[] = data?.hits || [];
    return hits
      .map((hit: any) => {
        const accession: string = hit.accession || hit.accno || "";
        const releaseDate: string = hit.release_date || hit.releaseDate || "";
        const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4)) : 0;
        if (yearFrom && releaseYear && releaseYear < parseInt(yearFrom)) return null;
        if (yearTo && releaseYear && releaseYear > parseInt(yearTo)) return null;
        const description = (hit.content || "").replace(new RegExp(`^${accession}\\s*`, "i"), "").slice(0, 300);
        return {
          id: `arrayexpress-${accession || Math.random().toString(36).slice(2)}`,
          title: hit.title || accession || "No title",
          description,
          source: "arrayexpress" as const,
          url: accession
            ? `https://www.ebi.ac.uk/biostudies/studies/${accession}`
            : "https://www.ebi.ac.uk/biostudies",
          accessionIds: accession ? [accession] : [],
          updatedAt: releaseDate || undefined,
          tags: [],
        } as DatasetItem;
      })
      .filter((x): x is DatasetItem => x !== null);
  } catch {
    return [];
  }
}

async function searchCellxGene(query: string): Promise<DatasetItem[]> {
  try {
    const res = await fetch(
      "https://api.cellxgene.cziscience.com/curation/v1/collections?is_published=true",
      { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } },
    );
    const data = await res.json();
    const collections: any[] = Array.isArray(data) ? data : (data?.collections || []);
    const tokens = publicQueryTokens(query);
    return collections
      .filter((col: any) => {
        const text = `${col.name || ""} ${col.description || ""}`.toLowerCase();
        return tokens.length === 0 || tokens.some((t) => publicTokenHit(text, t));
      })
      .slice(0, 15)
      .map((col: any) => ({
        id: `cellxgene-${col.collection_id || Math.random().toString(36).slice(2)}`,
        title: col.name || "No title",
        description: col.description || "",
        source: "cellxgene" as const,
        url: col.collection_id
          ? `https://cellxgene.cziscience.com/collections/${col.collection_id}`
          : "https://cellxgene.cziscience.com",
        accessionIds: col.collection_id ? [col.collection_id] : [],
        updatedAt: col.published_at || col.revised_at || undefined,
        tags: ["single-cell", "scRNA-seq"],
      } as DatasetItem));
  } catch {
    return [];
  }
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
  const pageSizeRaw = Number.parseInt(String(input?.pageSize || "25"), 10) || 25;
  const pageSize = Math.min(200, Math.max(1, pageSizeRaw));
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
    const normalizedQuery = normalizePublicBioQuery(String(query));
    const biomedicalQuery = isPublicBiomedicalQuery(normalizedQuery);
    const requestedSources = sources;
    const generalSources = requestedSources.filter((source) => !BIO_DATASET_SOURCES.has(source));
    const effectiveSources = biomedicalQuery || generalSources.length === 0 ? requestedSources : generalSources;
    const expandedBioQuery = expandPublicBioQuery(normalizedQuery, 4);
    const effectiveQuery = biomedicalQuery
      ? buildPublicKeywordSpeciesQuery(normalizedQuery, { expand: true, titleOnly: false })
      : normalizedQuery;
    const sourceQueryFor = (source: DatasetSource) => biomedicalQuery && BIO_DATASET_SOURCES.has(source)
      ? expandedBioQuery
      : normalizedQuery;

    // Cache lookup
    const cacheKey = makeCacheKey({ v: 'query-parts-6', q: normalizedQuery, biomedicalQuery, sources: [...effectiveSources].sort(), yearFrom, yearTo, sortBy, page, pageSize });
    const cached = datasetsCache.get(cacheKey);
    if (cached) { const c = cached as Record<string, unknown>; return NextResponse.json({ ...c, meta: { ...(c.meta as Record<string, unknown>), cached: true } }); }

    const sourceJobs: Record<DatasetSource, (q: string, yf?: string, yt?: string) => Promise<DatasetItem[]>> = {
      huggingface: searchHuggingFace,
      kaggle: searchKaggle,
      ncbi: searchNcbiEutils,
      ena: searchEnaPortal,
      europepmc: searchEuropePmcAccessions,
      arrayexpress: searchArrayExpress,
      cellxgene: (q) => searchCellxGene(q),
      datagov: searchDataGov,
      dataeu: searchDataEu,
      zenodo: searchZenodo,
      dryad: searchDryad,
      dataverse: searchDataverse,
      figshare: searchFigshare,
      openml: searchOpenMl,
      cngb: searchCngb,
    };

    const jobs = effectiveSources.map((source) => ({ source, promise: sourceJobs[source](sourceQueryFor(source), yearFrom, yearTo) }));
    const sourceStartedAt = new Map(jobs.map((job) => [job.source, Date.now()]));
    const settled = await Promise.allSettled(jobs.map((job) => job.promise));

    const bySource: Record<DatasetSource, DatasetItem[]> = {
      huggingface: [],
      kaggle: [],
      ncbi: [],
      ena: [],
      europepmc: [],
      arrayexpress: [],
      cellxgene: [],
      datagov: [],
      dataeu: [],
      zenodo: [],
      dryad: [],
      dataverse: [],
      figshare: [],
      openml: [],
      cngb: [],
    };

    settled.forEach((result, index) => {
      const source = jobs[index]?.source;
      if (!source) return;
      bySource[source] = result.status === "fulfilled" ? result.value : [];
    });
    const sourceHealth = settled.map((result, index) => {
      const source = jobs[index]?.source || "unknown";
      return publicSourceHealth(source, result, Date.now() - (sourceStartedAt.get(source as DatasetSource) || Date.now()));
    });

    const relevanceQuery = normalizedQuery;
    const guardedBySource = ALL_SOURCES.reduce<Record<string, DatasetItem[]>>((acc, source) => {
      const guardedItems = bySource[source].filter((item) => publicDatasetTopicGuard(item, relevanceQuery));
      const rankedItems = integrateAndRank(guardedItems, relevanceQuery);
      acc[source] = sortDatasets(rankedItems, sortBy);
      return acc;
    }, {});

    const merged = ALL_SOURCES.flatMap((source) => guardedBySource[source] || []);
    const ranked = integrateAndRank(merged, relevanceQuery);
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

    const responseBody = {
      datasets: paged,
      bySource: guardedBySource,
      suggestedTopics: buildPublicDatasetSuggestedTopics(sorted, effectiveQuery),
      meta: {
        trackResults,
        sourceHealth,
        selectedQuery: normalizedQuery,
        expandedQuery: effectiveQuery,
        biomedicalQuery,
        pagination: { page: safePage, pageSize, total, totalPages },
        sort: { by: sortBy },
        cached: false,
      },
    };

    if (paged.length > 0) {
      datasetsCache.set(cacheKey, responseBody);
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("[datasets] Search failed:", error);
    return NextResponse.json({ error: "Search failed", datasets: [] }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
