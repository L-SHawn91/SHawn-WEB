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

export function publicWorkflowScore(paper: PublicPaperLike, currentYear = new Date().getFullYear()): number {
  const year = Number(paper.year || 0);
  const age = year > 0 ? Math.max(0, currentYear - year) : 20;
  const recency = Math.max(0, 30 - age * 2);
  const citations = Math.min(40, Number(paper.citations || 0) / 10);
  const influence = Math.min(20, Number(paper.influenceScore || 0) / 5);
  const metadata = (paper.meshTerms?.length ? 5 : 0) + (paper.techniques?.length ? 5 : 0);
  return (recency + citations + influence + metadata) * publicSourceWeight(paper.source);
}

export function publicTopicGuard(paper: PublicPaperLike, query: string): boolean {
  const tokens = normalizePublicBioQuery(query).toLowerCase().match(/[a-z0-9가-힣]{3,}/g) || [];
  if (tokens.length < 2) return true;

  const text = `${paper.title || ""} ${paper.abstract || ""}`.toLowerCase();
  const matched = tokens.filter((token) => text.includes(token)).length;
  return matched / Math.max(1, tokens.length) >= 0.15;
}
