export type QueryIntent = 'AUTHOR_STRONG' | 'AUTHOR_WEAK' | 'TOPIC';

function isNameWord(token: string): boolean {
  return /^[A-Z][A-Za-z'-]{1,}$/.test(token || '');
}

function isInitialToken(token: string): boolean {
  return /^[A-Z](?:\.[A-Z])*\.?$/.test(token || '');
}

export function classifyIntent(query: string): QueryIntent {
  const q = (query || '').trim();
  if (!q) return 'TOPIC';

  const hasQuotes = /"[^"]{3,}"/.test(q);
  const hasCommaName = /[A-Za-z'-]+,\s*[A-Za-z'.-]+/.test(q);
  const tokens = q.split(/\s+/).filter(Boolean);

  const looksLikeName2Strict =
    tokens.length >= 2 &&
    /^[A-Z][a-z'-]+$/.test(tokens[0] || '') &&
    /^[A-Z][a-z'-]+$/.test(tokens[1] || '');

  const looksLikeName2Loose =
    tokens.length >= 2 &&
    isNameWord(tokens[0] || '') &&
    (isNameWord(tokens[1] || '') || isInitialToken(tokens[1] || ''));

  const looksLikeSingleName =
    tokens.length === 1 && /^[A-Z][a-z'-]{2,}$/.test(tokens[0] || '');

  if (hasQuotes || hasCommaName || looksLikeName2Strict) return 'AUTHOR_STRONG';

  // 저자 우선 정책: 이름처럼 보이면 AUTHOR_WEAK로 취급
  if (looksLikeName2Loose) return 'AUTHOR_WEAK';

  if (looksLikeSingleName) {
    return 'AUTHOR_WEAK';
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
    tokens.length >= 2 && isNameWord(first) && (isNameWord(second) || isInitialToken(second));

  if (looksLikeTwoTokenName) {
    return {
      author: `${first} ${second}`,
      topic: tokens.slice(2).join(' ').trim(),
    };
  }

  const looksLikeSingleName = tokens.length === 1 && /^[A-Z][a-z'-]{2,}$/.test(first);
  if (looksLikeSingleName) {
    return { author: first, topic: '' };
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
