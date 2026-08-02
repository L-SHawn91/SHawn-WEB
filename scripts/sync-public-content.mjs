#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const forbiddenPattern = new RegExp([['ge', 'mini'].join(''), ['sonol', 'bot'].join('')].join('|'), 'i');
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.jsx', '.md', '.mdx', '.mjs', '.ts', '.tsx', '.txt', '.yml', '.yaml']);

function run(label, command) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(`\n${label} failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n${label} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

function walk(dir, matches = []) {
  if (!fs.existsSync(dir)) return matches;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, matches);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!textExtensions.has(ext)) continue;
    const text = fs.readFileSync(full, 'utf8');
    text.split(/\r?\n/).forEach((line, index) => {
      if (forbiddenPattern.test(line)) matches.push(`${full}:${index + 1}:${line}`);
    });
  }
  return matches;
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shawn-public-sync-'));
try {
  const tempPosts = path.join(tempRoot, 'posts');
  const tempManifest = path.join(tempRoot, 'wordpress-sync-manifest.json');
  run('wordpress:preflight-temp-sync', ['node', 'scripts/sync-wordpress-public-posts.mjs', '--out', tempPosts, '--manifest', tempManifest]);
  const preflightMatches = walk(tempRoot);
  if (preflightMatches.length) {
    console.error('\nwordpress preflight blocked forbidden terms:');
    console.error(preflightMatches.join('\n'));
    process.exit(1);
  }

  const steps = [
    ['wordpress-public-sync:test', ['node', 'scripts/test-wordpress-public-sync.mjs']],
    ['shide-blog-packages:test', ['node', 'scripts/test-shide-blog-sync.mjs']],
    ['invest-public-safety:test', ['node', 'scripts/test-invest-public-safety.mjs']],
    ['forbidden-terms:precheck', ['node', 'scripts/enforce-forbidden-terms.mjs']],
    ['wordpress:sync', ['node', 'scripts/sync-wordpress-public-posts.mjs']],
    ['reports:sync-index', ['node', 'scripts/sync-reports-index.mjs']],
    ['forbidden-terms:postcheck', ['node', 'scripts/enforce-forbidden-terms.mjs']],
  ];

  for (const [label, command] of steps) run(label, command);
  console.log('\npublic content sync complete');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
