export type QueryIntent = 'AUTHOR_STRONG' | 'AUTHOR_WEAK' | 'TOPIC';

const BIO_KEYWORDS = [
  'autophagy',
  'lysosome',
  'endometrium',
  'fibrosis',
  'organoid',
  'transcriptomics',
  'rna-seq',
  'single-cell',
  'scRNA',
  'uterus',
  'hormone',
  'lc3',
];

function hasBioKeyword(query: string): boolean {
  const q = query.toLowerCase();
  return BIO_KEYWORDS.some((kw) => q.includes(kw.toLowerCase()));
}

export function classifyIntent(query: string): QueryIntent {
  const q = (query || '').trim();
  if (!q) return 'TOPIC';

  const hasQuotes = /"[^"]{3,}"/.test(q);
  const hasCommaName = /[A-Za-z'-]+,\s*[A-Za-z'.-]+/.test(q);
  const tokens = q.split(/\s+/).filter(Boolean);
  const looksLikeName2 =
    tokens.length >= 2 &&
    /^[A-Z][a-z'-]+$/.test(tokens[0] || '') &&
    /^[A-Z][a-z'-]+$/.test(tokens[1] || '');

  if (hasQuotes || hasCommaName) return 'AUTHOR_STRONG';
  if (looksLikeName2) {
    return hasBioKeyword(q) || tokens.length > 2 ? 'AUTHOR_WEAK' : 'AUTHOR_WEAK';
  }
  return 'TOPIC';
}

export function splitAuthorAndTopic(query: string): { author: string; topic: string } {
  const q = (query || '').trim();
  if (!q) return { author: '', topic: '' };

  const quoted = q.match(/"([^"]+)"/);
  if (quoted) {
    const author = (quoted[1] || '').trim();
    const topic = q.replace(quoted[0], '').replace(/\s+/g, ' ').trim();
    return { author, topic };
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const first = tokens[0] || '';
  const second = tokens[1] || '';
  const looksLikeTwoTokenName =
    tokens.length >= 2 && /^[A-Z][a-z'-]+$/.test(first) && /^[A-Z][a-z'-]+$/.test(second);

  if (looksLikeTwoTokenName) {
    return {
      author: `${first} ${second}`,
      topic: tokens.slice(2).join(' ').trim(),
    };
  }

  return { author: '', topic: q };
}

export function buildArxivQuery(intent: QueryIntent, author: string, topic: string): string | null {
  const cleanAuthor = (author || '').trim();
  const cleanTopic = (topic || '').trim();

  if (!cleanAuthor) {
    return cleanTopic || null;
  }

  if (intent === 'AUTHOR_STRONG') {
    if (cleanTopic) return `au:"${cleanAuthor}" AND (${cleanTopic})`;
    return `au:"${cleanAuthor}"`;
  }

  // AUTHOR_WEAK: require topic, otherwise skip arXiv author track for precision.
  if (!cleanTopic) return null;
  return `au:"${cleanAuthor}" AND (${cleanTopic})`;
}
