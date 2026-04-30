/**
 * Journal IF + Q1-Q4 quartile lookup via OpenAlex /sources/ API.
 * Ported from SHawn-bio-search/_journal_metrics.py
 *
 * Quartile estimation from 2yr IF (biomedical distribution):
 *   Q1 ≥ 5.0 | Q2 ≥ 2.5 | Q3 ≥ 1.0 | Q4 < 1.0
 *
 * Cache: process-level Map, 24h TTL (from server-cache.ts journalMetricsCache)
 */

import { journalMetricsCache } from './server-cache';

interface JournalMetrics {
  if: number;
  quartile: string;
  hIndex: number;
  name: string;
}

const EMPTY: JournalMetrics = { if: 0, quartile: '', hIndex: 0, name: '' };

function estimateQuartile(impactFactor: number): string {
  if (impactFactor >= 5.0) return 'Q1';
  if (impactFactor >= 2.5) return 'Q2';
  if (impactFactor >= 1.0) return 'Q3';
  if (impactFactor > 0) return 'Q4';
  return '';
}

function normalizeIssnOrName(issn: string, name: string): string {
  return (issn || name || '').toLowerCase().trim();
}

function normalizeJournalName(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function lookupJournalMetrics(issn: string, name: string): Promise<JournalMetrics> {
  const cacheKey = normalizeIssnOrName(issn, name);
  if (!cacheKey) return EMPTY;

  const cached = journalMetricsCache.get(cacheKey);
  if (cached) return cached;

  try {
    // OpenAlex /sources/ endpoint — no API key required
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
    const metrics: JournalMetrics = {
      if: Math.round(impactFactor * 10) / 10,
      quartile: estimateQuartile(impactFactor),
      hIndex: source.summary_stats?.h_index ?? source.h_index ?? 0,
      name: source.display_name || name,
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
export async function enrichPapersWithJournalMetrics<T extends { journal?: string; journalIssn?: string; impactFactor?: number; journalQuartile?: string; journalHIndex?: number }>(
  papers: T[],
): Promise<T[]> {
  // Gather unique lookup keys
  const lookupSet = new Map<string, { issn: string; name: string }>();
  for (const p of papers) {
    const issn = p.journalIssn?.trim() || '';
    const name = p.journal?.trim() || '';
    const key = normalizeIssnOrName(issn, name);
    if (key && !lookupSet.has(key)) lookupSet.set(key, { issn, name });
  }

  // Parallel fetch (max 10 concurrent to avoid hammering OpenAlex)
  const entries = Array.from(lookupSet.entries());
  const batchSize = 10;
  const metricsMap = new Map<string, JournalMetrics>();
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(([key, { issn, name }]) =>
        lookupJournalMetrics(issn, name).then((m) => [key, m] as [string, JournalMetrics])
      )
    );
    for (const [key, m] of results) metricsMap.set(key, m);
  }

  return papers.map((p) => {
    const issn = p.journalIssn?.trim() || '';
    const name = p.journal?.trim() || '';
    const key = normalizeIssnOrName(issn, name);
    const m = metricsMap.get(key);
    if (!m || !m.quartile) return p;
    return {
      ...p,
      impactFactor: m.if || p.impactFactor,
      journalQuartile: m.quartile,
      journalHIndex: m.hIndex,
      // Preserve the source-provided journal title. OpenAlex name search can rank
      // broader journals first (e.g. "Reproduction" → "Human Reproduction"),
      // so enrichment must only add metrics, not rewrite bibliographic metadata.
      journal: p.journal || m.name,
    };
  });
}
