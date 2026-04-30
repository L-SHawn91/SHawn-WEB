import { NextRequest, NextResponse } from "next/server";

type RelatedItem = {
  id: string;
  title: string;
  year?: number;
  source: "pubmed" | "openalex" | "europepmc";
  url: string;
  reason?: string;
};

type RelatedDatasetItem = {
  id: string;
  title: string;
  source: "ncbi";
  url: string;
  accessionIds?: string[];
  reason?: string;
};

function normalizeKey(value?: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 120);
}

function extractAccessions(text: string): string[] {
  return Array.from(new Set((text.match(/\b(GSE\d+|GSM\d+|SRP\d+|SRS\d+|SRX\d+|SRR\d+|PRJNA\d+|PRJEB\d+|PRJCA\d+)\b/gi) || []).map((x) => x.toUpperCase())));
}

function stripSelf<T extends { id: string; title: string; url?: string }>(items: T[], exclude: { id?: string; title?: string; url?: string }): T[] {
  const excludeId = normalizeKey(exclude.id);
  const excludeTitle = normalizeKey(exclude.title);
  const excludeUrl = String(exclude.url || "").replace(/[?#].*$/, "").toLowerCase();
  return items.filter((item) => {
    const itemId = normalizeKey(item.id);
    const itemTitle = normalizeKey(item.title);
    const itemUrl = String(item.url || "").replace(/[?#].*$/, "").toLowerCase();
    if (excludeId && itemId === excludeId) return false;
    if (excludeUrl && itemUrl === excludeUrl) return false;
    if (excludeTitle && itemTitle) {
      if (itemTitle === excludeTitle) return false;
      if (itemTitle.length > 30 && excludeTitle.length > 30 && (itemTitle.includes(excludeTitle) || excludeTitle.includes(itemTitle))) return false;
    }
    return true;
  });
}

async function searchPubMed(query: string): Promise<RelatedItem[]> {
  try {
    const ncbiKey = process.env.NCBI_API_KEY || "";
    const params = new URLSearchParams({ db: "pubmed", term: query, retmode: "json", retmax: "5", sort: "relevance", ...(ncbiKey ? { api_key: ncbiKey } : {}) });
    const s = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params.toString()}`, { signal: AbortSignal.timeout(8000) });
    const d = await s.json();
    const ids: string[] = d?.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const sp = new URLSearchParams({ db: "pubmed", id: ids.join(","), retmode: "json", ...(ncbiKey ? { api_key: ncbiKey } : {}) });
    const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${sp.toString()}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();

    const mapped: Array<RelatedItem | null> = ids.map((id) => {
      const row = j?.result?.[id];
      if (!row) return null;
      return {
        id: `pmid-${id}`,
        title: row.title || "Untitled",
        year: parseInt(String(row.pubdate || "").slice(0, 4)) || undefined,
        source: "pubmed" as const,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        reason: `Matched by PubMed query: ${query || "relevant dataset/seed"}`,
      };
    });
    return mapped.filter((x): x is RelatedItem => x !== null);
  } catch {
    return [];
  }
}

async function searchOpenAlex(query: string): Promise<RelatedItem[]> {
  try {
    const p = new URLSearchParams({ search: query, per_page: "5", select: "id,display_name,publication_year,primary_location" });
    const r = await fetch(`https://api.openalex.org/works?${p.toString()}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const rows = j?.results;
    if (!Array.isArray(rows)) return [];
    return rows.map((x: any) => ({
      id: `openalex-${x.id || Math.random().toString(36).slice(2)}`,
      title: x.display_name || "Untitled",
      year: x.publication_year || undefined,
      source: "openalex" as const,
      url: x?.primary_location?.landing_page_url || x?.id || "https://openalex.org",
      reason: `OpenAlex relevance match for query: ${query || "seed"}`,
    }));
  } catch {
    return [];
  }
}

async function searchEuropePmc(query: string): Promise<RelatedItem[]> {
  try {
    const p = new URLSearchParams({ query, pageSize: "5", format: "json", resultType: "core" });
    const r = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${p.toString()}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const rows = j?.resultList?.result;
    if (!Array.isArray(rows)) return [];
    return rows.map((x: any) => ({
      id: `eupmc-${x.id || Math.random().toString(36).slice(2)}`,
      title: x.title || "Untitled",
      year: x.pubYear ? parseInt(String(x.pubYear)) : undefined,
      source: "europepmc" as const,
      url: x.id ? `https://europepmc.org/article/${x.source || "MED"}/${x.id}` : "https://europepmc.org",
      reason: `Europe PMC match for query: ${query || "seed"}`,
    }));
  } catch {
    return [];
  }
}

function buildDatasetQueryFromPaperTitle(title: string): string {
  const t = String(title || "").toLowerCase();
  const terms: string[] = [];
  if (/endometr|uterus|uterine/.test(t)) terms.push("endometrial", "endometrium", "uterus");
  if (/organoid|3d culture|organotypic/.test(t)) terms.push("organoid");
  if (/single[-\s]?cell|scrna/.test(t)) terms.push("single cell RNA-seq");
  if (/rna[-\s]?seq|transcriptom|gene expression/.test(t)) terms.push("RNA-seq");
  if (/implantation|receptiv/.test(t)) terms.push("implantation", "receptivity");
  const unique = Array.from(new Set(terms));
  if (unique.length >= 2) return unique.join(" OR ");
  return title;
}

async function searchNcbiDatasets(query: string): Promise<RelatedDatasetItem[]> {
  try {
    const ncbiKey = process.env.NCBI_API_KEY || "";
    const params = new URLSearchParams({ db: "gds", term: query, retmode: "json", retmax: "6", sort: "relevance", ...(ncbiKey ? { api_key: ncbiKey } : {}) });
    const s = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params.toString()}`, { signal: AbortSignal.timeout(8000) });
    const d = await s.json();
    const ids: string[] = d?.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const sp = new URLSearchParams({ db: "gds", id: ids.join(","), retmode: "json", ...(ncbiKey ? { api_key: ncbiKey } : {}) });
    const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${sp.toString()}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    return ids.map((id) => {
      const row = j?.result?.[id] || {};
      const text = `${row.accession || ""} ${row.title || ""} ${row.summary || ""}`;
      const accession = extractAccessions(text)[0] || String(row.accession || id).toUpperCase();
      return {
        id: `ncbi-gds-${accession}`,
        title: row.title || row.gds || `NCBI dataset ${accession}`,
        source: "ncbi" as const,
        url: `https://www.ncbi.nlm.nih.gov/gds/?term=${encodeURIComponent(accession)}`,
        accessionIds: accession ? [accession] : [],
        reason: `NCBI dataset match for query: ${query || "paper title"}`,
      };
    });
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { kind, title, accessionIds, excludeId, excludeTitle, excludeUrl } = await req.json();
    const baseQuery = (title || "").toString().trim();
    const acc = Array.isArray(accessionIds) ? accessionIds.slice(0, 3).join(" OR ") : "";
    const query = kind === "dataset" ? [acc, baseQuery].filter(Boolean).join(" OR ") : baseQuery;
    if (!query) return NextResponse.json({ items: [], datasets: [] });

    const [pubmed, openalex, europepmc, datasets] = await Promise.all([
      searchPubMed(query),
      searchOpenAlex(query),
      kind === "dataset" ? searchEuropePmc(query) : Promise.resolve([] as RelatedItem[]),
      kind === "paper" ? searchNcbiDatasets(buildDatasetQueryFromPaperTitle(baseQuery)) : Promise.resolve([] as RelatedDatasetItem[]),
    ]);

    const seen = new Set<string>();
    const items = stripSelf([...pubmed, ...openalex, ...europepmc], {
      id: excludeId,
      title: excludeTitle || title,
      url: excludeUrl,
    }).filter((x) => {
      const k = normalizeKey(x.title);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 5);

    const datasetSeen = new Set<string>();
    const relatedDatasets = stripSelf(datasets, { id: excludeId, title: excludeTitle || title, url: excludeUrl })
      .filter((x) => {
        const k = normalizeKey(x.accessionIds?.[0] || x.title);
        if (datasetSeen.has(k)) return false;
        datasetSeen.add(k);
        return true;
      })
      .slice(0, 5);

    return NextResponse.json({ items, datasets: relatedDatasets });
  } catch {
    return NextResponse.json({ items: [], datasets: [] });
  }
}

export const dynamic = "force-dynamic";
