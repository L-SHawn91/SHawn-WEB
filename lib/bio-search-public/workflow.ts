export type PublicPaperLike = {
  id?: string;
  title?: string;
  abstract?: string;
  year?: number;
  source?: string;
  doi?: string;
  url?: string;
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

const PUBLIC_SOURCE_WEIGHT: Record<string, number> = {
  pubmed: 1.16,
  europepmc: 1.12,
  crossref: 1.06,
  openalex: 1.04,
  semantic: 1.0,
  arxiv: 0.94,
  biorxiv: 0.92,
  medrxiv: 0.92,
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
];

const EXPANSION_SYNONYMS: Array<[RegExp, string[]]> = [
  [/\borganoid(s)?\b/i, ["3D culture", "organotypic culture"]],
  [/\bendometr/i, ["uterine lining", "endometrium"]],
  [/\bscrna\b|single[-\s]?cell/i, ["single cell RNA sequencing", "single-cell transcriptomics"]],
  [/\brna[-\s]?seq\b/i, ["transcriptomics", "gene expression profiling"]],
  [/\bfish\b/i, ["fluorescence in situ hybridization"]],
];

export function normalizePublicBioQuery(query: string): string {
  return (query || "")
    .normalize("NFKC")
    .replace(/([A-Za-z])([가-힣])/g, "$1 $2")
    .replace(/([가-힣])([A-Za-z])/g, "$1 $2")
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

export function publicWorkflowScore(paper: PublicPaperLike, currentYear = new Date().getFullYear()): number {
  const year = Number(paper.year || 0);
  const age = year > 0 ? Math.max(0, currentYear - year) : 20;
  const recency = Math.max(0, 30 - age * 2);
  const citations = citationVelocity(paper.citations, year, currentYear) * 40;
  const influence = Math.min(20, Number(paper.influenceScore || 0) / 5);
  const metadata = (paper.meshTerms?.length ? 5 : 0) + (paper.techniques?.length ? 5 : 0);
  const doiBonus = paper.doi ? 3 : 0;
  const abstractBonus = paper.abstract && paper.abstract.length > 80 ? 4 : 0;
  return (recency + citations + influence + metadata + doiBonus + abstractBonus) * publicSourceWeight(paper.source);
}

export function publicTopicGuard(paper: PublicPaperLike, query: string): boolean {
  const tokens = normalizePublicBioQuery(query).toLowerCase().match(/[a-z0-9가-힣]{3,}/g) || [];
  if (tokens.length < 2) return true;

  const text = `${paper.title || ""} ${paper.abstract || ""}`.toLowerCase();
  const q = normalizePublicBioQuery(query).toLowerCase();
  const negativeTerms = ["prostate", "hepatic", "renal", "cervical", "arabidopsis", "plant", "zebrafish"];
  if (negativeTerms.some((term) => text.includes(term) && !q.includes(term))) return false;
  // Prefix match (first 6 chars min) handles stemming: "endometrium" matches "endometrial"
  const matched = tokens.filter((token) => {
    const prefix = token.slice(0, Math.max(5, token.length - 2));
    return text.includes(prefix);
  }).length;
  // Short queries (≤3 tokens): require all tokens — prevents e.g. cow uterine paper
  // passing on "endometrium" alone for "DHCR24 endometrium" query.
  // Longer queries: require ≥50%.
  const threshold = tokens.length <= 3 ? 1.0 : 0.5;
  return matched / Math.max(1, tokens.length) >= threshold;
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
    byKey.set(key, {
      ...prev,
      ...paper,
      title: prev.title || paper.title,
      abstract: (paper.abstract || "").length > (prev.abstract || "").length ? paper.abstract : prev.abstract,
      doi: prev.doi || paper.doi,
      url: prev.url || paper.url,
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
  const negativeTerms = ["prostate", "hepatic", "renal", "cervical", "arabidopsis", "plant", "zebrafish", "retina", "retinal", "cerebral", "brain", "colorectal", "pancreatic", "pancreas", "cardioid", "cardiac", "colonic"];
  if (negativeTerms.some((term) => text.includes(term) && !q.includes(term))) return false;

  const generic = ["dataset", "datasets", "data", "search", "single", "cell", "cells", "rna", "seq", "rnaseq", "sequencing", "transcriptomic", "transcriptomics"];
  const important = tokens.filter((token) => !generic.includes(token));
  const targetTokens = important.length >= 2 ? important : tokens;
  const matched = targetTokens.filter((token) => text.includes(token)).length;
  const accessionBacked = Boolean(item.accessionIds?.length);
  const paperDerived = ["openalex", "crossref"].includes(source);
  const tissueTerms = ["endometrial", "endometrium", "uterine", "uterus", "decidual", "decidua"];
  const requestedTissue = tissueTerms.filter((term) => q.includes(term));
  const hasRequestedTissue = requestedTissue.length === 0 || requestedTissue.some((term) => text.includes(term));
  const requestedSingleCell = q.includes("single cell") || q.includes("single-cell") || q.includes("scrna");
  const hasSingleCellSignal = !requestedSingleCell || /single[-\s]?cell|scrna|single cell rna|single-cell transcript/i.test(text);
  const requestedRnaSeq = /rna[-\s]?seq|rnaseq|transcriptom/i.test(q);
  const hasRnaSeqSignal = !requestedRnaSeq || /rna[-\s]?seq|rnaseq|transcriptom|gene expression/i.test(text);

  if (paperDerived && !accessionBacked && q.includes("dataset")) return false;
  if (paperDerived && !accessionBacked && matched < Math.min(2, targetTokens.length)) return false;
  if (q.includes("organoid") && !text.includes("organoid")) return false;
  if (!hasRequestedTissue || !hasSingleCellSignal || !hasRnaSeqSignal) return false;
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
