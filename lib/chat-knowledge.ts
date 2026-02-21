import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export type Capability = {
  name: string;
  route: string;
  description: string;
  category: 'core' | 'lane' | 'content' | 'system';
};

export type ContentSnippet = {
  title: string;
  slug: string;
  summary: string;
  path: string;
};

export type KnowledgeSnapshot = {
  generatedAt: string;
  capabilities: Capability[];
  snippets: ContentSnippet[];
};

let cache: { at: number; data: KnowledgeSnapshot } | null = null;
const CACHE_MS = 30_000;

const ROOT = process.cwd();
const HOME_PAGE = path.join(ROOT, 'app/page.tsx');
const POSTS_DIR = path.join(ROOT, 'content/posts');

function uniqueBy<T>(arr: T[], keyFn: (v: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

async function parseHomeCapabilities(): Promise<Capability[]> {
  try {
    const src = await fs.readFile(HOME_PAGE, 'utf8');
    const blocks = Array.from(src.matchAll(/href:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?desc:\s*"([^"]+)"/g));
    return blocks.map((m) => ({
      route: m[1] || '/',
      name: m[2] || 'Untitled',
      description: m[3] || '',
      category: (m[1] || '').startsWith('/cartridges/') ? 'lane' : 'core',
    }));
  } catch {
    return [];
  }
}

async function parsePostSnippets(limit = 40): Promise<ContentSnippet[]> {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const out: ContentSnippet[] = [];

    for (const file of files.slice(0, limit)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const full = path.join(POSTS_DIR, file);
      const raw = await fs.readFile(full, 'utf8');
      const { data, content } = matter(raw);
      const firstLine = content
        .split(/\r?\n/)
        .map((x) => x.trim())
        .find((x) => x && !x.startsWith('#')) || '';

      out.push({
        title: String(data.title || file.replace(/\.mdx?$/, '')),
        slug: file.replace(/\.mdx?$/, ''),
        summary: String(data.description || firstLine || '').slice(0, 200),
        path: `/blog/${file.replace(/\.mdx?$/, '')}`,
      });
    }

    return out;
  } catch {
    return [];
  }
}

export async function loadKnowledgeSnapshot(force = false): Promise<KnowledgeSnapshot> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.data;

  const homeCaps = await parseHomeCapabilities();
  const snippets = await parsePostSnippets();

  const systemCaps: Capability[] = [
    { name: 'Telegram Auth', route: '/api/auth/telegram', description: '텔레그램 토큰 기반 인증 및 shawn_auth 세션 쿠키 발급', category: 'system' },
    { name: 'Paper Search API', route: '/api/papers/search-parallel', description: 'PubMed/arXiv/Semantic/Crossref/OpenAlex 병렬 통합 검색', category: 'system' },
    { name: 'Dataset Search API', route: '/api/datasets/search', description: '멀티 소스 데이터셋 검색 및 랭킹', category: 'system' },
  ];

  const data: KnowledgeSnapshot = {
    generatedAt: new Date().toISOString(),
    capabilities: uniqueBy([...homeCaps, ...systemCaps], (x) => `${x.route}:${x.name}`),
    snippets,
  };

  cache = { at: now, data };
  return data;
}

export function searchKnowledge(snapshot: KnowledgeSnapshot, query: string, limit = 6) {
  const q = query.toLowerCase().trim();
  if (!q) return { caps: snapshot.capabilities.slice(0, limit), posts: snapshot.snippets.slice(0, limit) };

  const caps = snapshot.capabilities
    .map((c) => {
      const hay = `${c.name} ${c.description} ${c.route}`.toLowerCase();
      const score = (hay.includes(q) ? 10 : 0) + q.split(/\s+/).filter((t) => hay.includes(t)).length;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);

  const posts = snapshot.snippets
    .map((p) => {
      const hay = `${p.title} ${p.summary} ${p.slug}`.toLowerCase();
      const score = (hay.includes(q) ? 10 : 0) + q.split(/\s+/).filter((t) => hay.includes(t)).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);

  return { caps, posts };
}
