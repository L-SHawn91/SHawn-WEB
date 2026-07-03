#!/usr/bin/env node
// Rebuild the SHawn-WEB JCR 2024 server-local lookup index from source TSV.
// No network required. No secrets required.
// Usage: node scripts/build-jcr-index.mjs
//   JCR_EXPORT_TSV   override source TSV path
//   SHAWN_WEB_JCR_INDEX_JSON  override output JSON path
//   JCR_YEAR             override year label (default: 2024)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const JCR_YEAR = process.env.JCR_YEAR || '2024';

const tsvFilePath = path.resolve(
  (process.env.JCR_EXPORT_TSV || path.join(os.homedir(), '.shawn/cache/jcr_2024_merged_journals.tsv')).replace(/^~(?=$|\/)/, os.homedir()),
);
const indexFilePath = path.resolve(
  (process.env.SHAWN_WEB_JCR_INDEX_JSON || path.join(os.homedir(), '.shawn/cache/shawn_web_jcr_2024_index.json')).replace(/^~(?=$|\/)/, os.homedir()),
);

function parseNumber(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizeJournalName(name) {
  return (name || '')
    .replace(/&amp;/gi, '&')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function journalNameVariants(name) {
  const raw = cleanText(name);
  if (!raw) return new Set();
  const variants = [
    raw,
    raw.replace(/\s*\([^)]*\)\s*/g, ' '),
    raw.replace(/\s*:\s*.*$/g, ''),
    raw.replace(/\s*,\s*the official journal.*$/i, ''),
    raw.replace(/^the\s+/i, ''),
    raw.replace(/&/g, 'and'),
  ];
  return new Set(variants.map(normalizeJournalName).filter(Boolean));
}

function cleanIssn(value) {
  return cleanText(value).replace(/[^0-9Xx]/g, '').toUpperCase();
}

function splitIssns(value) {
  const out = new Set();
  for (const part of cleanText(value).split(/[,;/\s]+/)) {
    const clean = cleanIssn(part);
    if (clean.length === 8) out.add(clean);
  }
  return out;
}

function chooseBestRecord(existing, candidate) {
  if (!existing) return candidate;
  return (candidate.if || 0) > (existing.if || 0) ? candidate : existing;
}

function parseDelimitedRows(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cleanText(values[i]);
    });
    return row;
  });
}

if (!fs.existsSync(tsvFilePath)) {
  console.error(`ERROR: source TSV not found: ${tsvFilePath}`);
  console.error('Set JCR_EXPORT_TSV env var to override the path.');
  process.exit(1);
}

console.log(`Source TSV : ${tsvFilePath}`);
console.log(`Output JSON: ${indexFilePath}`);

const rows = parseDelimitedRows(tsvFilePath);
const issnIndex = new Map();
const nameIndex = new Map();
let skipped = 0;

for (const row of rows) {
  const journalName = cleanText(row.journal_name || row['Journal name']);
  if (!journalName) { skipped++; continue; }
  const jif = parseNumber(row.jif_2024 || row['2024 JIF']);
  if (!jif) { skipped++; continue; }

  const quartile = cleanText(row.jif_quartile || row['JIF Quartile']);
  const issn = cleanText(row.issn || row.ISSN);
  const eissn = cleanText(row.eissn || row.eISSN);

  const record = {
    if: round1(jif),
    quartile,
    hIndex: 0,
    name: journalName,
    source: 'Local JCR index',
    metric: 'JCR_JIF',
    year: JCR_YEAR,
    isOfficial: true,
    jci: parseNumber(row.jci_2024 || row['2024 JCI']),
    category: cleanText(row.category || row.Category),
    edition: cleanText(row.edition || row.Edition),
    issn,
    eissn,
  };

  for (const key of new Set([...splitIssns(issn), ...splitIssns(eissn)])) {
    issnIndex.set(key, chooseBestRecord(issnIndex.get(key), { ...record, matchMode: 'JCR_ISSN_OR_EISSN_EXACT' }));
  }
  for (const field of [journalName, row.jcr_abbreviation, row['JCR Abbreviation']]) {
    for (const key of journalNameVariants(field || '')) {
      nameIndex.set(key, chooseBestRecord(nameIndex.get(key), { ...record, matchMode: 'JCR_TITLE_SAFE_VARIANT' }));
    }
  }
}

const tsvMtime = new Date(fs.statSync(tsvFilePath).mtimeMs).toISOString();
const output = {
  meta: {
    source: 'Local JCR index',
    jcrYear: JCR_YEAR,
    builtAt: new Date().toISOString(),
    issnCount: issnIndex.size,
    nameCount: nameIndex.size,
    tsvMtime,
  },
  issnRecords: Object.fromEntries(issnIndex),
  nameRecords: Object.fromEntries(nameIndex),
};

fs.mkdirSync(path.dirname(indexFilePath), { recursive: true });
fs.writeFileSync(indexFilePath, JSON.stringify(output), 'utf8');

console.log(`Written: ${issnIndex.size} ISSN entries, ${nameIndex.size} name entries`);
if (skipped > 0) console.log(`Skipped: ${skipped} rows (missing journal_name or zero JIF)`);

// Smoke check: Nature Communications eISSN 2041-1723
const nc = issnIndex.get('20411723');
if (nc) {
  console.log(`Smoke check OK: Nature Communications → JIF ${nc.if} ${nc.quartile} (eISSN 2041-1723, source: ${nc.source})`);
} else {
  console.warn('Smoke check WARN: Nature Communications (eISSN 2041-1723) not found in ISSN index.');
}
