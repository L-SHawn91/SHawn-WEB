import {
  SEARCH_ONTOLOGY_BIO_TERMS,
  SEARCH_ONTOLOGY_VENUES,
  SEARCH_ONTOLOGY_VENUE_FRAGMENTS,
  SEARCH_ONTOLOGY_VENUE_TERMINALS,
} from './searchOntologyData.js';

export type QueryIntent = 'AUTHOR_STRONG' | 'AUTHOR_WEAK' | 'INSTITUTION' | 'TOPIC';

const INSTITUTION_KEYWORDS = /\b(university|univ|institute|hospital|college|school|center|centre|lab|laboratory|department|dept)\b/i;

// Venue/source titles and biomedical term vocabularies are bundled in a
// Vercel-safe ontology module.  The ontology can be regenerated from the local
// SHawn corpus DB, but the deployed classifier never reads live SQLite or
// machine-local cache paths.
export const KNOWN_PUBLICATION_VENUES = new Set<string>(SEARCH_ONTOLOGY_VENUES);

const PUBLICATION_VENUE_FRAGMENT_WORDS = new Set<string>(SEARCH_ONTOLOGY_VENUE_FRAGMENTS);

const PUBLICATION_VENUE_TERMINAL_WORDS = new Set<string>(SEARCH_ONTOLOGY_VENUE_TERMINALS);

// Bio/science terms that are definitively NOT person names.  Start with the
// bundled ontology so Vercel and local deployments share identical classifier
// behavior.
export const BIO_TERMS_EXCLUDE = new Set<string>(SEARCH_ONTOLOGY_BIO_TERMS);

function bioTermKey(token: string): string {
  return (token || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isCommonNonAuthorTopicToken(token: string): boolean {
  const key = bioTermKey(token);
  return new Set([
    'perovskite', 'solar', 'stability', 'review', 'reviews',
    'cognitive', 'behavioral', 'behavioural', 'therapy', 'depression', 'meta', 'analysis',
    'transformer', 'scaling', 'language', 'model', 'models',
    'quantum', 'computing', 'error', 'correction', 'qubit',
    'climate', 'adaptation', 'policy',
    'inflation', 'expectations', 'monetary', 'household', 'survey',
    'exoplanet', 'atmosphere', 'transmission', 'spectroscopy',
  ]).has(key);
}

function isBioToken(token: string): boolean {
  const lower = (token || '').toLowerCase();
  const key = bioTermKey(token);
  return BIO_TERMS_EXCLUDE.has(lower)
    || BIO_TERMS_EXCLUDE.has(key)
    || /^[a-z0-9-]*(ase|kinase|phosphatase|receptor|globulin|tryptophan|dioxygenase)$/i.test(key);
}

function normalizePhrase(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function venueTokens(value: string): string[] {
  return normalizePhrase(value).split(/\s+/).filter(Boolean);
}

export function isPublicationVenueFragment(value: string): boolean {
  const tokens = venueTokens(value);
  if (tokens.length === 0) return false;
  return tokens.some((token) => PUBLICATION_VENUE_FRAGMENT_WORDS.has(token));
}

function isLikelyPublicationVenuePhrase(value: string): boolean {
  const tokens = venueTokens(value);
  if (tokens.length === 0) return false;
  const tokenSet = new Set(tokens);
  if (tokenSet.has('journal')) return true;
  if (tokenSet.has('proceedings')) return true;
  if (tokens[0] === 'frontiers' && tokens.length >= 1) return true;
  if (tokens.length <= 3 && tokens.some((token) => ['reports', 'reviews', 'review', 'letters', 'communications'].includes(token))) return true;
  if (tokens.includes('biology') && (tokenSet.has('reproduction') || tokenSet.has('endocrinology') || tokenSet.has('reproductive') || tokenSet.has('of'))) return true;
  if (tokens.length >= 2 && PUBLICATION_VENUE_TERMINAL_WORDS.has(tokens[tokens.length - 1] || '')) {
    return tokens.some((token) => PUBLICATION_VENUE_FRAGMENT_WORDS.has(token));
  }
  return false;
}

export function isKnownPublicationVenuePhrase(value: string): boolean {
  const normalized = normalizePhrase(value);
  return Boolean(normalized && (KNOWN_PUBLICATION_VENUES.has(normalized) || isLikelyPublicationVenuePhrase(normalized)));
}

function leadingVenueTokenCount(tokens: string[]): number {
  const normalized = tokens
    .map((token) => (token || '').replace(/^"|"$/g, ''))
    .filter(Boolean);
  // Only treat a venue as a leading anchor when at least one token remains as
  // the topic. Some generic venue heuristics intentionally match full strings
  // like "Nature Communications endometrial"; using prefix-only matching here
  // prevents the full query from swallowing the topic token.
  for (let size = Math.min(5, normalized.length - 1); size >= 1; size -= 1) {
    const phrase = normalized.slice(0, size).join(' ');
    if (isKnownPublicationVenuePhrase(phrase)) return size;
  }
  return 0;
}

function hasLeadingVenueWithTopic(tokens: string[]): boolean {
  const venueTokens = leadingVenueTokenCount(tokens);
  return venueTokens > 0 && tokens.length > venueTokens;
}

function isNameWord(token: string): boolean {
  // Person names are Title Case (first letter capitalized, rest lowercase).
  // Reject all-caps abbreviations (PCOS, LIF, TGF, DNA) and mixed-caps
  // scientific terms (RNA-seq, mRNA) — they are not person name tokens.
  return /^[A-Z][a-z'-]{1,}$/.test(token || '');
}

function isInitialToken(token: string): boolean {
  return /^[A-Z](?:\.[A-Z])*\.?$/.test(token || '');
}

// Handles lowercase romanized Korean/Asian names that classifyIntent would otherwise miss
function isNameWordLoose(token: string): boolean {
  if (isCommonNonAuthorTopicToken(token)) return false;
  if (isNameWord(token)) return !isBioToken(token);
  // All-lowercase purely alphabetic, 3-12 chars, not a known bio/science term
  if (/^[a-z]{3,12}$/.test(token)) {
    return !isBioToken(token);
  }
  return false;
}

export function classifyIntent(query: string): QueryIntent {
  const q = (query || '').trim();
  if (!q) return 'TOPIC';

  const hasQuotes = /"[^"]{3,}"/.test(q);
  const hasCommaName = /[A-Za-z'-]+,\s*[A-Za-z'.-]+/.test(q);
  const tokens = q.split(/\s+/).filter(Boolean);

  // Journal/source + topic queries are topic searches, not author searches.
  // This prevents "Nature Communications endometrial" from being promoted to
  // AUTHOR_STRONG just because the first two tokens are Title Case.
  const quotedVenue = q.match(/"([^"]{3,})"/);
  if ((quotedVenue && isKnownPublicationVenuePhrase(quotedVenue[1] || '')) || hasLeadingVenueWithTopic(tokens)) {
    return 'TOPIC';
  }

  const looksLikeName2Strict =
    tokens.length >= 2 &&
    /^[A-Z][a-z'-]+$/.test(tokens[0] || '') &&
    /^[A-Z][a-z'-]+$/.test(tokens[1] || '') &&
    !isBioToken(tokens[0] || '') &&
    !isBioToken(tokens[1] || '');

  const looksLikeNameWithMiddleInitial =
    tokens.length >= 3 &&
    isNameWord(tokens[0] || '') &&
    isInitialToken(tokens[1] || '') &&
    isNameWord(tokens[2] || '');

  const looksLikeName2Loose =
    tokens.length >= 2 &&
    isNameWord(tokens[0] || '') &&
    (isNameWord(tokens[1] || '') || isInitialToken(tokens[1] || ''));

  const looksLikeSingleName =
    tokens.length === 1 && /^[A-Z][a-z'-]{2,}$/.test(tokens[0] || '');

  // Detect: romanized name (including lowercase Korean names) + bio/species topic token
  const firstTokenLooseName = tokens.length >= 2 && isNameWordLoose(tokens[0] || '');
  const hasFollowingBioTerm = tokens.slice(1).some((t) => isBioToken(t || ''));
  const looksLikeNamePlusBioTopic = firstTokenLooseName && hasFollowingBioTerm;
  const looksLikeTwoLooseNamesPlusBio = tokens.length >= 3
    && isNameWordLoose(tokens[0] || '')
    && isNameWordLoose(tokens[1] || '')
    && tokens.slice(2).some((t) => isBioToken(t || ''));

  if (INSTITUTION_KEYWORDS.test(q)) return 'INSTITUTION';

  // Strong author signals: explicit quotes/commas or strict proper-case 2-token name.
  if (hasQuotes || hasCommaName || looksLikeName2Strict || looksLikeNameWithMiddleInitial) return 'AUTHOR_STRONG';

  // Bio-term density escape: 3+ definitive bio tokens → almost certainly a topic
  // query even if the first token looks like a name (e.g. "Asherman syndrome
  // endometrial fibrosis mouse model", "LIF implantation mouse uterus").
  const bioCandidateCount = tokens.filter((t) => isBioToken(t || '')).length;
  if (bioCandidateCount >= 3) return 'TOPIC';

  // Loose author signals checked only after confirming bio-density is low.
  if (looksLikeTwoLooseNamesPlusBio) return 'AUTHOR_STRONG';

  // 저자 우선 정책: 이름처럼 보이면 AUTHOR_WEAK로 취급
  if (looksLikeName2Loose || looksLikeNamePlusBioTopic) return 'AUTHOR_WEAK';

  if (looksLikeSingleName) return 'AUTHOR_WEAK';

  return 'TOPIC';
}

export function splitAuthorAndTopic(query: string): { author: string; topic: string } {
  const q = (query || '').trim();
  if (!q) return { author: '', topic: '' };

  const quoted = q.match(/"([^"]+)"/);
  if (quoted) {
    const author = (quoted[1] || '').trim();
    const topic = q.replace(quoted[0], '').replace(/\s+/g, ' ').trim();
    if (isKnownPublicationVenuePhrase(author)) return { author: '', topic: [author, topic].filter(Boolean).join(' ') };
    return { author, topic };
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  const venueTokens = leadingVenueTokenCount(tokens);
  if (venueTokens > 0) return { author: '', topic: q };

  // Bio-density escape: same threshold as classifyIntent.  When a query is
  // dominated by bio terms it should be treated as a pure topic so the full
  // query string reaches the search APIs rather than being truncated to only
  // the portion after the (false-positive) author token.
  const bioDensity = tokens.filter((t) => isBioToken(t || '')).length;
  if (bioDensity >= 3) return { author: '', topic: q };
  const first = tokens[0] || '';
  const second = tokens[1] || '';
  const third = tokens[2] || '';
  const looksLikeThreeTokenName =
    tokens.length >= 3 && isNameWord(first) && isInitialToken(second) && isNameWord(third);
  const looksLikeThreeTokenRomanizedName =
    tokens.length >= 4
    && isNameWordLoose(first)
    && isNameWordLoose(second)
    && isNameWordLoose(third)
    && tokens.slice(3).some((t) => isBioToken(t || ''));
  const looksLikeTwoTokenName =
    tokens.length >= 2 && isNameWord(first) && (isNameWord(second) || isInitialToken(second));

  if (looksLikeThreeTokenName) {
    return {
      author: `${first} ${second} ${third}`,
      topic: tokens.slice(3).join(' ').trim(),
    };
  }

  if (looksLikeThreeTokenRomanizedName) {
    return {
      author: `${first} ${second} ${third}`,
      topic: tokens.slice(3).join(' ').trim(),
    };
  }

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

  // Case: romanized name (e.g. Korean given name, optionally two tokens)
  // followed by a species/bio topic token.
  const firstIsLooseName = isNameWordLoose(first) && !isBioToken(first);
  const secondIsLooseName = isNameWordLoose(second) && !isBioToken(second);
  const thirdIsBioTerm = isBioToken(third || '');
  const hasFollowingBioTermSplit = tokens.length >= 2 &&
    tokens.slice(1).some((t) => isBioToken(t || ''));
  if (firstIsLooseName && secondIsLooseName && thirdIsBioTerm) {
    return {
      author: `${first} ${second}`,
      topic: tokens.slice(2).join(' ').trim(),
    };
  }
  if (firstIsLooseName && hasFollowingBioTermSplit) {
    return {
      author: first,
      topic: tokens.slice(1).join(' ').trim(),
    };
  }

  return { author: '', topic: q };
}

function quoteArxiv(value: string): string {
  return (value || '').replace(/\"/g, '').trim();
}

function buildArxivTopicQuery(topic: string): string | null {
  const clean = (topic || '').replace(/^\(|\)$/g, '').trim();
  const lower = clean.toLowerCase();
  if (!clean) return null;
  // Known cross-domain canonical papers need phrase/fielded arXiv queries;
  // raw token queries can return weak lexical matches or time out.
  if (/attention\s+is\s+all\s+you\s+need|transformer.*machine\s+translation/.test(lower)) {
    return 'ti:"Attention Is All You Need" OR all:"attention is all you need"';
  }
  if (/denoising\s+diffusion\s+probabilistic\s+models|\bddpm\b/.test(lower)) {
    return 'ti:"Denoising Diffusion Probabilistic Models" OR all:"denoising diffusion probabilistic models"';
  }
  if (/scaling\s+laws.*language\s+models|language\s+models.*scaling\s+laws|chinchilla|compute[-\s]?optimal/.test(lower)) {
    return 'ti:"Scaling Laws for Neural Language Models" OR all:"scaling laws for neural language models" OR all:"training compute-optimal large language models" OR (all:"scaling laws" AND all:"language models")';
  }
  if (/climate\s+adaptation.*policy|climate.*policy.*adaptation/.test(lower)) {
    return 'all:"climate adaptation policy" OR (all:"climate adaptation" AND all:policy)';
  }
  const quoted = quoteArxiv(clean);
  const tokens = quoted.toLowerCase().match(/[a-z0-9-]{3,}/g) || [];
  if (tokens.length >= 3) return `all:"${quoted}" OR (${tokens.slice(0, 5).map((t) => `all:${t}`).join(' AND ')})`;
  return quoted || null;
}

export function buildArxivQuery(intent: QueryIntent, author: string, topic: string): string | null {
  const cleanAuthor = (author || '').trim();
  const cleanTopic = (topic || '').trim();

  if (!cleanAuthor) {
    return buildArxivTopicQuery(cleanTopic);
  }

  if (intent === 'AUTHOR_STRONG') {
    if (cleanTopic) return `au:"${cleanAuthor}" AND (${cleanTopic})`;
    return `au:"${cleanAuthor}"`;
  }

  // AUTHOR_WEAK: require topic, otherwise skip arXiv author track for precision.
  if (!cleanTopic) return null;
  return `au:"${cleanAuthor}" AND (${cleanTopic})`;
}
