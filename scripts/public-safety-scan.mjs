#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const hardFail = [
  'ghp_[A-Za-z0-9_]+',
  'github_pat_[A-Za-z0-9_]+',
  '(^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}',
  'OPENAI_API_KEY=',
  'ANTHROPIC_API_KEY=',
  'BEGIN RSA PRIVATE KEY',
  'BEGIN OPENSSH PRIVATE KEY',
  '(^|[\\s"\'=:/])/(Users|home)/[^\\s"\'`<>]+',
  'CloudStorage',
  'OneDrive',
  'GDrive',
  'Google Drive',
  'corpus\\.db',
  '\\.sqlite',
  '\\.duckdb',
].join('|');

const args = [
  '-n',
  '--hidden',
  '-S',
  hardFail,
  '.',
  '-g', '!.git/**',
  '-g', '!.next/**',
  '-g', '!node_modules/**',
  '-g', '!public/shide-blog-assets/**',
  '-g', '!scripts/public-safety-scan.mjs',
  '-g', '!.env.example',
  '-g', '!.gitignore',
  '-g', '!scripts/check-search-ontology.mjs',
];

try {
  execFileSync('rg', args, { stdio: 'inherit' });
  console.error('Public safety scan found hard-fail matches.');
  process.exit(1);
} catch (error) {
  if (error.status === 1) {
    console.log('Public safety scan passed.');
    process.exit(0);
  }
  throw error;
}
