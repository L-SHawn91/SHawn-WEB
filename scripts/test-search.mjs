import fs from 'node:fs/promises';

const baseUrl = process.env.SEARCH_BASE_URL || 'http://localhost:3000';
const fixturePath = new URL('../fixtures/queries.json', import.meta.url);

function normalize(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function authorHitRate(papers = [], query = '') {
  const q = normalize(query);
  const tokens = q.split(' ').filter(Boolean).slice(0, 2);
  if (tokens.length < 2) return null;
  let hits = 0;
  const top = papers.slice(0, 10);
  for (const p of top) {
    const blob = normalize((p.authors || []).join(' '));
    if (tokens.every((t) => blob.includes(t))) hits += 1;
  }
  return top.length ? Number((hits / top.length).toFixed(2)) : 0;
}

async function run() {
  const fixtures = JSON.parse(await fs.readFile(fixturePath, 'utf8'));

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
    const papers = data?.papers || [];
    const counts = papers.reduce((acc, p) => {
      acc[p.source] = (acc[p.source] || 0) + 1;
      return acc;
    }, {});

    const hitRate = authorHitRate(papers, item.query);
    const weakNoise = papers
      .slice(0, 10)
      .filter((p) => p.matchType === 'author-weak' && p.source === 'arxiv').length;

    console.log(`\n[${item.name}] ${item.query}`);
    console.log(`intent=${data?.meta?.intent} total=${papers.length} bySource=${JSON.stringify(counts)}`);
    console.log(`authorHitRate(top10)=${hitRate ?? 'n/a'} arxivWeakInTop10=${weakNoise}`);
  }
}

run().catch((err) => {
  console.error('test-search failed:', err);
  process.exit(1);
});
