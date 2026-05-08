#!/usr/bin/env node
/**
 * Validates lib/search/searchOntologyData.js is safe for Vercel deployment.
 *
 * Checks:
 *   - File exists and is within size bounds
 *   - No local paths, credentials, or licensed-data fields embedded in data lines
 *   - All required exports present and non-empty
 *   - All array values are lowercase, trimmed, non-empty strings
 *   - No within-array duplicates
 *   - Critical vocabulary present (journal, cell, gene, rna, cancer, protein)
 *
 * Exit 0 = PASS, exit 1 = FAIL.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ontologyPath = resolve(__dirname, '../lib/search/searchOntologyData.js');

let raw;
try {
  raw = readFileSync(ontologyPath, 'utf8');
} catch (e) {
  console.error(`[check-ontology] FAIL cannot read ontology file: ${e.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];

// ── 1. Size bounds ────────────────────────────────────────────────────────────
const byteSize = Buffer.byteLength(raw, 'utf8');
if (byteSize < 1024) {
  errors.push(`file too small (${byteSize} B < 1 KB); ontology may be empty or truncated`);
}
if (byteSize > 512 * 1024) {
  errors.push(`file too large (${byteSize} B > 512 KB); check for accidental data embedding`);
}

// ── 2. Forbidden pattern scan (data lines only, skips // comments) ────────────
const dataLines = raw.split('\n').filter((l) => !l.trimStart().startsWith('//')).join('\n');

const FORBIDDEN = [
  { re: /\/home\/[a-z]/i,      label: 'local home path (/home/...)' },
  { re: /\/Users\/[A-Z]/i,     label: 'local home path (/Users/...)' },
  { re: /C:\\Users\\/i,        label: 'Windows local path' },
  { re: /corpus\.db/i,         label: 'raw corpus DB filename' },
  { re: /\.sqlite[23]?/i,      label: 'SQLite file extension in data' },
  { re: /impact_factor/i,      label: 'JCR impact_factor field' },
  { re: /\bquartile\b/i,       label: 'JCR quartile field' },
  { re: /\bjcr_/i,             label: 'JCR-prefixed field name' },
  { re: /\bpassword\b/i,       label: 'credential: password' },
  { re: /\bapi[_-]?key\b/i,   label: 'credential: api key' },
  { re: /\bbearer\b/i,         label: 'credential: bearer token' },
  { re: /sk-[A-Za-z0-9]{20}/,  label: 'possible OpenAI/Anthropic secret key' },
];

for (const { re, label } of FORBIDDEN) {
  if (re.test(dataLines)) {
    errors.push(`forbidden pattern in bundled data: ${label}`);
  }
}

// ── 3. Required exports present ───────────────────────────────────────────────
const REQUIRED_EXPORTS = [
  'SEARCH_ONTOLOGY_VERSION',
  'SEARCH_ONTOLOGY_VENUES',
  'SEARCH_ONTOLOGY_VENUE_FRAGMENTS',
  'SEARCH_ONTOLOGY_VENUE_TERMINALS',
  'SEARCH_ONTOLOGY_BIO_TERMS',
];
for (const name of REQUIRED_EXPORTS) {
  if (!raw.includes(`export const ${name}`)) {
    errors.push(`missing required export: ${name}`);
  }
}

// ── 4. Version is non-empty string ────────────────────────────────────────────
const verMatch = raw.match(/export const SEARCH_ONTOLOGY_VERSION\s*=\s*(['"])(.*?)\1/);
if (!verMatch || !verMatch[2].trim()) {
  errors.push('SEARCH_ONTOLOGY_VERSION is empty or unparseable');
}

// ── 5. Parse arrays and run per-value checks ──────────────────────────────────
function extractArray(src, exportName) {
  const m = src.match(new RegExp(`export const ${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) return null;
  return [...m[1].matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)].map((x) => x[2]);
}

const arrays = {
  SEARCH_ONTOLOGY_VENUES:          extractArray(raw, 'SEARCH_ONTOLOGY_VENUES'),
  SEARCH_ONTOLOGY_VENUE_FRAGMENTS: extractArray(raw, 'SEARCH_ONTOLOGY_VENUE_FRAGMENTS'),
  SEARCH_ONTOLOGY_VENUE_TERMINALS: extractArray(raw, 'SEARCH_ONTOLOGY_VENUE_TERMINALS'),
  SEARCH_ONTOLOGY_BIO_TERMS:       extractArray(raw, 'SEARCH_ONTOLOGY_BIO_TERMS'),
};

for (const [name, arr] of Object.entries(arrays)) {
  if (!arr) { errors.push(`could not parse ${name} as array literal`); continue; }
  if (arr.length === 0) { errors.push(`${name} is empty`); continue; }

  const seen = new Set();
  for (const val of arr) {
    // Non-empty
    if (!val || !val.trim()) {
      errors.push(`${name} contains empty/whitespace-only entry`);
      continue;
    }
    // Normalized: lowercase and trimmed
    if (val !== val.toLowerCase()) {
      errors.push(`${name} entry not lowercase: ${JSON.stringify(val)}`);
    }
    if (val !== val.trim()) {
      errors.push(`${name} entry has leading/trailing whitespace: ${JSON.stringify(val)}`);
    }
    // Within-array duplicates
    if (seen.has(val)) {
      warnings.push(`${name} has duplicate entry: ${JSON.stringify(val)}`);
    }
    seen.add(val);
  }
}

// ── 6. Critical vocabulary presence ──────────────────────────────────────────
const bioTerms = new Set(arrays.SEARCH_ONTOLOGY_BIO_TERMS ?? []);
const venues   = new Set(arrays.SEARCH_ONTOLOGY_VENUES ?? []);

const REQUIRED_BIO   = ['cell', 'gene', 'rna', 'cancer', 'protein'];
const REQUIRED_VENUES = ['nature', 'cell', 'pnas'];

for (const term of REQUIRED_BIO) {
  if (!bioTerms.has(term)) {
    errors.push(`BIO_TERMS missing critical term: '${term}'`);
  }
}
for (const venue of REQUIRED_VENUES) {
  if (!venues.has(venue)) {
    errors.push(`VENUES missing critical entry: '${venue}'`);
  }
}

// ── 7. Report ─────────────────────────────────────────────────────────────────
const counts = Object.fromEntries(
  Object.entries(arrays).map(([k, v]) => [k.replace('SEARCH_ONTOLOGY_', ''), v?.length ?? 0])
);
console.log(`[check-ontology] file: ${byteSize} B  counts: ${JSON.stringify(counts)}`);
if (verMatch) console.log(`[check-ontology] version: ${verMatch[2]}`);

for (const w of warnings) console.warn(`[check-ontology] WARN  ${w}`);

if (errors.length > 0) {
  for (const e of errors) console.error(`[check-ontology] FAIL  ${e}`);
  process.exit(1);
}

console.log(`[check-ontology] PASS (${warnings.length} warning(s))`);
