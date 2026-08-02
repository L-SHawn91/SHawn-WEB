#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const WP_SITES = [
  {
    site: 'shawnaiintelligence.wordpress.com',
    category: 'AI Notes',
    lane: 'ai',
    slugPrefix: 'shide-ai',
    tags: ['AI', 'Tools', 'Field Notes'],
    sourceLabel: 'SHawn AI Notes WordPress',
  },
  {
    site: 'shawnbiohub.wordpress.com',
    category: 'Bio Notes',
    lane: 'bio',
    slugPrefix: 'shide-bio',
    tags: ['Bio', 'Science', 'Evidence'],
    sourceLabel: 'SHawn Bio WordPress',
  },
  {
    site: 'shawnassets.wordpress.com',
    category: 'Asset Signals',
    lane: 'assets',
    slugPrefix: 'shide-assets',
    tags: ['Assets', 'Market Signals', 'Education'],
    sourceLabel: 'SHawn Assets WordPress',
  },
];

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'content/posts');
const DEFAULT_MANIFEST_PATH = path.resolve(process.cwd(), 'content/wordpress-sync-manifest.json');
const USER_AGENT = 'SHawn-WEB public WordPress sync (read-only import)';
const FORBIDDEN_REPLACEMENTS = new Map([
  [['ge', 'mini'].join(''), 'Google AI'],
  [['sonol', 'bot'].join(''), 'automation bot'],
]);
const FORBIDDEN_PATTERN = new RegExp([...FORBIDDEN_REPLACEMENTS.keys()].join('|'), 'gi');

function decodeHtml(input = '') {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™',
  };
  return String(input)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, key) => Object.prototype.hasOwnProperty.call(named, key) ? named[key] : m);
}

function sanitizePublicText(value = '') {
  return decodeHtml(value)
    .replace(FORBIDDEN_PATTERN, (match) => FORBIDDEN_REPLACEMENTS.get(match.toLowerCase()) || 'public AI')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/구글\s+Google AI/g, '구글 AI')
    .replace(/Google\s+Google AI/g, 'Google AI')
    .trim();
}

function sanitizePublicUrl(value = '') {
  const url = String(value || '').trim();
  FORBIDDEN_PATTERN.lastIndex = 0;
  if (!url || FORBIDDEN_PATTERN.test(url)) return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function slugify(input = '') {
  const slug = sanitizePublicText(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || 'untitled';
}

function yaml(value) {
  return JSON.stringify(value ?? '');
}

function normalizeForMatch(value = '') {
  return sanitizePublicText(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function embeddedTermNames(post) {
  const groups = post?._embedded?.['wp:term'];
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) => Array.isArray(group) ? group : [])
    .map((term) => sanitizePublicText(term?.name || '').toLowerCase())
    .filter(Boolean);
}

function inferAssetPostKind(post, siteConfig) {
  if (siteConfig.category !== 'Asset Signals') return '';
  const terms = embeddedTermNames(post);
  if (terms.includes('explainers')) return 'explainer';

  const signalTerms = [
    /market signals?/, /시장 신호/, /intraday report/, /asset signal board/,
    /market check/, /pre-open/, /close-review/, /live board/,
  ];
  if (terms.some((term) => signalTerms.some((pattern) => pattern.test(term)))) return 'signal';

  const text = `${post.slug || ''} ${sanitizePublicText(post.title?.rendered || '')}`.toLowerCase();
  const fallbackPatterns = [
    /market[- ](?:signal|check|note|routine|close|open)/,
    /(?:pre[- ]?open|first[- ]hour|live[- ]revision)/,
    /(?:한국장|미국장|장전|개장|마감|시장\s*신호|시장\s*점검)/,
    /(?:kospi|korea market|us market).*(?:signal|check|note|open|close)/,
  ];
  return fallbackPatterns.some((pattern) => pattern.test(text)) ? 'signal' : 'explainer';
}

function excerptFrom(post, markdown) {
  const explicit = stripTags(post?.excerpt?.rendered || '');
  if (explicit) return explicit.length > 180 ? `${explicit.slice(0, 177)}...` : explicit;
  const plain = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`>#|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 180 ? `${plain.slice(0, 177)}...` : plain;
}

function escapeMdxText(value = '') {
  return String(value)
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/</g, '&lt;');
}

function htmlToMarkdown(html = '') {
  let text = String(html || '')
    .replace(/\r/g, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<figure[^>]*>/gi, '\n\n')
    .replace(/<\/figure>/gi, '\n\n')
    .replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, (_, inner) => `\n_${stripTags(inner)}_\n`)
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, inner) => `\n# ${stripTags(inner)}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => `\n## ${stripTags(inner)}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => `\n### ${stripTags(inner)}\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, inner) => `\n#### ${stripTags(inner)}\n`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => `\n> ${stripTags(inner)}\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `\n- ${stripTags(inner)}`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
    .replace(/<img[^>]+alt=["']([^"']*)["'][^>]+src=["']([^"']+)["'][^>]*>/gi, (_, alt, src) => {
      const safeSrc = sanitizePublicUrl(src);
      return safeSrc ? `\n\n![${sanitizePublicText(alt)}](${safeSrc})\n\n` : '';
    })
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, (_, src, alt) => {
      const safeSrc = sanitizePublicUrl(src);
      return safeSrc ? `\n\n![${sanitizePublicText(alt)}](${safeSrc})\n\n` : '';
    })
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
      const safeSrc = sanitizePublicUrl(src);
      return safeSrc ? `\n\n![](${safeSrc})\n\n` : '';
    })
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
      const label = stripTags(inner);
      const safeHref = sanitizePublicUrl(href);
      if (!safeHref) return label;
      if (!label) return safeHref;
      return `[${label}](${safeHref})`;
    })
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<div[^>]*>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n\n')
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<strong[^>]*>|<\/strong>|<b[^>]*>|<\/b>/gi, '**')
    .replace(/<em[^>]*>|<\/em>|<i[^>]*>|<\/i>/gi, '*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => `\`${stripTags(inner)}\``)
    .replace(/<[^>]+>/g, ' ');

  text = escapeMdxText(sanitizePublicText(text))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^#\s+.+\n+/, '')
    .trim();
  return text || '_본문을 WordPress 원문에서 확인하세요._';
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  const text = await res.text();
  return { data: JSON.parse(text), total: Number(res.headers.get('x-wp-total') || '0') || null, totalPages: Number(res.headers.get('x-wp-totalpages') || '1') || 1 };
}

async function fetchAllPosts(site) {
  const posts = [];
  let page = 1;
  let total = null;
  let totalPages = 1;
  do {
    const url = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(site)}/posts?per_page=100&page=${page}&_embed=wp:term,wp:featuredmedia`;
    const result = await fetchJson(url);
    total = result.total;
    totalPages = result.totalPages;
    posts.push(...result.data);
    page += 1;
  } while (page <= totalPages);
  return { posts, total: total ?? posts.length };
}

function featuredImageFrom(post) {
  const featured = post?._embedded?.['wp:featuredmedia'];
  const mediaUrl = Array.isArray(featured) ? featured[0]?.source_url : '';
  const safeMediaUrl = sanitizePublicUrl(mediaUrl);
  if (safeMediaUrl) return safeMediaUrl;
  const firstImage = String(post?.content?.rendered || '').match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
  return sanitizePublicUrl(firstImage);
}

function hostFromUrl(value = '') {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function readExistingPosts(outputDir) {
  const entries = [];
  if (!fs.existsSync(outputDir)) return entries;
  for (const name of fs.readdirSync(outputDir)) {
    if (!name.endsWith('.mdx')) continue;
    const filePath = path.join(outputDir, name);
    const text = fs.readFileSync(filePath, 'utf8');
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    const get = (key) => frontmatter?.[1]?.match(new RegExp(`^${key}:\\s*"([^"]*)"`, 'm'))?.[1] || '';
    const title = get('title');
    const sourceUrl = get('sourceUrl');
    const wordpressSite = get('wordpressSite') || hostFromUrl(sourceUrl);
    const wordpressId = get('wordpressId');
    entries.push({
      filePath,
      fileName: name,
      slug: name.replace(/\.mdx$/, ''),
      title,
      sourceUrl,
      wordpressSite,
      wordpressId,
      normalizedTitle: normalizeForMatch(title),
    });
  }
  return entries;
}

function targetForPost(post, siteConfig, existing, usedTargets, outputDir = DEFAULT_OUTPUT_DIR) {
  const sourceUrl = sanitizePublicUrl(post.link || post.guid?.rendered || '');
  const title = sanitizePublicText(post.title?.rendered || post.slug || 'Untitled');
  const postId = String(post.id || '');
  const normalizedTitle = normalizeForMatch(title);
  const sameSiteEntries = existing.filter((entry) => entry.wordpressSite === siteConfig.site);
  const byId = postId ? sameSiteEntries.find((entry) => entry.wordpressId === postId) : null;
  if (byId) return byId.filePath;
  const bySource = sourceUrl ? sameSiteEntries.find((entry) => entry.sourceUrl === sourceUrl) : null;
  if (bySource) return bySource.filePath;
  const byTitle = sameSiteEntries.find((entry) => entry.normalizedTitle && entry.normalizedTitle === normalizedTitle);
  if (byTitle) return byTitle.filePath;
  const postSlug = slugify(post.slug || title);
  const datePart = String(post.date || '').slice(0, 10).replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let base = `${siteConfig.slugPrefix}-${datePart}-${postSlug}`;
  const byExactSlug = sameSiteEntries.find((entry) => {
    const canReuse = !entry.wordpressId || entry.wordpressId === postId;
    const slugMatches = entry.slug === base || (/^.+-\d+$/.test(entry.slug) && entry.slug.replace(/-\d+$/, '') === base);
    return canReuse && slugMatches;
  });
  if (byExactSlug) return byExactSlug.filePath;
  let candidate = path.join(outputDir, `${base}.mdx`);
  let suffix = 2;
  while (fs.existsSync(candidate) || usedTargets.has(candidate)) {
    candidate = path.join(outputDir, `${base}-${suffix}.mdx`);
    suffix += 1;
  }
  return candidate;
}

function cleanImportedMarkdown(markdown, { title, description, image }) {
  const normalize = (value) => String(value || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const titleKey = normalize(title);
  let text = markdown.replace(/^#\s+(.+)$/m, (match, heading) => {
    return normalize(heading) === titleKey ? '' : `## ${heading}`;
  });

  if (image) {
    let removedHero = false;
    text = text.replace(/\[?!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)\]?(?:\((https?:\/\/[^)\s]+)\))?/g, (match, src) => {
      if (!removedHero && sanitizePublicUrl(src) === image) {
        removedHero = true;
        return '';
      }
      return match;
    });
  }

  const descriptionKey = normalize(description).replace(/(?:\.\.\.|…)+$/, '').trim();
  let removedSummary = false;
  text = text
    .split(/\n{2,}/)
    .filter((block) => {
      if (removedSummary || descriptionKey.length < 60) return true;
      const blockKey = normalize(block);
      if (blockKey.length < 60) return true;
      const duplicatesDescription = blockKey.startsWith(descriptionKey) || descriptionKey.startsWith(blockKey);
      if (!duplicatesDescription) return true;
      removedSummary = true;
      return false;
    })
    .join('\n\n');

  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function renderPost(post, siteConfig) {
  const title = sanitizePublicText(post.title?.rendered || post.slug || 'Untitled');
  const rawMarkdown = htmlToMarkdown(post.content?.rendered || '');
  const desc = sanitizePublicText(excerptFrom(post, rawMarkdown));
  const date = String(post.date || post.modified || new Date().toISOString()).slice(0, 10);
  const sourceUrl = sanitizePublicUrl(post.link || '');
  const image = featuredImageFrom(post);
  const markdown = cleanImportedMarkdown(rawMarkdown, { title, description: desc, image });
  const tags = [...siteConfig.tags, siteConfig.lane];
  const kind = inferAssetPostKind(post, siteConfig);
  const kindLine = kind ? `kind: ${yaml(kind)}\n` : '';
  const sourceLine = sourceUrl ? `\n> 원문 링크: [WordPress 원문](${sourceUrl})\n\n` : '\n';
  const canonicalNotice = siteConfig.site === 'shawnassets.wordpress.com'
    ? '> 공개 시장 해설용 글입니다. 투자 조언이 아닙니다.\n\n'
    : '';
  return `---\ntitle: ${yaml(title)}\ndate: ${yaml(date)}\ndescription: ${yaml(desc)}\ncategory: ${yaml(siteConfig.category)}\n${kindLine}tags: ${JSON.stringify(tags)}\nfeatured: false\nimage: ${yaml(image)}\nsource: ${yaml(siteConfig.sourceLabel)}\nsourceUrl: ${yaml(sourceUrl)}\nwordpressStatus: ${yaml(post.status || 'publish')}\nwordpressSite: ${yaml(siteConfig.site)}\nwordpressId: ${yaml(String(post.id || ''))}\n---\n${sourceLine}${canonicalNotice}${markdown}\n`;
}

function parseArgs(argv) {
  const options = { outputDir: DEFAULT_OUTPUT_DIR, manifestPath: DEFAULT_MANIFEST_PATH, fixturePath: '', dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') options.outputDir = path.resolve(argv[++i]);
    else if (arg === '--manifest') options.manifestPath = path.resolve(argv[++i]);
    else if (arg === '--fixture') options.fixturePath = path.resolve(argv[++i]);
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log('Usage: node scripts/sync-wordpress-public-posts.mjs [--dry-run] [--out content/posts] [--manifest content/wordpress-sync-manifest.json] [--fixture fixture.json]');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = options.outputDir;
  if (!options.dryRun) fs.mkdirSync(outputDir, { recursive: true });

  const fixture = options.fixturePath
    ? JSON.parse(fs.readFileSync(options.fixturePath, 'utf8'))
    : null;
  const existing = readExistingPosts(outputDir);
  const activeTargets = new Set();
  const generatedAt = new Date().toISOString();
  const manifest = {
    schema_version: 'shawn_web.wordpress_sync.v2',
    generated_at: generatedAt,
    mode: options.dryRun ? 'dry-run' : 'write',
    sources: [],
    totals: { remote: 0, scanned: 0, unchanged: 0, updated: 0, created: 0, removed: 0, changed: 0 },
  };

  for (const siteConfig of WP_SITES) {
    const fixturePosts = fixture?.sites?.[siteConfig.site];
    if (fixture && !Array.isArray(fixturePosts)) {
      throw new Error(`Fixture is missing site: ${siteConfig.site}`);
    }
    const { posts, total } = fixture
      ? { posts: fixturePosts, total: fixturePosts.length }
      : await fetchAllPosts(siteConfig.site);
    if (!Array.isArray(posts) || posts.length !== total) {
      throw new Error(`Incomplete WordPress fetch for ${siteConfig.site}: fetched=${posts?.length ?? 0}, remote_total=${total}`);
    }

    const sourceRecord = {
      site: siteConfig.site,
      remote_total: total,
      fetched: posts.length,
      scanned: 0,
      unchanged: 0,
      updated: 0,
      created: 0,
      removed: 0,
      items: [],
    };
    for (const post of posts) {
      if (post.status && post.status !== 'publish') continue;
      const targetPath = targetForPost(post, siteConfig, existing, activeTargets, outputDir);
      activeTargets.add(targetPath);
      const existed = fs.existsSync(targetPath);
      const content = renderPost(post, siteConfig);
      const previous = existed ? fs.readFileSync(targetPath, 'utf8') : '';
      const mode = !existed ? 'created' : previous === content ? 'unchanged' : 'updated';
      if (!options.dryRun && mode !== 'unchanged') fs.writeFileSync(targetPath, content, 'utf8');
      sourceRecord.scanned += 1;
      sourceRecord[mode] += 1;
      sourceRecord.items.push({
        id: post.id,
        title: sanitizePublicText(post.title?.rendered || post.slug),
        link: sanitizePublicUrl(post.link || ''),
        target: path.relative(process.cwd(), targetPath),
        mode,
      });
    }
    manifest.sources.push(sourceRecord);
    manifest.totals.remote += total;
    manifest.totals.scanned += sourceRecord.scanned;
    manifest.totals.unchanged += sourceRecord.unchanged;
    manifest.totals.updated += sourceRecord.updated;
    manifest.totals.created += sourceRecord.created;
  }

  const configuredSites = new Set(WP_SITES.map(({ site }) => site));
  const sourceRecords = new Map(manifest.sources.map((source) => [source.site, source]));
  for (const entry of existing) {
    if (!configuredSites.has(entry.wordpressSite) || activeTargets.has(entry.filePath)) continue;
    const sourceRecord = sourceRecords.get(entry.wordpressSite);
    if (!sourceRecord) continue;
    if (!options.dryRun) fs.rmSync(entry.filePath, { force: true });
    sourceRecord.removed += 1;
    sourceRecord.items.push({
      id: entry.wordpressId,
      title: entry.title,
      link: entry.sourceUrl,
      target: path.relative(process.cwd(), entry.filePath),
      mode: 'removed',
    });
    manifest.totals.removed += 1;
  }

  manifest.totals.changed = manifest.totals.updated + manifest.totals.created + manifest.totals.removed;
  const existingManifest = fs.existsSync(options.manifestPath)
    ? fs.readFileSync(options.manifestPath, 'utf8')
    : '';
  const existingSchema = existingManifest.match(/"schema_version"\s*:\s*"([^"]+)"/)?.[1] || '';
  const manifestNeedsWrite = manifest.totals.changed > 0 || !existingManifest || existingSchema !== manifest.schema_version;
  if (!options.dryRun && manifestNeedsWrite) {
    fs.mkdirSync(path.dirname(options.manifestPath), { recursive: true });
    fs.writeFileSync(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    checked_at: generatedAt,
    manifest_written: !options.dryRun && manifestNeedsWrite,
    totals: manifest.totals,
    sources: manifest.sources.map(({ site, remote_total, fetched, scanned, unchanged, updated, created, removed }) => ({
      site, remote_total, fetched, scanned, unchanged, updated, created, removed,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
