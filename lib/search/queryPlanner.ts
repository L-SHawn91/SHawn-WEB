export type QueryIntent = 'AUTHOR_STRONG' | 'AUTHOR_WEAK' | 'INSTITUTION' | 'TOPIC';

const INSTITUTION_KEYWORDS = /\b(university|univ|institute|hospital|college|school|center|centre|lab|laboratory|department|dept)\b/i;

// Bio/science terms that are definitively NOT person names
const BIO_TERMS_EXCLUDE = new Set([
  'endometrium', 'endometrial', 'uterus', 'uterine', 'organoid', 'organoids',
  'transcriptomics', 'transcriptome', 'transcriptional', 'transcription',
  'genomics', 'genomic', 'genome', 'proteomics', 'proteomic',
  'metabolomics', 'metabolomic', 'lipidomics',
  'decidua', 'decidual', 'decidualization',
  'implantation', 'receptivity', 'fertility', 'infertility',
  'estrogen', 'estradiol', 'progesterone', 'testosterone',
  'cholesterol', 'steroid', 'androgen',
  'carcinoma', 'cancer', 'tumor', 'tumour', 'fibroid', 'leiomyoma',
  'endometriosis', 'adenomyosis',
  'stem', 'cell', 'cells', 'expression', 'gene', 'genes',
  'protein', 'proteins', 'rna', 'dna', 'mrna', 'cdna',
  'chromatin', 'histone', 'epigenetic', 'epigenetics',
  'mouse', 'human', 'bovine', 'equine', 'porcine', 'canine', 'murine',
  'mice', 'rat', 'rats', 'pig', 'pigs', 'swine', 'sus', 'scrofa', 'zebrafish',
  'analysis', 'profiling', 'sequencing', 'pathway', 'pathways',
  'cluster', 'clustering', 'network', 'regulation', 'signaling',
  'methylation', 'acetylation', 'phosphorylation', 'ubiquitination',
  'proliferation', 'apoptosis', 'differentiation', 'migration',
  'invasion', 'adhesion', 'inflammation', 'immune', 'cytokine',
  'hormone', 'receptor', 'enzyme', 'kinase', 'phosphatase',
  'embryo', 'blastocyst', 'trophoblast', 'placenta', 'menstrual',
  'ovary', 'ovarian', 'cervical', 'cervix', 'fallopian', 'vaginal',
  'single', 'spatial', 'bulk', 'scrna', 'scrnaseq',
  'organotypic', 'culture', 'tissue', 'sample', 'patient', 'patients',
  'clinical', 'vitro', 'vivo', 'study', 'studies', 'review', 'model',
  'therapy', 'treatment', 'surgery', 'diagnosis',
  'biomarker', 'biomarkers', 'diagnostic', 'prognostic',
  'rnaseq', 'atacseq', 'chipseq', 'bisulfite',
  'data', 'dataset', 'database',
]);

function isNameWord(token: string): boolean {
  return /^[A-Z][A-Za-z'-]{1,}$/.test(token || '');
}

function isInitialToken(token: string): boolean {
  return /^[A-Z](?:\.[A-Z])*\.?$/.test(token || '');
}

// Handles lowercase romanized Korean/Asian names that classifyIntent would otherwise miss
function isNameWordLoose(token: string): boolean {
  if (isNameWord(token)) return true;
  // All-lowercase purely alphabetic, 3-12 chars, not a known bio/science term
  if (/^[a-z]{3,12}$/.test(token)) {
    return !BIO_TERMS_EXCLUDE.has(token);
  }
  return false;
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
  const hasFollowingBioTerm = tokens.slice(1).some((t) => BIO_TERMS_EXCLUDE.has((t || '').toLowerCase()));
  const looksLikeNamePlusBioTopic = firstTokenLooseName && hasFollowingBioTerm;
  const looksLikeTwoLooseNamesPlusBio = tokens.length >= 3
    && isNameWordLoose(tokens[0] || '')
    && isNameWordLoose(tokens[1] || '')
    && tokens.slice(2).some((t) => BIO_TERMS_EXCLUDE.has((t || '').toLowerCase()));

  if (INSTITUTION_KEYWORDS.test(q)) return 'INSTITUTION';
  if (hasQuotes || hasCommaName || looksLikeName2Strict || looksLikeNameWithMiddleInitial || looksLikeTwoLooseNamesPlusBio) return 'AUTHOR_STRONG';

  // 저자 우선 정책: 이름처럼 보이면 AUTHOR_WEAK로 취급
  if (looksLikeName2Loose || looksLikeNamePlusBioTopic) return 'AUTHOR_WEAK';

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
  const third = tokens[2] || '';
  const looksLikeThreeTokenName =
    tokens.length >= 3 && isNameWord(first) && isInitialToken(second) && isNameWord(third);
  const looksLikeTwoTokenName =
    tokens.length >= 2 && isNameWord(first) && (isNameWord(second) || isInitialToken(second));

  if (looksLikeThreeTokenName) {
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
  const firstIsLooseName = isNameWordLoose(first) && !BIO_TERMS_EXCLUDE.has(first.toLowerCase());
  const secondIsLooseName = isNameWordLoose(second) && !BIO_TERMS_EXCLUDE.has(second.toLowerCase());
  const thirdIsBioTerm = BIO_TERMS_EXCLUDE.has((third || '').toLowerCase());
  const hasFollowingBioTermSplit = tokens.length >= 2 &&
    tokens.slice(1).some((t) => BIO_TERMS_EXCLUDE.has((t || '').toLowerCase()));
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
