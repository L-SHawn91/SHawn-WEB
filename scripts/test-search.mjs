import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.SEARCH_BASE_URL || 'http://localhost:3000';
const args = new Set(process.argv.slice(2));
const fixturePath = process.env.SEARCH_FIXTURE
  ? path.resolve(process.env.SEARCH_FIXTURE)
  : new URL(args.has('--regression') ? '../fixtures/search-regression.json' : '../fixtures/queries.json', import.meta.url).pathname;
const reportPath = process.env.SEARCH_REPORT
  ? path.resolve(process.env.SEARCH_REPORT)
  : new URL(args.has('--regression') ? '../fixtures/search-regression-report.json' : '../fixtures/search-report.json', import.meta.url).pathname;
const failOnRegression = args.has('--fail-on-regression') || args.has('--regression');

const DEFAULT_FILTERS = {
  sources: ['pubmed', 'arxiv', 'semantic'],
  yearFrom: '2000',
  yearTo: '2026',
};

function normalize(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function paperText(p = {}) {
  return normalize([
    p.title,
    p.abstract,
    (p.authors || []).join(' '),
    (p.keywords || []).join(' '),
    (p.meshTerms || []).join(' '),
    (p.techniques || []).join(' '),
    p.journal,
  ].filter(Boolean).join(' '));
}

function includesLooseNameToken(target, token) {
  const compactTarget = target.replace(/\s+/g, '');
  const compactToken = token.replace(/\s+/g, '');
  if (target.includes(token) || compactTarget.includes(compactToken)) return true;
  // Korean romanization is often split differently by bibliographic APIs:
  // "soohyung" may appear as "soo hyung".
  if (token.length >= 6) {
    return compactTarget.includes(compactToken) || compactToken.includes(compactTarget.slice(0, Math.min(compactTarget.length, compactToken.length)));
  }
  return false;
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
    if (tokens.every((t) => includesLooseNameToken(authors, t))) hits += 1;
  }
  return Number((hits / top.length).toFixed(2));
}

function groupHitCount(text, groups = []) {
  return groups.reduce((count, group) => {
    const terms = Array.isArray(group) ? group : [group];
    return count + (terms.some((term) => text.includes(normalize(term))) ? 1 : 0);
  }, 0);
}

function evaluateExpectations(item, data, row) {
  const expect = item.expect || {};
  const failures = [];
  const papers = data?.papers || [];

  if (typeof expect.minResults === 'number' && papers.length < expect.minResults) {
    failures.push(`expected at least ${expect.minResults} results, got ${papers.length}`);
  }

  if (expect.intent && data?.meta?.intent !== expect.intent) {
    failures.push(`expected intent ${expect.intent}, got ${data?.meta?.intent || 'UNKNOWN'}`);
  }

  if (typeof expect.maxArxivWeakInTop10 === 'number' && row.arxivWeakInTop10 > expect.maxArxivWeakInTop10) {
    failures.push(`expected arxivWeakInTop10 <= ${expect.maxArxivWeakInTop10}, got ${row.arxivWeakInTop10}`);
  }

  if (typeof expect.maxUnknownMatchInTop10 === 'number' && row.unknownMatchInTop10 > expect.maxUnknownMatchInTop10) {
    failures.push(`expected unknownMatchInTop10 <= ${expect.maxUnknownMatchInTop10}, got ${row.unknownMatchInTop10}`);
  }

  if (typeof expect.minAuthorHitRateTop10 === 'number') {
    const rate = row.authorHitRateTop10 ?? 0;
    if (rate < expect.minAuthorHitRateTop10) {
      failures.push(`expected authorHitRateTop10 >= ${expect.minAuthorHitRateTop10}, got ${rate}`);
    }
  }

  if (typeof expect.minAuthorMatchTypeRateTop10 === 'number') {
    const rate = row.authorMatchTypeRateTop10 ?? 0;
    if (rate < expect.minAuthorMatchTypeRateTop10) {
      failures.push(`expected authorMatchTypeRateTop10 >= ${expect.minAuthorMatchTypeRateTop10}, got ${rate}`);
    }
  }

  const groups = expect.requiredAnyTermGroups || [];
  if (groups.length) {
    const topN = papers.slice(0, expect.topN || 5);
    const minGroups = expect.minMatchedGroupsPerRelevantPaper || Math.min(2, groups.length);
    const relevant = topN.filter((p) => groupHitCount(paperText(p), groups) >= minGroups);
    const requestedMinRelevant = expect.minRelevantTopN ?? Math.min(topN.length, 3);
    const minRelevant = Math.min(requestedMinRelevant, topN.length);
    if (relevant.length < minRelevant) {
      failures.push(`expected at least ${minRelevant}/${topN.length} top papers to match >=${minGroups} required term groups, got ${relevant.length}`);
    }

    if (typeof expect.minTopGroupCoverage === 'number') {
      const coverage = topN.length && groups.length
        ? topN.reduce((acc, p) => acc + groupHitCount(paperText(p), groups) / groups.length, 0) / topN.length
        : 0;
      row.topGroupCoverage = Number(coverage.toFixed(2));
      if (coverage < expect.minTopGroupCoverage) {
        failures.push(`expected top group coverage >= ${expect.minTopGroupCoverage}, got ${row.topGroupCoverage}`);
      }
    }
  }

  return failures;
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
  const authorMatchTypeRateTop10 = top10.length
    ? Number((top10.filter((p) => p.matchType === 'author-exact' || p.matchType === 'author-weak').length / top10.length).toFixed(2))
    : null;
  const topTitles = papers.slice(0, 5).map((p) => ({ title: p.title, source: p.source, matchType: p.matchType, rankScore: p.rankScore }));

  return {
    name: item.name,
    group: item.group || 'ungrouped',
    query: item.query,
    intent: data?.meta?.intent || 'UNKNOWN',
    selectedQuery: data?.meta?.selectedQuery || null,
    total: papers.length,
    bySource: counts,
    totalTimeMs: data?.meta?.totalTime ?? null,
    authorHitRateTop10: authorHitRateTop10(papers, item.query),
    authorMatchTypeRateTop10,
    arxivWeakInTop10,
    unknownMatchInTop10,
    topTitles,
  };
}

function summarize(rows) {
  const summary = {
    totalQueries: rows.length,
    failedQueries: rows.filter((r) => r.failures?.length).length,
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
          ...DEFAULT_FILTERS,
          ...(item.filters || {}),
        },
        ...(item.payload || {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`${item.name}: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const row = computeRow(item, data);
    row.failures = evaluateExpectations(item, data, row);
    rows.push(row);

    const status = row.failures.length ? 'FAIL' : 'PASS';
    console.log(`\n[${status}] [${row.name}] (${row.group}) ${row.query}`);
    console.log(`intent=${row.intent} total=${row.total} time=${row.totalTimeMs ?? 'n/a'}ms bySource=${JSON.stringify(row.bySource)}`);
    console.log(`authorHitRate(top10)=${row.authorHitRateTop10 ?? 'n/a'} authorMatchTypeRate(top10)=${row.authorMatchTypeRateTop10 ?? 'n/a'} arxivWeakInTop10=${row.arxivWeakInTop10} unknownMatchInTop10=${row.unknownMatchInTop10}`);
    if (typeof row.topGroupCoverage === 'number') console.log(`topGroupCoverage=${row.topGroupCoverage}`);
    if (row.failures.length) console.log(`failures=${JSON.stringify(row.failures)}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    fixturePath,
    summary: summarize(rows),
    rows,
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n=== Aggregate Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report written: ${reportPath}`);

  if (failOnRegression && report.summary.failedQueries > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('test-search failed:', err);
  process.exit(1);
});
