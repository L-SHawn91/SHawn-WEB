import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  discoverPackages,
  normalizePackage,
  renderMdx,
  syncPackages,
} from './sync-shide-blog-packages.mjs';

function makeFixture({ status = 'publish', lanePath = 'blog__ai__field_notes' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shide-blog-sync-'));
  const articleRoot = path.join(root, lanePath, 'articles', '20260702_example_article');
  fs.mkdirSync(path.join(articleRoot, '30_text'), { recursive: true });
  fs.mkdirSync(path.join(articleRoot, '20_images'), { recursive: true });
  fs.writeFileSync(
    path.join(articleRoot, '30_text', 'article_draft.md'),
    '# Example Title\n\n> Status: internal draft note\n> Blog: SHawn AI Notes\n\n첫 문단 설명입니다. 충분히 읽기 좋습니다.\n\n## 본문\n\n내용입니다.\n',
    'utf8',
  );
  fs.writeFileSync(path.join(articleRoot, '20_images', 'hero.png'), 'fake-png', 'utf8');
  fs.writeFileSync(path.join(articleRoot, '20_images', 'support chart.webp'), 'fake-webp', 'utf8');
  fs.writeFileSync(path.join(articleRoot, '20_images', 'live_wordpress_post.png'), 'fake-screenshot', 'utf8');
  fs.writeFileSync(path.join(articleRoot, '20_images', 'web_preview_top.png'), 'fake-screenshot', 'utf8');
  fs.writeFileSync(
    path.join(articleRoot, 'MANIFEST.json'),
    JSON.stringify(
      {
        updated: '2026-07-02T18:01:39',
        canonical_root: articleRoot,
        wordpress_post: {
          id: 47,
          status,
          url: 'https://example.wordpress.com/2026/07/02/example/',
          visual_title: 'Visual Example Title',
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  return { root, articleRoot, manifestPath: path.join(articleRoot, 'MANIFEST.json') };
}

{
  const { root, manifestPath } = makeFixture();
  const packages = discoverPackages(root);
  assert.equal(packages.length, 1);
  assert.equal(packages[0], manifestPath);
}

{
  const { manifestPath } = makeFixture();
  const pkg = normalizePackage(manifestPath, { includeDrafts: false });
  assert.equal(pkg.slug, 'shide-ai-20260702-example-article');
  assert.equal(pkg.category, 'SHide AI');
  assert.equal(pkg.title, 'Visual Example Title');
  assert.equal(pkg.sourceUrl, 'https://example.wordpress.com/2026/07/02/example/');
  assert.equal(pkg.eligible, true);
  assert.equal(pkg.assets.length, 2);
  assert.equal(pkg.assets[0].publicPath, '/shide-blog-assets/shide-ai-20260702-example-article/image-01.webp');
  assert.equal(pkg.assets[1].publicPath, '/shide-blog-assets/shide-ai-20260702-example-article/image-02.webp');
  assert.match(pkg.description, /첫 문단 설명/);
}

{
  const { manifestPath } = makeFixture({ status: 'draft' });
  const pkg = normalizePackage(manifestPath, { includeDrafts: false });
  assert.equal(pkg.eligible, false);
  assert.equal(pkg.skipReason, 'wordpress_status_not_publish');
}

{
  const { manifestPath } = makeFixture();
  const pkg = normalizePackage(manifestPath, { includeDrafts: false });
  const mdx = renderMdx(pkg);
  assert.match(mdx, /title: "Visual Example Title"/);
  assert.match(mdx, /category: "SHide AI"/);
  assert.match(mdx, /sourceUrl: "https:\/\/example\.wordpress\.com\/2026\/07\/02\/example\/"/);
  assert.doesNotMatch(mdx, /^# Example Title/m, 'first markdown H1 should be stripped to avoid duplicate title');
  assert.doesNotMatch(mdx, /Status: internal draft note/, 'internal status block should not be published');
  assert.doesNotMatch(mdx, /Blog: SHawn AI Notes/, 'internal blog-routing block should not be published');
  assert.match(mdx, /image: "\/shide-blog-assets\/shide-ai-20260702-example-article\/image-01\.webp"/);
  assert.match(mdx, /## 이미지 자료/);
  assert.match(mdx, /!\[Visual Example Title image 1\]\(\/shide-blog-assets\/shide-ai-20260702-example-article\/image-01\.webp\)/);
  assert.match(mdx, /!\[Visual Example Title image 2\]\(\/shide-blog-assets\/shide-ai-20260702-example-article\/image-02\.webp\)/);
  assert.match(mdx, /원문 링크/);
}

{
  const blockedName = ['Ge', 'mini'].join('');
  const blockedPattern = new RegExp(blockedName, 'i');
  const { articleRoot, manifestPath } = makeFixture();
  fs.writeFileSync(
    path.join(articleRoot, '30_text', 'article_draft.md'),
    `# ${blockedName} Example\n\n${blockedName} can operate a browser.\n`,
    'utf8',
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.wordpress_post.visual_title = `${blockedName} browser workflow`;
  manifest.wordpress_post.url = `https://example.wordpress.com/${blockedName.toLowerCase()}-browser-workflow/`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  const pkg = normalizePackage(manifestPath, { includeDrafts: false });
  assert.doesNotMatch(pkg.slug, blockedPattern);
  const mdx = renderMdx(pkg);
  assert.doesNotMatch(mdx, blockedPattern, 'SHawn-WEB public sync should sanitize repo-forbidden terms');
  assert.match(mdx, /Google AI browser workflow/);
  assert.doesNotMatch(mdx, new RegExp(`sourceUrl: "https:\\\\/\\\\/example\\\\.wordpress\\\\.com\\\\/${blockedName.toLowerCase()}-browser-workflow\\\\/`));
}

{
  const { root } = makeFixture();
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-out-'));
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-assets-'));
  const result = syncPackages({ sourceRoot: root, outputDir: outDir, assetsDir, includeDrafts: false, dryRun: false });
  assert.equal(result.written.length, 1);
  assert.equal(result.skipped.length, 0);
  assert.equal(result.written[0].assets.length, 2);
  assert.ok(fs.existsSync(path.join(outDir, 'shide-ai-20260702-example-article.mdx')));
  assert.ok(fs.existsSync(path.join(assetsDir, 'shide-ai-20260702-example-article', 'image-01.webp')));
  assert.ok(fs.existsSync(path.join(assetsDir, 'shide-ai-20260702-example-article', 'image-02.webp')));
}

console.log('blog sync tests passed');
