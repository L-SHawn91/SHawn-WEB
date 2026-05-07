/**
 * Journal IF + Q1-Q4 quartile lookup.
 *
 * Metric precedence:
 *   1) Server-local JCR lookup index built from SHawn JCR 2024 TSV export
 *      - JSON index: SHAWN_WEB_JCR_INDEX_JSON or ~/.shawn/cache/shawn_web_jcr_2024_index.json
 *      - Source TSV: SBS_JCR_EXPORT_TSV or ~/.shawn/cache/jcr_2024_merged_journals.tsv
 *      - JSON index is auto-rebuilt if missing or older than source TSV
 *      - Exact ISSN/eISSN and conservative title/JCR-abbreviation variants only
 *   2) OpenAlex summary_stats.2yr_mean_citedness proxy fallback
 *
 * OpenAlex values are not official Impact Factors. Official JCR values are marked
 * with journalIfIsOfficial=true and source metadata for UI/tooltips.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { journalMetricsCache } from './server-cache';

interface JournalMetrics {
  if: number;
  quartile: string;
  hIndex: number;
  name: string;
  field?: string;
  subfield?: string;
  domain?: string;
  topic?: string;
  recentYears?: Array<{ year: number; works: number; citations: number }>;
  source?: string;
  metric?: string;
  year?: string;
  isOfficial?: boolean;
  matchMode?: string;
  jci?: number;
  category?: string;
  edition?: string;
  rank?: string;
  percentile?: number;
}

const EMPTY: JournalMetrics = {
  if: 0,
  quartile: '',
  hIndex: 0,
  name: '',
  source: '',
  metric: '',
  year: '',
  isOfficial: false,
  matchMode: '',
};

const JCR_YEAR = process.env.JCR_YEAR || '2024';

type JcrIndexRecord = JournalMetrics & {
  issn?: string;
  eissn?: string;
};

interface JcrJsonIndex {
  meta: {
    source: string;
    jcrYear: string;
    builtAt: string;
    issnCount?: number;
    nameCount?: number;
    tsvMtime?: string;
  };
  issnRecords: Record<string, JcrIndexRecord>;
  nameRecords: Record<string, JcrIndexRecord>;
}

let jcrExportLoaded = false;
let jcrIssnIndex = new Map<string, JcrIndexRecord>();
let jcrNameIndex = new Map<string, JcrIndexRecord>();

function parseNumber(value: unknown): number {
  const raw = String(value ?? '').replace(/,/g, '').trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeJournalName(name: string): string {
  return (name || '')
    .replace(/&amp;/gi, '&')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function journalNameVariants(name: string): Set<string> {
  const raw = cleanText(name);
  if (!raw) return new Set();
  const variants = [
    raw,
    raw.replace(/\s*\([^)]*\)\s*/g, ' '),
    raw.replace(/\s*:\s*.*$/g, ''),
    raw.replace(/\s*,\s*the official journal.*$/i, ''),
    raw.replace(/^the\s+/i, ''),
    raw.replace(/&/g, 'and'),
  ];
  return new Set(variants.map(normalizeJournalName).filter(Boolean));
}

function cleanIssn(value: string): string {
  return cleanText(value).replace(/[^0-9Xx]/g, '').toUpperCase();
}

function splitIssns(value: string): Set<string> {
  const out = new Set<string>();
  for (const part of cleanText(value).split(/[,;/\s]+/)) {
    const clean = cleanIssn(part);
    if (clean.length === 8) out.add(clean);
  }
  return out;
}

function chooseBestRecord(existing: JcrIndexRecord | undefined, candidate: JcrIndexRecord): JcrIndexRecord {
  if (!existing) return candidate;
  return (candidate.if || 0) > (existing.if || 0) ? candidate : existing;
}

function parseDelimitedRows(filePath: string): Array<Record<string, string>> {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // JCR merged cache is TSV with semicolon-separated source files/categories;
    // no quoted-tab fields are expected. CSV support is best-effort fallback.
    const values = line.split(delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cleanText(values[i]);
    });
    return row;
  });
}

function jcrTsvPath(): string {
  return path.resolve(
    (process.env.SBS_JCR_EXPORT_TSV || path.join(os.homedir(), '.shawn/cache/jcr_2024_merged_journals.tsv')).replace(/^~(?=$|\/)/, os.homedir()),
  );
}

function jcrIndexJsonPath(): string {
  return path.resolve(
    (process.env.SHAWN_WEB_JCR_INDEX_JSON || path.join(os.homedir(), '.shawn/cache/shawn_web_jcr_2024_index.json')).replace(/^~(?=$|\/)/, os.homedir()),
  );
}

function buildIndexesFromRows(rows: Array<Record<string, string>>): {
  issnIndex: Map<string, JcrIndexRecord>;
  nameIndex: Map<string, JcrIndexRecord>;
} {
  const issnIndex = new Map<string, JcrIndexRecord>();
  const nameIndex = new Map<string, JcrIndexRecord>();
  for (const row of rows) {
    const journalName = cleanText(row.journal_name || row['Journal name']);
    if (!journalName) continue;
    const jif = parseNumber(row.jif_2024 || row['2024 JIF']);
    if (!jif) continue;
    const quartile = cleanText(row.jif_quartile || row['JIF Quartile']);
    const issn = cleanText(row.issn || row.ISSN);
    const eissn = cleanText(row.eissn || row.eISSN);
    const record: JcrIndexRecord = {
      if: round1(jif),
      quartile,
      hIndex: 0,
      name: journalName,
      source: 'SHawn JCR 2024 local index',
      metric: 'JCR_JIF',
      year: JCR_YEAR,
      isOfficial: true,
      matchMode: 'JCR_EXPORT',
      jci: parseNumber(row.jci_2024 || row['2024 JCI']),
      category: cleanText(row.category || row.Category),
      edition: cleanText(row.edition || row.Edition),
      issn,
      eissn,
    };

    for (const key of new Set([...splitIssns(issn), ...splitIssns(eissn)])) {
      issnIndex.set(key, chooseBestRecord(issnIndex.get(key), { ...record, matchMode: 'JCR_ISSN_OR_EISSN_EXACT' }));
    }
    for (const field of [journalName, row.jcr_abbreviation, row['JCR Abbreviation']]) {
      for (const key of journalNameVariants(field || '')) {
        nameIndex.set(key, chooseBestRecord(nameIndex.get(key), { ...record, matchMode: 'JCR_TITLE_SAFE_VARIANT' }));
      }
    }
  }
  return { issnIndex, nameIndex };
}

function loadJcrExport(): void {
  if (jcrExportLoaded) return;
  jcrExportLoaded = true;

  const indexPath = jcrIndexJsonPath();
  const filePath = jcrTsvPath();
  const tsvExists = fs.existsSync(filePath);

  // Load from JSON index if it's fresh (newer than source TSV, or TSV absent)
  if (fs.existsSync(indexPath)) {
    try {
      const indexMtime = fs.statSync(indexPath).mtimeMs;
      const tsvMtime = tsvExists ? fs.statSync(filePath).mtimeMs : 0;
      if (indexMtime >= tsvMtime) {
        const idx: JcrJsonIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        jcrIssnIndex = new Map(Object.entries(idx.issnRecords || {}));
        jcrNameIndex = new Map(Object.entries(idx.nameRecords || {}));
        return;
      }
    } catch {}
  }

  // Build from TSV and persist JSON index for future startups
  if (!tsvExists) return;
  try {
    const rows = parseDelimitedRows(filePath);
    const { issnIndex, nameIndex } = buildIndexesFromRows(rows);
    jcrIssnIndex = issnIndex;
    jcrNameIndex = nameIndex;

    try {
      const tsvMtime = new Date(fs.statSync(filePath).mtimeMs).toISOString();
      const idx: JcrJsonIndex = {
        meta: {
          source: 'SHawn JCR 2024 local index',
          jcrYear: JCR_YEAR,
          builtAt: new Date().toISOString(),
          issnCount: issnIndex.size,
          nameCount: nameIndex.size,
          tsvMtime,
        },
        issnRecords: Object.fromEntries(issnIndex),
        nameRecords: Object.fromEntries(nameIndex),
      };
      fs.mkdirSync(path.dirname(indexPath), { recursive: true });
      fs.writeFileSync(indexPath, JSON.stringify(idx), 'utf8');
    } catch {}
  } catch {
    jcrIssnIndex = new Map();
    jcrNameIndex = new Map();
  }
}

function lookupJcrExport(issn: string, name: string): JournalMetrics | null {
  loadJcrExport();
  for (const key of splitIssns(issn)) {
    const match = jcrIssnIndex.get(key);
    if (match) return match;
  }
  for (const key of journalNameVariants(name)) {
    const match = jcrNameIndex.get(key);
    if (match) return match;
  }
  return null;
}

function estimateQuartile(impactFactor: number): string {
  // Proxy only: official field-normalized quartile comes from JCR index above.
  if (impactFactor >= 10.0) return 'Q1';
  if (impactFactor >= 4.0) return 'Q2';
  if (impactFactor >= 1.5) return 'Q3';
  if (impactFactor > 0) return 'Q4';
  return '';
}

function normalizeIssnOrName(issn: string, name: string): string {
  return (cleanIssn(issn) || normalizeJournalName(name) || '').toLowerCase().trim();
}

export async function lookupJournalMetrics(issn: string, name: string): Promise<JournalMetrics> {
  const cacheKey = normalizeIssnOrName(issn, name);
  if (!cacheKey) return EMPTY;

  const cached = journalMetricsCache.get(cacheKey);
  if (cached) return cached;

  const officialFromExport = lookupJcrExport(issn, name);
  if (officialFromExport) {
    journalMetricsCache.set(cacheKey, officialFromExport);
    return officialFromExport;
  }

  try {
    // OpenAlex /sources/ endpoint — no API key required. Proxy fallback only.
    const mailto = process.env.OPENALEX_MAILTO || process.env.CROSSREF_EMAIL || '';
    const mailtoParam = mailto ? `&mailto=${encodeURIComponent(mailto)}` : '';

    let url: string;
    if (issn) {
      url = `https://api.openalex.org/sources?filter=issn:${encodeURIComponent(issn)}&per_page=1${mailtoParam}`;
    } else {
      url = `https://api.openalex.org/sources?search=${encodeURIComponent(name)}&per_page=1${mailtoParam}`;
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      journalMetricsCache.set(cacheKey, EMPTY);
      return EMPTY;
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const wantedName = normalizeJournalName(name);
    const source = issn
      ? (results[0] || data)
      : (results.find((row: any) => normalizeJournalName(row?.display_name || '') === wantedName) || results[0] || data);
    if (!source) {
      journalMetricsCache.set(cacheKey, EMPTY);
      return EMPTY;
    }

    const impactFactor: number = source.summary_stats?.['2yr_mean_citedness'] ?? 0;
    const topic = Array.isArray(source.topics) ? source.topics[0] : undefined;
    const recentYears = Array.isArray(source.counts_by_year)
      ? source.counts_by_year
          .filter((row: any) => Number(row?.year) > 0)
          .sort((a: any, b: any) => Number(b.year) - Number(a.year))
          .slice(0, 3)
          .map((row: any) => ({
            year: Number(row.year),
            works: Number(row.works_count || 0),
            citations: Number(row.cited_by_count || 0),
          }))
      : undefined;
    const metrics: JournalMetrics = {
      if: round1(impactFactor),
      quartile: estimateQuartile(impactFactor),
      hIndex: source.summary_stats?.h_index ?? source.h_index ?? 0,
      name: source.display_name || name,
      field: topic?.field?.display_name,
      subfield: topic?.subfield?.display_name,
      domain: topic?.domain?.display_name,
      topic: topic?.display_name,
      recentYears,
      source: impactFactor ? 'OpenAlex summary_stats.2yr_mean_citedness' : '',
      metric: impactFactor ? 'OpenAlex_2yr_mean_citedness_proxy' : '',
      year: impactFactor ? 'rolling' : '',
      isOfficial: false,
      matchMode: impactFactor ? 'OPENALEX_PROXY_FALLBACK' : '',
    };

    journalMetricsCache.set(cacheKey, metrics);
    return metrics;
  } catch {
    journalMetricsCache.set(cacheKey, EMPTY);
    return EMPTY;
  }
}

/**
 * Batch-enrich papers with journal IF + quartile.
 * Deduplicates ISSN/name lookups so each journal is fetched once.
 */
export async function enrichPapersWithJournalMetrics<T extends {
  journal?: string;
  journalIssn?: string;
  impactFactor?: number;
  journalQuartile?: string;
  journalHIndex?: number;
  journalField?: string;
  journalSubfield?: string;
  journalDomain?: string;
  journalTopic?: string;
  journalRecentYears?: Array<{ year: number; works: number; citations: number }>;
  journalIfSource?: string;
  journalIfMetric?: string;
  journalIfYear?: string;
  journalIfIsOfficial?: boolean;
  journalIfMatchMode?: string;
  jcrJci?: number;
  jcrCategory?: string;
  jcrEdition?: string;
  jcrRank?: string;
  jcrPercentile?: number;
}>(
  papers: T[],
): Promise<T[]> {
  const lookupSet = new Map<string, { issn: string; name: string }>();
  for (const p of papers) {
    const issn = p.journalIssn?.trim() || '';
    const name = p.journal?.trim() || '';
    const key = normalizeIssnOrName(issn, name);
    if (key && !lookupSet.has(key)) lookupSet.set(key, { issn, name });
  }

  // Parallel fetch (max 6 concurrent to avoid hammering OpenAlex).
  const entries = Array.from(lookupSet.entries());
  const batchSize = 6;
  const metricsMap = new Map<string, JournalMetrics>();
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(([key, { issn, name }]) =>
        lookupJournalMetrics(issn, name).then((m) => [key, m] as [string, JournalMetrics]),
      ),
    );
    for (const [key, m] of results) metricsMap.set(key, m);
  }

  return papers.map((p) => {
    const issn = p.journalIssn?.trim() || '';
    const name = p.journal?.trim() || '';
    const key = normalizeIssnOrName(issn, name);
    const m = metricsMap.get(key);
    if (!m || (!m.quartile && !m.if)) return p;
    return {
      ...p,
      impactFactor: m.if || p.impactFactor,
      journalQuartile: m.quartile || p.journalQuartile,
      journalHIndex: m.hIndex || p.journalHIndex,
      journalField: m.field,
      journalSubfield: m.subfield,
      journalDomain: m.domain,
      journalTopic: m.topic,
      journalRecentYears: m.recentYears,
      journalIfSource: m.source,
      journalIfMetric: m.metric,
      journalIfYear: m.year,
      journalIfIsOfficial: Boolean(m.isOfficial),
      journalIfMatchMode: m.matchMode,
      jcrJci: m.jci,
      jcrCategory: m.category,
      jcrEdition: m.edition,
      jcrRank: m.rank,
      jcrPercentile: m.percentile,
      // Preserve the source-provided journal title. Name search can rank broader
      // journals first, so enrichment must only add metrics, not rewrite metadata.
      journal: p.journal || m.name,
    };
  });
}
