#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

if (!process.execArgv.includes('--experimental-strip-types')) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

const utilPath = 'lib/blog-studio.ts';
const adminPagePath = 'app/admin/blog/page.tsx';
const adminClientPath = 'components/admin/blog-studio-client.tsx';
const publishRoutePath = 'app/api/admin/blog/publish/route.ts';

const adminRootPath = 'app/admin/page.tsx';

for (const file of [utilPath, adminPagePath, adminClientPath, adminRootPath, publishRoutePath]) {
  assert.ok(fs.existsSync(file), `${file} should exist`);
}

const mod = await import(pathToFileURL(`${process.cwd()}/${utilPath}`).href);

assert.equal(mod.toBlogSlug('  AI가 채팅창 밖으로 2026!  '), 'ai-2026', 'slug should strip non-url chars and collapse');

const payload = mod.normalizeBlogStudioPayload({
  title: 'SHawn-WEB에서 직접 쓰는 블로그',
  slug: 'shawn web editor!!',
  description: 'WordPress-like editor test',
  category: 'AI Notes',
  tags: [' AI ', 'Blog', '', 'AI'],
  body: '# 본문\n\n이미지는 원본 복사가 아니라 변환본으로 들어가야 한다.',
  media: [
    {
      fileName: 'hero.webp',
      mimeType: 'image/webp',
      dataBase64: Buffer.from('fake-webp').toString('base64'),
      alt: 'Hero visual',
      role: 'hero',
      caption: 'Hero caption',
    },
    {
      fileName: 'support.webp',
      mimeType: 'image/webp',
      dataBase64: Buffer.from('support').toString('base64'),
      alt: 'Support visual',
      role: 'inline',
      caption: 'Support caption',
    },
  ],
});

assert.equal(payload.slug, 'shawn-web-editor');
assert.deepEqual(payload.tags, ['AI', 'Blog']);
assert.equal(payload.media[0].publicPath, '/blog-assets/shawn-web-editor/hero.webp');
assert.equal(payload.heroImage, '/blog-assets/shawn-web-editor/hero.webp');

const files = mod.buildBlogStudioFiles(payload);
const paths = files.map((file) => file.path).sort();
assert.deepEqual(paths, [
  'content/posts/shawn-web-editor.mdx',
  'public/blog-assets/shawn-web-editor/hero.webp',
  'public/blog-assets/shawn-web-editor/support.webp',
]);

const mdx = files.find((file) => file.path.endsWith('.mdx'))?.content;
assert.ok(mdx.includes('image: "/blog-assets/shawn-web-editor/hero.webp"'), 'frontmatter should point to processed hero image');
assert.ok(mdx.includes('![Support visual](/blog-assets/shawn-web-editor/support.webp)'), 'inline media should be inserted in body');
assert.ok(!mdx.includes('data:image'), 'MDX should not embed raw data URLs');

const adminPage = fs.readFileSync(adminPagePath, 'utf8');
const adminClient = fs.readFileSync(adminClientPath, 'utf8');
assert.match(adminPage, /getAuthenticatedAdminUserId/, 'admin page should be protected server-side before rendering the editor');
assert.match(adminPage, /BlogStudioClient/, 'admin page should render the client editor only after auth');
assert.match(adminClient, /SHawn Blog Studio/, 'admin client should expose SHawn Blog Studio');
assert.match(adminClient, /prepareImageForPublish/, 'admin client should resize/convert images before publish');
assert.match(adminClient, /\/api\/admin\/blog\/publish/, 'admin client should publish through the durable publish API');
assert.doesNotMatch(adminClient, /즉시 게시/, 'admin client should not promise local immediate filesystem publish');

const publishRoute = fs.readFileSync(publishRoutePath, 'utf8');
assert.match(publishRoute, /getAuthenticatedAdminUserId/, 'publish route should require admin auth');
assert.match(publishRoute, /BLOG_PUBLISH_GITHUB_TOKEN/, 'publish route should use GitHub publish token for durable writes');
assert.match(publishRoute, /dryRun/, 'publish route should support dry-run validation');

console.log('blog studio tests passed');
