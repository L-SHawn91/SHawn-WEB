import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.SEARCH_BASE_URL || 'http://localhost:3000';
const fixturePath = new URL('../fixtures/queries.json', import.meta.url);
const reportPath = new URL('../fixtures/search-report.json', import.meta.url);

function normalize(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function authorHitRateTop10(papers = [], query = '') {
  const q = normalize(query);
  const tokens = q.split(' ').filter(Boolean).slice(0, 2);
  if (tokens.length < 2) return null;
  const top = papers.slice(0, 10);
  if (!top.length) return 0;
  let hits = 0;
  for (const p of top) {
    const authors = normalize((p.authors || []).join(' '));
    if (tokens.every((t) => authors.includes(t))) hits += 1;
  }
  return Number((hits / top.length).toFixed(2));
}

function computeRow(item, data) {
  const papers = data?.papers || [];
  const counts = papers.reduce((acc, p) => {
    acc[p.source] = (acc[p.source] || 0) + 1;
    return acc;
  }, {});

  const top10 = papers.slice(0, 10);
  const arxivWeakInTop10 = top10.filter((p) => p.source === 'arxiv' && p.matchType === 'author-weak').length;
  const unknownMatchInTop10 = top10.filter((p) => !p.matchType).length;

  return {
    name: item.name,
    group: item.group || 'ungrouped',
    query: item.query,
    intent: data?.meta?.intent || 'UNKNOWN',
    total: papers.length,
    bySource: counts,
    totalTimeMs: data?.meta?.totalTime || null,
    authorHitRateTop10: authorHitRateTop10(papers, item.query),
    arxivWeakInTop10,
    unknownMatchInTop10,
  };
}

function summarize(rows) {
  const summary = {
    totalQueries: rows.length,
    avgTotalResults: 0,
    avgLatencyMs: 0,
    avgAuthorHitRateTop10: null,
    totalArxivWeakInTop10: 0,
    byIntent: {},
    byGroup: {},
  };

  if (!rows.length) return summary;

  const validHitRates = rows.map((r) => r.authorHitRateTop10).filter((x) => typeof x === 'number');
  const validLatencies = rows.map((r) => r.totalTimeMs).filter((x) => typeof x === 'number');

  summary.avgTotalResults = Number((rows.reduce((a, r) => a + r.total, 0) / rows.length).toFixed(2));
  summary.avgLatencyMs = validLatencies.length
    ? Number((validLatencies.reduce((a, x) => a + x, 0) / validLatencies.length).toFixed(2))
    : 0;
  summary.avgAuthorHitRateTop10 = validHitRates.length
    ? Number((validHitRates.reduce((a, x) => a + x, 0) / validHitRates.length).toFixed(2))
    : null;
  summary.totalArxivWeakInTop10 = rows.reduce((a, r) => a + r.arxivWeakInTop10, 0);

  for (const r of rows) {
    summary.byIntent[r.intent] = (summary.byIntent[r.intent] || 0) + 1;
    summary.byGroup[r.group] = (summary.byGroup[r.group] || 0) + 1;
  }

  return summary;
}

async function run() {
  const fixtures = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  const rows = [];

  for (const item of fixtures) {
    const res = await fetch(`${baseUrl}/api/papers/search-parallel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: item.query,
        filters: {
          sources: ['pubmed', 'arxiv', 'semantic'],
          yearFrom: '2000',
          yearTo: '2026',
        },
      }),
    });

    const data = await res.json();
    const row = computeRow(item, data);
    rows.push(row);

    console.log(`\n[${row.name}] (${row.group}) ${row.query}`);
    console.log(`intent=${row.intent} total=${row.total} time=${row.totalTimeMs ?? 'n/a'}ms bySource=${JSON.stringify(row.bySource)}`);
    console.log(`authorHitRate(top10)=${row.authorHitRateTop10 ?? 'n/a'} arxivWeakInTop10=${row.arxivWeakInTop10} unknownMatchInTop10=${row.unknownMatchInTop10}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    summary: summarize(rows),
    rows,
  };

  await fs.mkdir(path.dirname(reportPath.pathname), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n=== Aggregate Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report written: ${reportPath.pathname}`);
}

run().catch((err) => {
  console.error('test-search failed:', err);
  process.exit(1);
});
