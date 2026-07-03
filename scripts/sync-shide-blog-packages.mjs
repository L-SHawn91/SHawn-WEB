#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_SOURCE_ROOT = process.env.SHIDE_BLOG_SOURCE_ROOT || path.resolve(process.cwd(), 'content/import-packages');
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'content/posts');
const DEFAULT_ASSETS_DIR = path.resolve(process.cwd(), 'public/shide-blog-assets');
const ASSET_BASE_PATH = '/shide-blog-assets';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const OPTIMIZABLE_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const BLOCKED_MODEL_NAME = ['ge', 'mini'].join('');
const BLOCKED_BOT_NAME = ['sonol', 'bot'].join('');
const PUBLIC_REPLACEMENTS = new Map([
  [BLOCKED_MODEL_NAME, 'Google AI'],
  [BLOCKED_BOT_NAME, 'automation bot'],
]);
const PUBLIC_FORBIDDEN_PATTERN = new RegExp([...PUBLIC_REPLACEMENTS.keys()].join('|'), 'gi');

function walk(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, results);
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

export function discoverPackages(sourceRoot = DEFAULT_SOURCE_ROOT) {
  return walk(sourceRoot, (filePath) => path.basename(filePath) === 'MANIFEST.json')
    .filter((filePath) => filePath.includes(`${path.sep}articles${path.sep}`))
    .sort((a, b) => a.localeCompare(b));
}

export function slugify(input) {
  const slug = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || 'untitled';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function deriveLane(articleRoot) {
  const normalized = articleRoot.split(path.sep).join('/');
  if (normalized.includes('blog__ai__field_notes')) {
    return { key: 'ai', category: 'AI Notes', slugPrefix: 'shide-ai', tags: ['AI', 'Field Notes', 'Automation'] };
  }
  if (normalized.includes('blog__assets__market_signals')) {
    return { key: 'assets', category: 'Asset Signals', slugPrefix: 'shide-assets', tags: ['Assets', 'Market Signals', 'Education'] };
  }
  if (normalized.includes('blog__bio')) {
    return { key: 'bio', category: 'Bio Notes', slugPrefix: 'shide-bio', tags: ['Bio', 'Evidence', 'Science'] };
  }
  return { key: 'blog', category: 'Public Notes', slugPrefix: 'shide-blog', tags: ['Public Notes'] };
}

function firstExisting(paths) {
  return paths.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function imageSortKey(filePath) {
  const name = path.basename(filePath).toLowerCase();
  let priority = 50;
  if (name.includes('hero') || name.includes('featured')) priority = 0;
  else if (name.includes('visual_title') || name.includes('title_card')) priority = 5;
  else if (name.includes('summary') || name.includes('concept') || name.includes('workflow')) priority = 10;
  else if (name.includes('contact_sheet')) priority = 90;
  return `${String(priority).padStart(3, '0')}::${name}`;
}

function isBlogScreenCaptureAsset(filePath) {
  const name = path.basename(filePath).toLowerCase();
  return [
    'live_wordpress',
    'web_preview',
    'screenshot',
    'screen_capture',
    'browser_capture',
  ].some((marker) => name.includes(marker));
}

function discoverImageAssets(articleRoot, slug) {
  const imageDirs = ['20_images', '20_image']
    .map((dirName) => path.join(articleRoot, dirName))
    .filter((dirPath) => fs.existsSync(dirPath));
  const sourcePaths = imageDirs
    .flatMap((imageDir) => walk(imageDir, (filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())))
    .filter((filePath) => !isBlogScreenCaptureAsset(filePath))
    .sort((a, b) => imageSortKey(a).localeCompare(imageSortKey(b)));

  return sourcePaths.map((sourcePath, index) => {
    const ext = path.extname(sourcePath).toLowerCase() || '.png';
    const publicExt = OPTIMIZABLE_IMAGE_EXTENSIONS.has(ext) ? '.webp' : ext;
    const publicName = `image-${String(index + 1).padStart(2, '0')}${publicExt}`;
    return {
      sourcePath,
      publicPath: `${ASSET_BASE_PATH}/${slug}/${publicName}`,
      fileName: publicName,
    };
  });
}

function copyOrOptimizeImage(sourcePath, targetPath) {
  const ext = path.extname(sourcePath).toLowerCase();
  if (OPTIMIZABLE_IMAGE_EXTENSIONS.has(ext) && path.extname(targetPath).toLowerCase() === '.webp') {
    const result = spawnSync(
      'magick',
      [sourcePath, '-auto-orient', '-resize', '1600x1600>', '-quality', '86', targetPath],
      { encoding: 'utf8' },
    );
    if (result.status === 0 && fs.existsSync(targetPath)) return;
  }
  fs.copyFileSync(sourcePath, targetPath);
}

function copyImageAssets(pkg, assetsDir) {
  const targetDir = path.join(assetsDir, pkg.slug);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  for (const asset of pkg.assets) {
    copyOrOptimizeImage(asset.sourcePath, path.join(targetDir, asset.fileName));
  }
}

function findArticleMarkdown(articleRoot, manifest) {
  const directCandidates = [
    path.join(articleRoot, '30_text', 'article_draft.md'),
    path.join(articleRoot, '30_text_blog', 'article_draft.md'),
  ];
  const direct = firstExisting(directCandidates);
  if (direct) return direct;

  const manifestPaths = Array.isArray(manifest.files)
    ? manifest.files
        .map((entry) => entry?.path || entry?.dest || '')
        .filter((entryPath) => typeof entryPath === 'string' && entryPath.endsWith('.md'))
        .map((entryPath) => (path.isAbsolute(entryPath) ? entryPath : path.join(articleRoot, entryPath)))
    : [];

  const preferredFromManifest = manifestPaths.find((entryPath) => {
    const normalized = entryPath.split(path.sep).join('/');
    return normalized.includes('/30_text/') || normalized.includes('/30_text_blog/');
  });
  if (preferredFromManifest && fs.existsSync(preferredFromManifest)) return preferredFromManifest;

  const markdownFiles = walk(articleRoot, (filePath) => filePath.endsWith('.md'));
  return markdownFiles.find((filePath) => filePath.includes(`${path.sep}30_text`)) || markdownFiles[0] || null;
}

function stripFirstHeading(markdown) {
  return markdown.replace(/^#\s+.+(?:\r?\n)+/, '').trimStart();
}

function stripLeadingInternalNotes(markdown) {
  const lines = markdown.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') index += 1;
  if (!lines[index]?.trim().startsWith('>')) return markdown.trimStart();

  const blockStart = index;
  const noteKeys = /^(status|blog|topic lane|public framing|source base)\s*:/i;
  let sawInternalNote = false;
  while (index < lines.length && (lines[index].trim().startsWith('>') || lines[index].trim() === '')) {
    const text = lines[index].trim().replace(/^>\s?/, '');
    if (noteKeys.test(text)) sawInternalNote = true;
    index += 1;
  }
  if (!sawInternalNote) return markdown.trimStart();
  return lines.slice(0, blockStart).concat(lines.slice(index)).join('\n').trimStart();
}

function extractFirstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[>*_~#|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionFrom(markdown, fallback = '') {
  const withoutTitle = stripLeadingInternalNotes(stripFirstHeading(markdown));
  const paragraph = withoutTitle
    .split(/\n\s*\n/)
    .filter((part) => !part.trimStart().startsWith('#'))
    .map((part) => plainText(part))
    .find((part) => part && part.length > 20);
  const desc = paragraph || fallback || '';
  return desc.length > 180 ? `${desc.slice(0, 177)}...` : desc;
}

function dateFrom(articleRoot, manifest) {
  const base = path.basename(articleRoot);
  const dateMatch = base.match(/(20\d{6})/);
  if (dateMatch) {
    const raw = dateMatch[1];
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  const rawDate = manifest.updated || manifest.timestamp || new Date().toISOString();
  return new Date(rawDate).toISOString().slice(0, 10);
}

function yamlValue(value) {
  return JSON.stringify(value ?? '');
}

function sanitizePublicText(value) {
  return String(value ?? '')
    .replace(PUBLIC_FORBIDDEN_PATTERN, (match) => {
      return PUBLIC_REPLACEMENTS.get(match.toLowerCase()) || 'public AI';
    })
    .replace(/구글\s+Google AI/g, '구글 AI')
    .replace(/Google\s+Google AI/g, 'Google AI');
}

function sanitizePublicUrl(value) {
  const url = String(value || '');
  PUBLIC_FORBIDDEN_PATTERN.lastIndex = 0;
  return PUBLIC_FORBIDDEN_PATTERN.test(url) ? '' : url;
}

function isEligible(manifest, includeDrafts) {
  if (includeDrafts) return { eligible: true, skipReason: null };
  const wpStatus = manifest?.wordpress_post?.status;
  if (wpStatus) {
    return wpStatus === 'publish'
      ? { eligible: true, skipReason: null }
      : { eligible: false, skipReason: 'wordpress_status_not_publish' };
  }
  if (manifest?.web_publish === true || ['approved', 'published'].includes(String(manifest?.status || '').toLowerCase())) {
    return { eligible: true, skipReason: null };
  }
  return { eligible: false, skipReason: 'no_public_publish_marker' };
}

export function normalizePackage(manifestPath, options = {}) {
  const includeDrafts = Boolean(options.includeDrafts);
  const manifest = readJson(manifestPath);
  const declaredRoot = manifest.canonical_root || manifest.canonical_workspace || path.dirname(manifestPath);
  const articleRoot = fs.existsSync(declaredRoot) ? declaredRoot : path.dirname(manifestPath);
  const markdownPath = findArticleMarkdown(articleRoot, manifest);
  const lane = deriveLane(articleRoot);
  const articleId = path.basename(articleRoot);
  const markdown = markdownPath ? fs.readFileSync(markdownPath, 'utf8') : '';
  const markdownTitle = extractFirstHeading(markdown);
  const title = manifest?.wordpress_post?.visual_title || manifest?.title || markdownTitle || articleId;
  const sourceUrl = sanitizePublicUrl(manifest?.wordpress_post?.url || manifest?.source_url || '');
  const eligibility = isEligible(manifest, includeDrafts);
  const baseSlug = slugify(articleId.replace(/^\d{8}_?/, ''));
  const slug = `${lane.slugPrefix}-${slugify(sanitizePublicText(articleId)) || baseSlug}`;
  const assets = discoverImageAssets(articleRoot, slug);

  return {
    manifestPath,
    articleRoot,
    markdownPath,
    manifest,
    lane: lane.key,
    category: lane.category,
    tags: lane.tags,
    slug,
    title: sanitizePublicText(title),
    date: dateFrom(articleRoot, manifest),
    description: sanitizePublicText(descriptionFrom(markdown, manifest?.wordpress_post?.visual_title || '')),
    content: sanitizePublicText(stripLeadingInternalNotes(stripFirstHeading(markdown))),
    assets,
    sourceUrl,
    wordpressStatus: manifest?.wordpress_post?.status || null,
    eligible: eligibility.eligible && Boolean(markdownPath),
    skipReason: markdownPath ? eligibility.skipReason : 'missing_article_markdown',
  };
}

function renderInlineImage(asset, title, visualIndex) {
  return `![${title} visual ${visualIndex}](${asset.publicPath})`;
}

function distributeInlineImages(markdown, assets, title) {
  const body = String(markdown || '').trim();
  if (!body || !assets?.length) return body;

  const sections = body.split(/(?=^##\s+)/m).filter((section) => section.trim());
  if (sections.length < 2) {
    return `${body}\n\n${assets.map((asset, index) => renderInlineImage(asset, title, index + 1)).join('\n\n')}`;
  }

  let assetIndex = 0;
  const rendered = sections.map((section) => {
    const trimmed = section.trimEnd();
    if (!trimmed.startsWith('## ') || assetIndex >= assets.length) return trimmed;
    const imageMarkdown = renderInlineImage(assets[assetIndex], title, assetIndex + 1);
    assetIndex += 1;
    return `${trimmed}\n\n${imageMarkdown}`;
  });

  if (assetIndex < assets.length) {
    rendered.push(assets.slice(assetIndex).map((asset, index) => renderInlineImage(asset, title, assetIndex + index + 1)).join('\n\n'));
  }

  return rendered.join('\n\n');
}

export function renderMdx(pkg) {
  const tagMap = new Map();
  for (const tag of [...(pkg.tags || []), pkg.lane].filter(Boolean)) {
    const key = String(tag).toLowerCase();
    if (!tagMap.has(key)) tagMap.set(key, tag);
  }
  const tags = Array.from(tagMap.values());
  const sourceLine = pkg.sourceUrl
    ? `\n> 원문 링크: [WordPress 원문](${pkg.sourceUrl})\n\n`
    : '';
  const imageFrontmatter = pkg.assets?.[0]?.publicPath || '';
  const inlineBody = distributeInlineImages((pkg.content || '').trim(), (pkg.assets || []).slice(1), pkg.title);
  return `---\ntitle: ${yamlValue(pkg.title)}\ndate: ${yamlValue(pkg.date)}\ndescription: ${yamlValue(pkg.description)}\ncategory: ${yamlValue(pkg.category)}\ntags: ${JSON.stringify(tags)}\nfeatured: false\nimage: ${yamlValue(imageFrontmatter)}\nsource: ${yamlValue('WordPress blog package')}\nsourceUrl: ${yamlValue(pkg.sourceUrl)}\nwordpressStatus: ${yamlValue(pkg.wordpressStatus || '')}\n---\n\n${sourceLine}${inlineBody}\n`;
}

export function syncPackages(options = {}) {
  const sourceRoot = options.sourceRoot || DEFAULT_SOURCE_ROOT;
  const outputDir = options.outputDir || DEFAULT_OUTPUT_DIR;
  const assetsDir = options.assetsDir || DEFAULT_ASSETS_DIR;
  const includeDrafts = Boolean(options.includeDrafts);
  const dryRun = Boolean(options.dryRun);
  const manifests = discoverPackages(sourceRoot);
  const written = [];
  const skipped = [];

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  for (const manifestPath of manifests) {
    const pkg = normalizePackage(manifestPath, { includeDrafts });
    if (!pkg.eligible) {
      skipped.push({ manifestPath, reason: pkg.skipReason, title: pkg.title });
      continue;
    }
    const targetPath = path.join(outputDir, `${pkg.slug}.mdx`);
    const content = renderMdx(pkg);
    if (!dryRun) {
      fs.writeFileSync(targetPath, content, 'utf8');
      copyImageAssets(pkg, assetsDir);
    }
    written.push({
      manifestPath,
      targetPath,
      title: pkg.title,
      slug: pkg.slug,
      category: pkg.category,
      sourceUrl: pkg.sourceUrl,
      assets: pkg.assets.map((asset) => asset.publicPath),
    });
  }

  return { sourceRoot, outputDir, assetsDir, includeDrafts, dryRun, discovered: manifests.length, written, skipped };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source') options.sourceRoot = argv[++index];
    else if (arg === '--out') options.outputDir = argv[++index];
    else if (arg === '--assets-out') options.assetsDir = argv[++index];
    else if (arg === '--include-drafts') options.includeDrafts = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/sync-shide-blog-packages.mjs [--source PATH] [--out PATH] [--assets-out PATH] [--dry-run] [--include-drafts]\n\nSync public-ready blog article packages into SHawn-WEB content/posts as MDX and copy package images into public assets.\nDefault source: ${DEFAULT_SOURCE_ROOT}\nDefault output: ${DEFAULT_OUTPUT_DIR}\nDefault assets: ${DEFAULT_ASSETS_DIR}\n\nBy default only published/approved packages are synced. Use --include-drafts only for local preview.`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const result = syncPackages(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
