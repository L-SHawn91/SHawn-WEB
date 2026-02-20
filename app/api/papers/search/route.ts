// /app/api/papers/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  source: 'pubmed' | 'arxiv' | 'semantic';
  url: string;
  pdfUrl?: string;
  citations?: number;
}

function isPaper(paper: Paper | null): paper is Paper {
  return paper !== null;
}

// Parallel search across multiple sources
async function searchPubMed(query: string, yearFrom?: string, yearTo?: string): Promise<Paper[]> {
  try {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const params = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmode: 'json',
      retmax: '10',
      sort: 'relevance',
    });
    
    // Add date filters if provided
    if (yearFrom || yearTo) {
      const minDate = yearFrom || '1900';
      const maxDate = yearTo || '2100';
      params.set('mindate', `${minDate}/01/01`);
      params.set('maxdate', `${maxDate}/12/31`);
      params.set('datetype', 'pdat');
    }

    const searchRes = await fetch(`${baseUrl}?${params.toString()}`);
    const searchData = await searchRes.json();
    
    const ids: string[] = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Fetch details
    const summaryUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    });

    const summaryRes = await fetch(`${summaryUrl}?${summaryParams.toString()}`);
    const summaryData = await summaryRes.json();

    const papers: Paper[] = [];
    for (const id of ids as string[]) {
      const doc = summaryData.result?.[id];
      if (!doc) continue;

      papers.push({
        id: `pmid-${id}`,
        title: doc.title || 'No title',
        authors: doc.authors?.map((a: any) => `${a.name}`) || [],
        abstract: doc.abstract || 'No abstract available',
        year: parseInt(doc.pubdate?.substring(0, 4)) || new Date().getFullYear(),
        source: 'pubmed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      });
    }
    return papers;
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

async function searchArXiv(query: string, yearFrom?: string, yearTo?: string): Promise<Paper[]> {
  try {
    const baseUrl = 'http://export.arxiv.org/api/query';
    const params = new URLSearchParams({
      search_query: `all:${query}`,
      start: '0',
      max_results: '10',
      sortBy: 'relevance',
      sortOrder: 'descending',
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`);
    const xml = await res.text();
    
    // Parse XML
    const entries = xml.match(/<entry[>\s][\s\S]*?<\/entry>/g) || [];
    
    const papers: Paper[] = [];
    for (const [idx, entry] of entries.entries()) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || 'No title';
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || 'No abstract';
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || `arxiv-${idx}`;
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim();
      const year = published ? parseInt(published.substring(0, 4)) : new Date().getFullYear();

      // Check year filter
      if (yearFrom && year < parseInt(yearFrom)) continue;
      if (yearTo && year > parseInt(yearTo)) continue;

      const authors = (entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g) || [])
        .map((a) => a.match(/<name>([\s\S]*?)<\/name>/)?.[1])
        .filter((name): name is string => Boolean(name));

      const arxivId = id.split('/').pop()?.replace('abs/', '') || '';
      papers.push({
        id: `arxiv-${arxivId}`,
        title,
        authors,
        abstract: summary,
        year,
        source: 'arxiv',
        url: `https://arxiv.org/abs/${arxivId}`,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
      });
    }
    return papers;
  } catch (error) {
    console.error('arXiv search error:', error);
    return [];
  }
}

async function searchSemantic(query: string, yearFrom?: string, yearTo?: string): Promise<Paper[]> {
  try {
    const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
    const params = new URLSearchParams({
      query,
      limit: '10',
      fields: 'title,authors,year,abstract,url,citationCount,openAccessPdf',
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await res.json();
    
    return (data.data || [])
      .filter((paper: any) => {
        if (yearFrom && paper.year < parseInt(yearFrom)) return false;
        if (yearTo && paper.year > parseInt(yearTo)) return false;
        return true;
      })
      .map((paper: any) => ({
        id: `semantic-${paper.paperId}`,
        title: paper.title || 'No title',
        authors: paper.authors?.map((a: any) => a.name) || [],
        abstract: paper.abstract || 'No abstract available',
        year: paper.year || new Date().getFullYear(),
        source: 'semantic' as const,
        url: paper.url,
        pdfUrl: paper.openAccessPdf?.url,
        citations: paper.citationCount,
      }));
  } catch (error) {
    console.error('Semantic Scholar search error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, filters } = await request.json();
    
    const sources = filters?.sources || ['pubmed', 'arxiv', 'semantic'];
    const yearFrom = filters?.yearFrom;
    const yearTo = filters?.yearTo;

    // Run searches in parallel
    const searchPromises: Promise<Paper[]>[] = [];
    
    if (sources.includes('pubmed')) {
      searchPromises.push(searchPubMed(query, yearFrom, yearTo));
    }
    if (sources.includes('arxiv')) {
      searchPromises.push(searchArXiv(query, yearFrom, yearTo));
    }
    if (sources.includes('semantic')) {
      searchPromises.push(searchSemantic(query, yearFrom, yearTo));
    }

    const results = await Promise.all(searchPromises);
    
    // Merge and sort by relevance (year + source priority)
    const allPapers = results.flat().sort((a, b) => {
      // Prioritize recent papers
      if (b.year !== a.year) return b.year - a.year;
      // Then by citations
      return (b.citations || 0) - (a.citations || 0);
    });

    return NextResponse.json({ papers: allPapers });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed', papers: [] },
      { status: 500 }
    );
  }
}

// Rate limiting
export const dynamic = 'force-dynamic';
export const revalidate = 0;
