export type PublicPaperLike = {
  id?: string;
  title?: string;
  abstract?: string;
  year?: number;
  source?: string;
  doi?: string;
  url?: string;
  authors?: string[];
  journal?: string;
  journalIssn?: string;
  citations?: number;
  meshTerms?: string[];
  techniques?: string[];
  influenceScore?: number;
};

export type PublicDatasetLike = {
  id?: string;
  title?: string;
  description?: string;
  source?: string;
  url?: string;
  accessionIds?: string[];
  license?: string;
  downloads?: number;
  likes?: number;
  updatedAt?: string;
  tags?: string[];
  rankScore?: number;
};

export type PublicSourceHealth = {
  source: string;
  ok: boolean;
  count: number;
  durationMs?: number;
  warning?: string;
};

export type SuggestedTopic = {
  type: string;
  label: string;
  query: string;
  count: number;
};

// Aligned with bio-search _SOURCE_WEIGHTS
const PUBLIC_SOURCE_WEIGHT: Record<string, number> = {
  pubmed: 1.0,
  europepmc: 0.98,
  crossref: 0.95,
  openalex: 0.94,
  semantic: 0.92,
  arxiv: 0.82,
  biorxiv: 0.84,
  medrxiv: 0.84,
};


const PUBLIC_DATASET_SOURCE_WEIGHT: Record<string, number> = {
  ncbi: 1.18,
  ena: 1.16,
  europepmc: 1.12,
  arrayexpress: 1.15,
  cellxgene: 1.14,
  zenodo: 1.08,
  dryad: 1.07,
  dataverse: 1.06,
  figshare: 1.04,
  openalex: 1.02,
  crossref: 1.02,
  huggingface: 0.98,
  openml: 0.96,
  kaggle: 0.94,
  github: 0.9,
};

const STATIC_MESH_MAP: Array<[RegExp, string]> = [
  [/organoid/i, "Organoids"],
  [/endometr/i, "Endometrium"],
  [/uter/i, "Uterus"],
  [/stem cell/i, "Stem Cells"],
  [/single[-\s]?cell|scrna/i, "Single-Cell Analysis"],
  [/rna[-\s]?seq|transcriptom/i, "Transcriptome"],
  [/fibrosis|fibrotic/i, "Fibrosis"],
  [/implantation/i, "Embryo Implantation"],
  [/decidual/i, "Decidua"],
  [/infertil/i, "Infertility, Female"],
  [/estrogen|estradiol/i, "Estrogens"],
  [/progesterone/i, "Progesterone"],
  [/crispr/i, "CRISPR-Cas Systems"],
  [/blastocyst/i, "Blastocyst"],
  [/trophoblast/i, "Trophoblasts"],
  [/placenta/i, "Placenta"],
  [/epigeneti/i, "Epigenesis, Genetic"],
  [/methylat/i, "DNA Methylation"],
  [/chromatin/i, "Chromatin"],
  [/histone/i, "Histones"],
  [/proteom/i, "Proteomics"],
  [/metabolom/i, "Metabolomics"],
  [/spatial\s+transcriptom/i, "Spatial Transcriptomics"],
  [/atac[-\s]?seq/i, "Chromatin Accessibility"],
  [/chip[-\s]?seq/i, "ChIP-Sequencing"],
  [/dhcr24|seladin/i, "Cholesterol Biosynthesis"],
  [/decidualiz/i, "Decidualization"],
  [/endometrios/i, "Endometriosis"],
  [/leiomyoma|fibroid/i, "Leiomyoma"],
  [/menstrual/i, "Menstrual Cycle"],
];

// ---------------------------------------------------------------------------
// Biomedical typo correction — mirrors Python correct_query_typos()
// ---------------------------------------------------------------------------
const _TYPO_MAP: Readonly<Record<string, string>> = {
  organiod: 'organoid', organiods: 'organoids', organid: 'organoid', organoidd: 'organoid',
  endometiral: 'endometrial', endometrail: 'endometrial',
  endometirum: 'endometrium', endomerium: 'endometrium', endometrim: 'endometrium',
  uterin: 'uterine', uterins: 'uterine',
  transcriptomcis: 'transcriptomics', trancriptomics: 'transcriptomics',
  transcritomics: 'transcriptomics', transcriptomis: 'transcriptomics',
  sequncing: 'sequencing', seqeuncing: 'sequencing',
  scrna_seq: 'scrna', 'scrna-seq': 'scrna', scrnaseq: 'scrna', 'rna-seq': 'rnaseq',
  genmoic: 'genomic', genomcis: 'genomics', genmoics: 'genomics',
  epigenitics: 'epigenetics', epigentics: 'epigenetics', epigeneics: 'epigenetics',
  implantaion: 'implantation', implanation: 'implantation',
  receptiviy: 'receptivity', recepivity: 'receptivity',
  decidualizaiton: 'decidualization', decidulaization: 'decidualization', decidualziation: 'decidualization',
  progesteron: 'progesterone', progestrone: 'progesterone',
  estrgen: 'estrogen', oestrogen: 'estrogen', estradoil: 'estradiol', estradiole: 'estradiol',
  apopstosis: 'apoptosis', apoptoiss: 'apoptosis',
  prolifeartion: 'proliferation', prolfieration: 'proliferation', proliferaton: 'proliferation',
  carcnioma: 'carcinoma', carcionma: 'carcinoma',
  tumorigenisis: 'tumorigenesis', tumorigeniss: 'tumorigenesis',
  methylaiton: 'methylation', methlation: 'methylation',
  chrmoatin: 'chromatin', chromatn: 'chromatin',
  stemcell: 'stem cell', differenciation: 'differentiation', differentation: 'differentiation', differntiation: 'differentiation',
  infertiliy: 'infertility', infertlity: 'infertility',
  fertilizaiton: 'fertilization', fertilzation: 'fertilization',
};

export function correctPublicBioQueryTypos(query: string): string {
  if (!query) return query;
  // Split on whitespace boundaries, apply correction per token, rejoin
  return query.replace(/[^\s]+/g, (token) => {
    const stripped = token.replace(/^[()[\]{}"'.,:;?!]+|[()[\]{}"'.,:;?!]+$/g, '');
    const pre = token.slice(0, token.indexOf(stripped));
    const post = token.slice(pre.length + stripped.length);
    const corrected = _TYPO_MAP[stripped.toLowerCase()];
    return corrected ? `${pre}${corrected}${post}` : token;
  });
}

const EXPANSION_SYNONYMS: Array<[RegExp, string[]]> = [
  // General assay / modality expansion
  [/\borganoid(s)?\b/i, ["3D culture", "organotypic culture", "spheroid"]],
  [/\bscrna\b|single[-\s]?cell/i, ["single cell RNA sequencing", "single-cell transcriptomics", "scRNA-seq"]],
  [/\brna[-\s]?seq\b|\brnaseq\b/i, ["transcriptomics", "gene expression profiling", "RNA sequencing"]],
  [/\bfish\b/i, ["fluorescence in situ hybridization"]],
  [/\batac[-\s]?seq\b/i, ["chromatin accessibility", "open chromatin"]],
  [/\bchip[-\s]?seq\b/i, ["chromatin immunoprecipitation", "histone modification"]],
  [/\bspatial\s+transcriptom/i, ["spatial RNA-seq", "visium", "spatial gene expression"]],
  [/\bepigeneti/i, ["DNA methylation", "histone modification", "chromatin remodeling"]],
  [/\bproteom/i, ["mass spectrometry", "protein expression"]],
  [/\bmetabolom/i, ["metabolite profiling", "LC-MS"]],

  // Tissue / disease expansion. These are symmetric helpers, not ranking preferences.
  [/\buterus\b|\buteri\b/i, ["endometrium", "endometrial", "uterine"]],
  [/\buterine\b/i, ["uterus", "endometrium", "endometrial"]],
  [/\bendometr/i, ["uterus", "uterine", "uterine lining", "endometrium"]],
  [/\bliver\b|\bhepatic\b/i, ["hepatocyte", "hepatic", "liver tissue"]],
  [/\bkidney\b|\brenal\b/i, ["renal", "nephron", "kidney tissue"]],
  [/\bbrain\b|\bcerebral\b|\bneural\b/i, ["neuron", "cerebral", "neural tissue"]],
  [/\bheart\b|\bcardiac\b/i, ["cardiac", "cardiomyocyte", "myocardium"]],
  [/\blung\b|\bpulmonary\b/i, ["pulmonary", "airway", "alveolar"]],
  [/\bcolon\b|\bcolorectal\b|\bintestinal\b/i, ["intestinal", "colorectal", "gut"]],
  [/\bpancreas\b|\bpancreatic\b/i, ["pancreatic", "islet", "ductal"]],
  [/\bovary\b|\bovarian\b/i, ["ovarian", "follicle", "oocyte"]],
  [/\bcancer\b|\btumou?r\b|\bcarcinoma\b/i, ["neoplasm", "malignancy", "tumor"]],
  [/\bfibrosis\b|\bfibrotic\b/i, ["fibrotic", "extracellular matrix", "collagen"]],
  [/\binflamm/i, ["immune response", "cytokine", "inflammation"]],

  // Specific aliases
  [/\bdhcr24\b/i, ["seladin-1", "24-dehydrocholesterol reductase"]],
  [/\bseladin/i, ["DHCR24", "24-dehydrocholesterol reductase"]],
  [/\bdecidualiz/i, ["decidualization", "stromal decidualization"]],
  [/\bimplantation/i, ["embryo implantation", "receptivity"]],
  [/\btrophoblast/i, ["placentation", "extravillous trophoblast"]],
  [/\bblastocyst/i, ["embryo implantation", "hatching blastocyst"]],
  [/\bendometrios/i, ["ectopic endometrium", "endometriosis lesion"]],
];


export type PublicQueryParts = {
  normalized: string;
  authors: string[];
  species: string[];
  keywords: string;
};

const SPECIES_ALIASES: Array<[RegExp, string[]]> = [
  [/\b(human|humans|patient|patients|homo\s+sapiens)\b/i, ["human", "Homo sapiens"]],
  [/\b(mouse|mice|murine|mus\s+musculus)\b/i, ["mouse", "Mus musculus"]],
  [/\b(rat|rats|rattus)\b/i, ["rat", "Rattus norvegicus"]],
  [/\b(pig|pigs|porcine|swine|sus\s+scrofa)\b/i, ["pig", "porcine", "Sus scrofa"]],
  [/\b(cow|cattle|bovine|bos\s+taurus)\b/i, ["bovine", "Bos taurus"]],
  [/\b(sheep|ovine|ovis\s+aries)\b/i, ["ovine", "Ovis aries"]],
  [/\b(chicken|avian|gallus\s+gallus)\b/i, ["chicken", "Gallus gallus"]],
  [/\b(zebrafish|danio\s+rerio)\b/i, ["zebrafish", "Danio rerio"]],
];

function uniquePublicList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.trim().replace(/\s+/g, " ");
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function extractLabeledValues(text: string, labels: string[], allLabels: string[]): { values: string[]; rest: string } {
  let rest = text;
  const values: string[] = [];
  const labelPattern = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const boundaryPattern = allLabels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:^|\\s)(?:${labelPattern})\\s*[:=：]?\\s*([\\s\\S]*?)(?=\\s+(?:${boundaryPattern})\\s*[:=：]?|$)`, 'gi');
  rest = rest.replace(regex, (_m, value) => {
    const clean = String(value || '').trim().replace(/\s+/g, ' ');
    if (clean) values.push(clean);
    return ' ';
  });
  return { values: uniquePublicList(values), rest: rest.replace(/\s+/g, ' ').trim() };
}

export function parsePublicBioQuery(query: string): PublicQueryParts {
  const normalized = normalizePublicBioQuery(query);
  let rest = normalized;
  const allLabels = ['author', 'authors', 'by', '저자', 'species', 'organism', '종', '동물종', 'keyword', 'keywords', 'title', 'topic', '키워드', '제목'];
  const author = extractLabeledValues(rest, ['author', 'authors', 'by', '저자'], allLabels);
  rest = author.rest;
  const speciesLabeled = extractLabeledValues(rest, ['species', 'organism', '종', '동물종'], allLabels);
  rest = speciesLabeled.rest;
  const keyword = extractLabeledValues(rest, ['keyword', 'keywords', 'title', 'topic', '키워드', '제목'], allLabels);
  rest = keyword.rest;

  const species = [...speciesLabeled.values];
  for (const [pattern, aliases] of SPECIES_ALIASES) {
    if (pattern.test(normalized)) species.push(...aliases);
  }

  // Remove only species aliases from keyword text; author removal is explicit-label only.
  let keywords = keyword.values.length ? keyword.values.join(' ') : rest;
  for (const term of uniquePublicList(species)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    keywords = keywords.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
  }
  const speciesUnique = uniquePublicList(species);
  keywords = keywords.replace(/\s+/g, ' ').trim();
  if (!keywords && keyword.values.length) keywords = keyword.values.join(' ');
  // If the user provides only author + species, the species itself must become
  // the keyword/title anchor. Otherwise author-mode backends can return the
  // right name from the wrong field entirely.
  if (!keywords && speciesUnique.length) keywords = speciesUnique.slice(0, 3).join(' ');

  return {
    normalized,
    authors: author.values,
    species: speciesUnique,
    keywords: keywords || normalized,
  };
}

export function buildPublicKeywordSpeciesQuery(query: string, opts: { expand?: boolean; titleOnly?: boolean } = {}): string {
  const parts = parsePublicBioQuery(query);
  const keywordBase = parts.keywords || parts.normalized;
  const keywordQuery = opts.expand ? expandPublicBioQueryLoose(keywordBase) : keywordBase;
  const speciesTerms = parts.species.slice(0, 3);
  const joined = [keywordQuery, ...speciesTerms].filter(Boolean).join(' ');
  if (!opts.titleOnly) return joined || parts.normalized;
  const titleTerms = keywordBase
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 8)
    .join(' ');
  return [titleTerms || keywordQuery, ...speciesTerms].filter(Boolean).join(' ') || parts.normalized;
}

export function normalizePublicBioQuery(query: string): string {
  const typoFixed = correctPublicBioQueryTypos(query || "");
  return typoFixed
    .normalize("NFKC")
    .replace(/([A-Za-z0-9])([가-힣])/g, "$1 $2")
    .replace(/([가-힣])([A-Za-z0-9])/g, "$1 $2")
    .replace(/논문(의|들|을|에)?|관련(된)?|검색(해줘)?|찾아줘|알려줘|보여줘/g, " ")
    .replace(/[^\p{L}\p{N}"'\-.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function expandPublicBioQuery(query: string, maxTerms = 3): string {
  const clean = normalizePublicBioQuery(query);
  if (!clean) return "";

  const additions: string[] = [];
  for (const [pattern, synonyms] of EXPANSION_SYNONYMS) {
    if (additions.length >= maxTerms) break;
    if (pattern.test(clean)) {
      for (const synonym of synonyms) {
        if (additions.length >= maxTerms) break;
        if (!clean.toLowerCase().includes(synonym.toLowerCase())) additions.push(synonym);
      }
    }
  }

  if (!additions.length) return clean;
  return `${clean} (${additions.map((term) => `"${term}"`).join(" OR ")})`;
}

export function expandPublicBioQueryLoose(query: string, maxTerms = 4): string {
  const clean = normalizePublicBioQuery(query);
  if (!clean) return "";

  const baseTokens = clean.match(/[\p{L}\p{N}-]{3,}/gu) || [];
  const terms = new Set<string>(baseTokens.length > 1 ? baseTokens : [clean]);
  for (const [pattern, synonyms] of EXPANSION_SYNONYMS) {
    if (terms.size >= maxTerms + 1) break;
    if (!pattern.test(clean)) continue;
    for (const synonym of synonyms) {
      if (terms.size >= maxTerms + 1) break;
      if (synonym && !clean.toLowerCase().includes(synonym.toLowerCase())) terms.add(synonym);
    }
  }

  if (terms.size <= 1) return clean;
  return Array.from(terms)
    .map((term) => term.includes(" ") ? `"${term}"` : term)
    .join(" OR ");
}

export function buildPublicPubMedQuery(query: string): string {
  const clean = normalizePublicBioQuery(query);
  if (!clean) return "";

  const meshTerms: string[] = [];
  for (const [pattern, heading] of STATIC_MESH_MAP) {
    if (meshTerms.length >= 3) break;
    if (pattern.test(clean) && !meshTerms.includes(heading)) {
      meshTerms.push(heading);
    }
  }

  if (!meshTerms.length) return clean;
  const meshBlock = meshTerms.map((term) => `"${term}"[MeSH Terms]`).join(" OR ");
  return `(${clean}) OR (${meshBlock})`;
}

export function publicDedupeKey(paper: PublicPaperLike): string {
  const doi = String(paper.doi || "").toLowerCase().replace(/^https?:\/\/doi\.org\//, "").trim();
  if (doi) return `doi:${doi}`;

  const id = String(paper.id || "").toLowerCase().trim();
  if (id && !id.startsWith("semantic-") && !id.startsWith("openalex-")) return `id:${id}`;

  const title = String(paper.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "")
    .slice(0, 80);
  return `title:${title}`;
}

export function publicSourceWeight(source?: string): number {
  return PUBLIC_SOURCE_WEIGHT[String(source || "").toLowerCase()] || 1;
}

function yearFromPublicDate(value?: string): number | null {
  if (!value) return null;
  const year = Number.parseInt(String(value).slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function citationVelocity(citations?: number, year?: number, currentYear = new Date().getFullYear()): number {
  const count = Math.max(0, Number(citations || 0));
  const y = Number(year || 0);
  const age = y >= 1900 ? Math.max(1, currentYear - y + 1) : 20;
  const absolute = Math.min(count, 500) / 500;
  const velocity = Math.min(count / age, 50) / 50;
  return 0.5 * absolute + 0.5 * velocity;
}

function queryTokens(query: string): string[] {
  const generic = new Set(['and', 'or', 'the', 'with', 'from', 'into', 'dataset', 'data', 'search', 'paper', 'papers']);
  return Array.from(new Set((query || '').toLowerCase().match(/[a-z0-9가-힣-]{3,}/g) || []))
    .map((tok) => tok === 'rnaseq' ? 'rna-seq' : tok)
    .filter((tok) => !generic.has(tok));
}

function tokenHit(text: string, token: string): boolean {
  const prefix = token.slice(0, Math.max(5, token.length - 2));
  return text.includes(token) || text.includes(prefix);
}

function weightedQueryScore(title: string, body: string, query: string): number {
  const tokens = queryTokens(normalizePublicBioQuery(query));
  if (!tokens.length) return 0;
  const t = (title || '').toLowerCase();
  const b = (body || '').toLowerCase();
  const titleHits = tokens.filter((tok) => tokenHit(t, tok)).length;
  const bodyHits = tokens.filter((tok) => tokenHit(b, tok)).length;
  const andCoverage = titleHits === tokens.length || (titleHits + bodyHits) >= tokens.length ? 1 : 0;
  const orCoverage = Math.max(titleHits, titleHits + bodyHits * 0.45) / tokens.length;
  const exactPhrase = t.includes(query.toLowerCase()) ? 1 : 0;
  return Math.min(1.8, 1.05 * orCoverage + 0.45 * andCoverage + 0.3 * exactPhrase);
}

function topicOverlap(text: string, query: string): number {
  if (!query || !text) return 0;
  return Math.min(1, weightedQueryScore('', text, query));
}

export function publicWorkflowScore(paper: PublicPaperLike, query = "", currentYear = new Date().getFullYear()): number {
  const year = Number(paper.year || 0);
  const age = year > 0 ? Math.max(0, currentYear - year) : 20;
  const recency = Math.max(0, 30 - age * 2);
  // Citations excluded from relevance score — surfaced as user-facing sort option only.
  // cite velocity × 40 previously dominated topicBonus × 15, causing high-citation
  // off-topic papers (e.g. COVID papers) to outrank genuinely relevant results.
  const influence = Math.min(20, Number(paper.influenceScore || 0) / 5);
  const metadata = (paper.meshTerms?.length ? 5 : 0) + (paper.techniques?.length ? 5 : 0);
  const doiBonus = paper.doi ? 3 : 0;
  const abstractBonus = paper.abstract && paper.abstract.length > 80 ? 4 : 0;
  const topicBonus = query ? Math.round(weightedQueryScore(paper.title || "", paper.abstract || "", normalizePublicBioQuery(query)) * 32) : 0;
  return (recency + influence + metadata + doiBonus + abstractBonus + topicBonus) * publicSourceWeight(paper.source);
}

export function publicTopicGuard(paper: PublicPaperLike, query: string): boolean {
  const tokens = normalizePublicBioQuery(query).toLowerCase().match(/[a-z0-9가-힣]{3,}/g) || [];
  if (tokens.length < 2) return true;

  const text = `${paper.title || ""} ${paper.abstract || ""}`.toLowerCase();
  // Prefix match (first 6 chars min) handles stemming: "endometrium" matches "endometrial"
  const matched = tokens.filter((token) => {
    const prefix = token.slice(0, Math.max(5, token.length - 2));
    return text.includes(prefix);
  }).length;
  if (/\bor\b/i.test(query)) {
    return matched >= 1;
  }

  // Require ≥50% of tokens to match — author-name tokens in mixed queries won't appear
  // in paper abstracts, so threshold=1.0 would drop all results for "name + topic" queries.
  const threshold = 0.5;
  return matched / Math.max(1, tokens.length) >= threshold;
}

const BIBLIOGRAPHIC_SOURCE_PRIORITY: Record<string, number> = {
  pubmed: 100,
  europepmc: 95,
  crossref: 90,
  openalex: 75,
  semantic: 65,
  biorxiv: 60,
  arxiv: 55,
};

function bibliographicSourcePriority(source?: string): number {
  return BIBLIOGRAPHIC_SOURCE_PRIORITY[String(source || '').toLowerCase()] || 50;
}

function preferBibliographicValue<TValue>(prev: PublicPaperLike, next: PublicPaperLike, field: keyof PublicPaperLike): TValue | undefined {
  const prevValue = prev[field] as TValue | undefined;
  const nextValue = next[field] as TValue | undefined;
  const prevHasValue = Array.isArray(prevValue) ? prevValue.length > 0 : Boolean(prevValue);
  const nextHasValue = Array.isArray(nextValue) ? nextValue.length > 0 : Boolean(nextValue);
  if (!nextHasValue) return prevValue;
  if (!prevHasValue) return nextValue;
  return bibliographicSourcePriority(next.source) > bibliographicSourcePriority(prev.source) ? nextValue : prevValue;
}

export function mergePublicPaperRecords<T extends PublicPaperLike>(papers: T[]): T[] {
  const byKey = new Map<string, T & { sourceHits?: string[]; sourceIds?: string[] }>();

  for (const paper of papers) {
    const key = publicDedupeKey(paper);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, {
        ...paper,
        sourceHits: paper.source ? [String(paper.source)] : [],
        sourceIds: paper.id ? [String(paper.id)] : [],
      });
      continue;
    }

    const sourceHits = new Set([...(prev.sourceHits || []), paper.source].filter(Boolean).map(String));
    const sourceIds = new Set([...(prev.sourceIds || []), paper.id].filter(Boolean).map(String));
    const preferredSource = bibliographicSourcePriority(paper.source) > bibliographicSourcePriority(prev.source) ? paper : prev;
    byKey.set(key, {
      ...prev,
      ...paper,
      // Bibliographic metadata must stay anchored to the most trusted source DB.
      // Enrichment/secondary APIs may add metrics, citations, abstracts, etc., but
      // must not silently rewrite title/authors/journal/year/source identity.
      id: preferredSource.id || prev.id || paper.id,
      source: preferredSource.source || prev.source || paper.source,
      title: preferBibliographicValue<string>(prev, paper, 'title'),
      authors: preferBibliographicValue<string[]>(prev, paper, 'authors'),
      year: preferBibliographicValue<number>(prev, paper, 'year'),
      journal: preferBibliographicValue<string>(prev, paper, 'journal'),
      journalIssn: preferBibliographicValue<string>(prev, paper, 'journalIssn'),
      doi: prev.doi || paper.doi,
      url: preferBibliographicValue<string>(prev, paper, 'url') || prev.url || paper.url,
      abstract: (paper.abstract || "").length > (prev.abstract || "").length ? paper.abstract : prev.abstract,
      citations: Math.max(Number(prev.citations || 0), Number(paper.citations || 0)),
      meshTerms: Array.from(new Set([...(prev.meshTerms || []), ...(paper.meshTerms || [])])),
      techniques: Array.from(new Set([...(prev.techniques || []), ...(paper.techniques || [])])),
      sourceHits: Array.from(sourceHits),
      sourceIds: Array.from(sourceIds),
    });
  }

  return Array.from(byKey.values()) as T[];
}

export function publicDatasetDedupeKey(item: PublicDatasetLike): string {
  const accessions = item.accessionIds || [];
  if (accessions.length) return `accession:${accessions[0]}`;
  const url = String(item.url || "").toLowerCase().trim();
  if (url) return `url:${url.replace(/[?#].*$/, "")}`;
  const title = String(item.title || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 100);
  return `title:${title}`;
}

export function publicDatasetSourceWeight(source?: string): number {
  return PUBLIC_DATASET_SOURCE_WEIGHT[String(source || "").toLowerCase()] || 1;
}

export function publicDatasetWorkflowScore(item: PublicDatasetLike, currentYear = new Date().getFullYear()): number {
  const year = yearFromPublicDate(item.updatedAt);
  const age = year !== null ? Math.max(0, currentYear - year) : 20;
  const recency = Math.max(0, 30 - age * 3);
  const downloads = item.downloads ? Math.min(30, Math.log10(item.downloads + 1) * 10) : 0;
  const likes = item.likes ? Math.min(25, Math.log10(item.likes + 1) * 10) : 0;
  const accessions = item.accessionIds?.length ? 18 : 0;
  const license = item.license ? 5 : 0;
  const tags = item.tags?.length ? Math.min(10, item.tags.length) : 0;
  const description = item.description && item.description.length > 80 ? 10 : 0;
  return (recency + downloads + likes + accessions + license + tags + description) * publicDatasetSourceWeight(item.source);
}

export function publicDatasetTopicGuard(item: PublicDatasetLike, query: string): boolean {
  const q = normalizePublicBioQuery(query).toLowerCase();
  const tokens = q.match(/[a-z0-9가-힣]{3,}/g) || [];
  if (tokens.length < 2) return true;

  const text = `${item.title || ""} ${item.description || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  const source = String(item.source || "").toLowerCase();

  const generic = ["dataset", "datasets", "data", "search", "single", "cell", "cells", "rna", "seq", "rnaseq", "sequencing", "transcriptomic", "transcriptomics"];
  const important = tokens.filter((token) => !generic.includes(token));
  const targetTokens = important.length >= 2 ? important : tokens;

  const accessionBacked = Boolean(item.accessionIds?.length);
  const paperDerived = ["openalex", "crossref"].includes(source);

  if (paperDerived && !accessionBacked && q.includes("dataset")) return false;

  const isExpandedOrQuery = /\bor\b/i.test(query);
  const matched = targetTokens.filter((token) => text.includes(token)).length;
  if (isExpandedOrQuery) {
    const assayTerms = ["organoid", "scrna", "single", "rna", "seq", "rnaseq", "transcriptomics", "atac", "chip", "spatial", "proteomics", "metabolomics"];
    const requestedAssayTerms = targetTokens.filter((token) => assayTerms.includes(token));
    const assayOk = requestedAssayTerms.length === 0 || requestedAssayTerms.some((token) => text.includes(token));
    return assayOk && (matched >= 1 || accessionBacked);
  }

  // Enforce all query-specific tokens (length ≥5 are specific enough)
  for (const token of targetTokens) {
    if (token.length >= 5 && !text.includes(token)) return false;
  }

  if (paperDerived && !accessionBacked && matched < Math.min(2, targetTokens.length)) return false;

  return matched / Math.max(1, targetTokens.length) >= 0.25 || (accessionBacked && matched >= 1);
}

export function mergePublicDatasetRecords<T extends PublicDatasetLike>(items: T[]): T[] {
  const byKey = new Map<string, T & { sourceHits?: string[] }>();

  for (const item of items) {
    const key = publicDatasetDedupeKey(item);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...item, sourceHits: item.source ? [String(item.source)] : [] });
      continue;
    }
    const sourceHits = new Set([...(prev.sourceHits || []), item.source].filter(Boolean).map(String));
    byKey.set(key, {
      ...prev,
      ...item,
      title: prev.title || item.title,
      description: (item.description || "").length > (prev.description || "").length ? item.description : prev.description,
      accessionIds: Array.from(new Set([...(prev.accessionIds || []), ...(item.accessionIds || [])])),
      tags: Array.from(new Set([...(prev.tags || []), ...(item.tags || [])])),
      downloads: Math.max(Number(prev.downloads || 0), Number(item.downloads || 0)) || undefined,
      likes: Math.max(Number(prev.likes || 0), Number(item.likes || 0)) || undefined,
      sourceHits: Array.from(sourceHits),
    });
  }

  return Array.from(byKey.values()) as T[];
}

export function publicSourceHealth(source: string, result: PromiseSettledResult<unknown[]>, durationMs?: number): PublicSourceHealth {
  if (result.status === "fulfilled") {
    return { source, ok: true, count: Array.isArray(result.value) ? result.value.length : 0, durationMs };
  }
  return {
    source,
    ok: false,
    count: 0,
    durationMs,
    warning: result.reason instanceof Error ? result.reason.message : String(result.reason || "source failed"),
  };
}

const SPECIES_PATTERNS: Array<[RegExp, string]> = [
  [/\bhuman\b|homo sapiens/i, "human"],
  [/\bmouse\b|\bmurine\b|mus musculus/i, "mouse"],
  [/\bbovine\b|\bcow\b|\bcattle\b|bos taurus/i, "bovine"],
  [/\bequine\b|\bhorse\b|equus caballus/i, "equine"],
  [/\bporcine\b|\bpig\b|sus scrofa/i, "porcine"],
  [/\bcanine\b|\bdog\b|canis familiaris/i, "canine"],
  [/\bzebrafish\b|danio rerio/i, "zebrafish"],
  [/\brat\b|\brattu/i, "rat"],
];

const TECHNIQUE_PATTERNS: Array<[RegExp, string]> = [
  [/single[-\s]?cell|scrna[-\s]?seq/i, "single-cell RNA-seq"],
  [/rna[-\s]?seq(?!\w)/i, "RNA-seq"],
  [/\borganoid/i, "organoid"],
  [/\bcrispr/i, "CRISPR"],
  [/atac[-\s]?seq/i, "ATAC-seq"],
  [/chip[-\s]?seq/i, "ChIP-seq"],
  [/spatial\s+transcriptom/i, "spatial transcriptomics"],
  [/\bproteom/i, "proteomics"],
  [/\bmetabolom/i, "metabolomics"],
];

export function buildPublicSuggestedTopics(papers: PublicPaperLike[], query: string): SuggestedTopic[] {
  if (!papers.length) return [];
  const suggestions: SuggestedTopic[] = [];
  const q = normalizePublicBioQuery(query).toLowerCase();

  // Species facets
  for (const [pattern, label] of SPECIES_PATTERNS) {
    if (q.includes(label)) continue;
    const count = papers.filter((p) => pattern.test(`${p.title || ""} ${p.abstract || ""}`)).length;
    if (count >= 2) {
      suggestions.push({ type: "species", label: `${label.charAt(0).toUpperCase() + label.slice(1)} papers`, query: `${query} ${label}`, count });
    }
  }

  // Technique facets
  for (const [pattern, label] of TECHNIQUE_PATTERNS) {
    if (pattern.test(q)) continue;
    const count = papers.filter((p) => pattern.test(`${p.title || ""} ${p.abstract || ""}`)).length;
    if (count >= 2) {
      suggestions.push({ type: "technique", label, query: `${query} ${label}`, count });
    }
  }

  // Year facets
  const currentYear = new Date().getFullYear();
  const recentCount = papers.filter((p) => Number(p.year || 0) >= currentYear - 3).length;
  if (recentCount >= 2 && recentCount < papers.length) {
    suggestions.push({ type: "year", label: `${currentYear - 3}+ (recent)`, query: `${query} after:${currentYear - 3}`, count: recentCount });
  }
  const foundationalCount = papers.filter((p) => Number(p.year || 0) > 0 && Number(p.year || 0) < 2020).length;
  if (foundationalCount >= 2) {
    suggestions.push({ type: "year", label: "Before 2020 (foundational)", query: `${query} before:2020`, count: foundationalCount });
  }

  // MeSH facets from aggregated paper meshTerms
  const meshCounts = new Map<string, number>();
  for (const p of papers) {
    for (const term of p.meshTerms || []) {
      meshCounts.set(term, (meshCounts.get(term) || 0) + 1);
    }
  }
  for (const [term, count] of meshCounts) {
    if (count >= 3 && !q.includes(term.toLowerCase())) {
      suggestions.push({ type: "mesh", label: term, query: `${query} "${term}"[MeSH Terms]`, count });
    }
  }

  return suggestions.sort((a, b) => b.count - a.count).slice(0, 8);
}

export function buildPublicDatasetSuggestedTopics(items: PublicDatasetLike[], query: string): SuggestedTopic[] {
  if (!items.length) return [];
  const suggestions: SuggestedTopic[] = [];
  const q = normalizePublicBioQuery(query).toLowerCase();

  // Species facets
  for (const [pattern, label] of SPECIES_PATTERNS) {
    if (q.includes(label)) continue;
    const count = items.filter((d) => pattern.test(`${d.title || ""} ${d.description || ""} ${(d.tags || []).join(" ")}`)).length;
    if (count >= 2) {
      suggestions.push({ type: "species", label: `${label.charAt(0).toUpperCase() + label.slice(1)} datasets`, query: `${query} ${label}`, count });
    }
  }

  // Technique facets
  for (const [pattern, label] of TECHNIQUE_PATTERNS) {
    if (pattern.test(q)) continue;
    const count = items.filter((d) => pattern.test(`${d.title || ""} ${d.description || ""} ${(d.tags || []).join(" ")}`)).length;
    if (count >= 2) {
      suggestions.push({ type: "technique", label, query: `${query} ${label}`, count });
    }
  }

  // Source facets
  const sourceCounts = new Map<string, number>();
  for (const d of items) {
    if (d.source) sourceCounts.set(d.source, (sourceCounts.get(d.source) || 0) + 1);
  }
  for (const [src, count] of sourceCounts) {
    if (count >= 2) {
      suggestions.push({ type: "source", label: src.toUpperCase(), query: `${query} source:${src}`, count });
    }
  }

  // Accession-backed only
  const accessionCount = items.filter((d) => d.accessionIds?.length).length;
  if (accessionCount >= 2 && accessionCount < items.length) {
    suggestions.push({ type: "filter", label: "Accession-backed only", query: `${query} has:accession`, count: accessionCount });
  }

  return suggestions.sort((a, b) => b.count - a.count).slice(0, 8);
}
