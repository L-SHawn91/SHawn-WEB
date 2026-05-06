/**
 * Fast intent-planner regression test for SHawn paper search.
 *
 * This imports the real TypeScript implementation via Node 22's type-stripping
 * loader so the test cannot drift from lib/search/queryPlanner.ts.
 *
 * Run: node --experimental-strip-types scripts/test-classify-intent.mjs
 */

import { classifyIntent, splitAuthorAndTopic } from '../lib/search/queryPlanner.ts';

const intentCases = [
  // Previously failing: high-density biomedical topics were treated as author queries.
  { query: 'PCOS granulosa cell RNA-seq ovary', want: 'TOPIC', label: 'PCOS granulosa (multi-cap abbrev + bio terms)' },
  { query: 'RNA-seq PCOS granulosa', want: 'TOPIC', label: 'RNA-seq normalized as rnaseq bio token' },
  { query: 'Asherman syndrome endometrial fibrosis mouse model', want: 'TOPIC', label: 'Asherman syndrome (high bio density)' },
  { query: 'Asherman Syndrome Endometrial Fibrosis Mouse Model', want: 'TOPIC', label: 'Title Case syndrome should not become author pair' },
  { query: 'LIF implantation mouse uterus endometrium', want: 'TOPIC', label: 'LIF (all-caps abbrev, bio topic)' },

  // Author behavior that must remain protected.
  { query: 'soohyung lee pig', want: 'AUTHOR_STRONG', label: 'Korean lowercase name + species (AUTHOR_STRONG)' },
  { query: 'In Kyu Yoo porcine conceptus', want: 'AUTHOR_STRONG', label: '3-token Korean name + bio (AUTHOR_STRONG)' },
  { query: 'Inkyu Yoo pig endometrium', want: 'AUTHOR_STRONG', label: '2-token proper name + bio (AUTHOR_STRONG)' },
  { query: '"John Smith" cancer', want: 'AUTHOR_STRONG', label: 'Quoted name + topic (AUTHOR_STRONG)' },
  { query: 'Smith mouse', want: 'AUTHOR_WEAK', label: 'Single name + bio term (AUTHOR_WEAK)' },
  { query: 'Johnson endometrium', want: 'AUTHOR_WEAK', label: 'Single name + tissue term (AUTHOR_WEAK)' },

  // Plain biomedical topics that should not regress toward author mode.
  { query: 'melatonin PTEN AKT FOXO3a mouse ovary', want: 'TOPIC', label: 'Multi-abbrev bio topic (TOPIC)' },
  { query: 'pancreatic cancer organoid', want: 'TOPIC', label: 'Plain topic (TOPIC)' },
  { query: 'DHCR24 endometrium', want: 'TOPIC', label: 'Gene + tissue (TOPIC)' },
  { query: 'zebrafish heart regeneration', want: 'TOPIC', label: 'Species + organ + bio (TOPIC)' },
  { query: 'blastocyst implantation integrin mouse uterus', want: 'TOPIC', label: 'Multi-bio-term topic (TOPIC)' },
];

const splitCases = [
  { query: 'PCOS granulosa cell RNA-seq ovary', wantAuthor: '', label: 'PCOS: author should be empty' },
  { query: 'RNA-seq PCOS granulosa', wantAuthor: '', label: 'RNA-seq PCOS: author should be empty' },
  { query: 'Asherman syndrome endometrial fibrosis mouse model', wantAuthor: '', label: 'Asherman: author should be empty (bio density)' },
  { query: 'Asherman Syndrome Endometrial Fibrosis Mouse Model', wantAuthor: '', label: 'Title Case Asherman: author should be empty' },
  { query: 'LIF implantation mouse uterus endometrium', wantAuthor: '', label: 'LIF: author should be empty' },
  { query: 'soohyung lee pig', wantAuthor: 'soohyung lee', label: 'soohyung lee: correct split' },
  { query: 'Inkyu Yoo pig endometrium', wantAuthor: 'Inkyu Yoo', label: 'Inkyu Yoo: correct split' },
];

let passed = 0;
let failed = 0;

console.log('\n=== classifyIntent ===');
for (const { query, want, label } of intentCases) {
  const got = classifyIntent(query);
  const ok = got === want;
  if (ok) {
    passed++;
    console.log(`  PASS  [${want}] ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  [want=${want} got=${got}] ${label}`);
    console.log(`         query: "${query}"`);
  }
}

console.log('\n=== splitAuthorAndTopic (author field) ===');
for (const { query, wantAuthor, label } of splitCases) {
  const { author } = splitAuthorAndTopic(query);
  const ok = author === wantAuthor;
  if (ok) {
    passed++;
    console.log(`  PASS  author="${author}" — ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  want author="${wantAuthor}" got="${author}" — ${label}`);
    console.log(`         query: "${query}"`);
  }
}

console.log(`\n=== ${passed + failed} tests: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
