import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-public-sync-'));
const out = path.join(fixtureRoot, 'posts');
const manifest = path.join(fixtureRoot, 'manifest.json');
const fixturePath = path.join(fixtureRoot, 'fixture.json');
const script = path.resolve('scripts/sync-wordpress-public-posts.mjs');
fs.mkdirSync(out, { recursive: true });

function post(id, site, slug, title) {
  const summary = `${title} summary with enough detail to verify that a duplicated introductory paragraph is removed from the imported article body.`;
  const hero = `https://${site}/wp-content/uploads/2026/07/${slug}-hero.webp`;
  return {
    id,
    status: 'publish',
    slug,
    date: '2026-07-28T00:00:00',
    link: `https://${site}/2026/07/28/${slug}/`,
    title: { rendered: title },
    excerpt: { rendered: `<p>${summary}</p>` },
    content: {
      rendered: `<p>EDITION LABEL</p><h1>${title}</h1><p>${summary}</p><p><img src="${hero}" alt="${title} visual"></p><p>Body <a href="javascript:alert(1)">unsafe link</a>.</p>`,
    },
    _embedded: {
      'wp:term': [[]],
      'wp:featuredmedia': [{ source_url: hero }],
    },
  };
}

const sites = {
  'shawnaiintelligence.wordpress.com': [post(1, 'shawnaiintelligence.wordpress.com', 'ai-fixture', 'AI fixture')],
  'shawnbiohub.wordpress.com': [post(2, 'shawnbiohub.wordpress.com', 'bio-fixture', 'Bio fixture')],
  'shawnassets.wordpress.com': [post(3, 'shawnassets.wordpress.com', 'assets-fixture', 'Assets fixture')],
};

function writeFixture() {
  fs.writeFileSync(fixturePath, `${JSON.stringify({ sites }, null, 2)}\n`, 'utf8');
}

function run(extraArgs = []) {
  const result = spawnSync('node', [script, '--out', out, '--manifest', manifest, '--fixture', fixturePath, ...extraArgs], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function digest(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

try {
  writeFixture();
  const first = run();
  assert.equal(first.totals.remote, 3);
  assert.equal(first.totals.created, 3);
  assert.equal(first.totals.changed, 3);
  assert.equal(first.sources.length, 3);
  assert.equal(first.manifest_written, true);
  const createdFiles = fs.readdirSync(out).filter((name) => name.endsWith('.mdx'));
  assert.equal(createdFiles.length, 3);
  const aiFile = path.join(out, createdFiles.find((name) => name.includes('ai-fixture')));
  const aiContent = fs.readFileSync(aiFile, 'utf8');
  assert.match(aiContent, /^image: "https:\/\/shawnaiintelligence\.wordpress\.com\/wp-content\/uploads\/2026\/07\/ai-fixture-hero\.webp"$/m);
  assert.doesNotMatch(aiContent, /javascript:/i);
  assert.doesNotMatch(aiContent, /^# AI fixture$/m, 'page title must not be repeated as a body H1');
  assert.equal((aiContent.match(/ai-fixture-hero\.webp/g) || []).length, 1, 'featured image must not be duplicated in the body');
  assert.equal((aiContent.match(/AI fixture summary with enough detail/g) || []).length, 1, 'frontmatter description must not be duplicated in the body');

  const firstManifestDigest = digest(manifest);
  const second = run();
  assert.equal(second.totals.changed, 0);
  assert.equal(second.totals.unchanged, 3);
  assert.equal(second.manifest_written, false);
  assert.equal(digest(manifest), firstManifestDigest, 'no-change sync must not churn the manifest');

  sites['shawnaiintelligence.wordpress.com'][0].title.rendered = 'AI fixture updated';
  sites['shawnbiohub.wordpress.com'] = [];
  writeFixture();
  const third = run();
  assert.equal(third.totals.updated, 1);
  assert.equal(third.totals.removed, 1);
  assert.equal(third.totals.changed, 2);
  assert.equal(fs.readdirSync(out).filter((name) => name.endsWith('.mdx')).length, 2);
  assert.equal(JSON.parse(fs.readFileSync(manifest, 'utf8')).schema_version, 'shawn_web.wordpress_sync.v2');

  const dryRunDigest = digest(manifest);
  const dry = run(['--dry-run']);
  assert.equal(dry.manifest_written, false);
  assert.equal(digest(manifest), dryRunDigest, 'dry-run must not rewrite the manifest');

  console.log('wordpress public sync deterministic test passed');
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
