import { NextRequest, NextResponse } from "next/server";

type RelatedItem = {
  id: string;
  title: string;
  year?: number;
  source: "pubmed" | "openalex" | "europepmc";
  url: string;
  reason?: string;
};

async function searchPubMed(query: string): Promise<RelatedItem[]> {
  console.log("[PubMed] Searching for:", query);
  try {
    const params = new URLSearchParams({ db: "pubmed", term: query, retmode: "json", retmax: "3", sort: "relevance" });
    const s = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params.toString()}`, { signal: AbortSignal.timeout(8000) });
    const d = await s.json();
    const ids: string[] = d?.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const sp = new URLSearchParams({ db: "pubmed", id: ids.join(","), retmode: "json" });
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
        reason: `Matched by PubMed query: ${query || "relevant dataset/seed"}` ,
      };
    });
    return mapped.filter((x): x is RelatedItem => x !== null);
  } catch (e: any) {
    console.error("[PubMed] API error", e);
    return [];
  }
}

async function searchOpenAlex(query: string): Promise<RelatedItem[]> {
  console.log("[OpenAlex] Searching for:", query);
  try {
    const p = new URLSearchParams({ search: query, per_page: "3", select: "id,display_name,publication_year,primary_location" });
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
  } catch (e: any) {
    console.error("[OpenAlex] API error", e);
    return [];
  }
}

async function searchEuropePmc(query: string): Promise<RelatedItem[]> {
  console.log("[EuropePMC] Searching for:", query);
  try {
    const p = new URLSearchParams({ query, pageSize: "3", format: "json", resultType: "core" });
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
  } catch (e: any) {
     console.error("[EuropePMC] API error", e)
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { kind, title, accessionIds } = await req.json();
    const baseQuery = (title || "").toString().trim();
    const acc = Array.isArray(accessionIds) ? accessionIds.slice(0, 3).join(" OR ") : "";
    const query = kind === "dataset" ? [acc, baseQuery].filter(Boolean).join(" OR ") : baseQuery;
    if (!query) return NextResponse.json({ items: [] });

    const [a, b, c] = await Promise.all([
      searchPubMed(query),
      searchOpenAlex(query),
      kind === "dataset" ? searchEuropePmc(query) : Promise.resolve([] as RelatedItem[]),
    ]);

    const merged = [...a, ...b, ...c];
    const seen = new Set<string>();
    const deduped = merged.filter((x) => {
      const k = x.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    console.log("[Related] Returning:", deduped)
    return NextResponse.json({ items: deduped.slice(0, 5) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export const dynamic = "force-dynamic";
