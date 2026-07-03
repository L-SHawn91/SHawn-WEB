/**
 * Fast public search workflow regression tests.
 *
 * Run: node --experimental-strip-types scripts/test-search-public-workflow.mjs
 */

import {
  buildPublicKeywordSpeciesQuery,
  buildPublicPubMedQuery,
  isPublicBiomedicalQuery,
  publicDatasetTopicGuard,
  publicQueryTokens,
  publicTokenHit,
  sanitizePublicSearchQuery,
} from '../lib/bio-search-public/workflow.ts';

const failures = [];

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n=== public search aliases / expansion ===');
const pcosExpanded = buildPublicKeywordSpeciesQuery('PCOS granulosa cell RNA-seq ovary', { expand: true });
assert(/polycystic ovary syndrome/i.test(pcosExpanded), 'PCOS expands to polycystic ovary syndrome', pcosExpanded);
assert(/granulosa cell/i.test(pcosExpanded), 'granulosa expands to granulosa cell', pcosExpanded);

const lifPubmed = buildPublicPubMedQuery('LIF implantation mouse uterus endometrium');
assert(/Leukemia Inhibitory Factor/.test(lifPubmed), 'LIF PubMed query gets MeSH-like LIF support', lifPubmed);

const ashermanPubmed = buildPublicPubMedQuery('Asherman syndrome endometrial fibrosis mouse model');
assert(/Uterine Diseases/.test(ashermanPubmed), 'Asherman query gets uterine disease support', ashermanPubmed);

console.log('\n=== token alias matching ===');
assert(publicTokenHit('leukemia inhibitory factor supports implantation', 'lif'), 'LIF token matches spelled-out leukemia inhibitory factor');
assert(!publicTokenHit('daily life and health', 'lif'), 'LIF token does not match the substring in life');
assert(publicTokenHit('SELADIN-1 protects endometrial cells', 'dhcr24'), 'DHCR24 token matches SELADIN alias');
assert(publicQueryTokens('DHCR24 AND endometrium dataset').includes('dhcr24'), 'AND/dataset words are filtered while gene remains');

console.log('\n=== dataset topic guard ===');
assert(
  publicDatasetTopicGuard(
    {
      title: 'Leukemia inhibitory factor implantation mouse uterus RNA-seq dataset',
      description: 'GEO Series GSE999999 from murine uterine endometrium during implantation.',
      source: 'ncbi',
      accessionIds: ['GSE999999'],
      tags: ['RNA-seq'],
    },
    'LIF implantation mouse uterus dataset',
  ),
  'accession-backed dataset passes alias-aware LIF/endometrium guard',
);
assert(
  !publicDatasetTopicGuard(
    {
      title: 'General machine learning benchmark',
      description: 'A generic tabular benchmark without reproductive biology.',
      source: 'openml',
      tags: ['classification'],
    },
    'Asherman syndrome endometrial fibrosis dataset',
  ),
  'generic non-bio dataset fails Asherman/endometrial guard',
);

console.log('\n=== public/all-domain boundary ===');
assert(sanitizePublicSearchQuery('SHio climate CO2 emissions dataset') === 'climate CO2 emissions dataset', 'internal SHio term is stripped from public query');
assert(!isPublicBiomedicalQuery('quantum computing error correction'), 'quantum computing stays general-domain');
assert(isPublicBiomedicalQuery('PCOS granulosa cell RNA-seq ovary'), 'PCOS canary remains biomedical-domain');
assert(
  publicDatasetTopicGuard(
    {
      title: 'Global CO2 emissions climate dataset',
      description: 'Country-level carbon emissions and energy indicators.',
      source: 'datagov',
      tags: ['climate', 'carbon'],
    },
    'SHio climate CO2 emissions dataset',
  ),
  'general-domain public dataset passes without biomedical constraints',
);

console.log(`\n=== ${failures.length ? 'FAIL' : 'PASS'}: ${failures.length} failures ===`);
if (failures.length) {
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
