// /app/api/papers/search-parallel/route.ts
// 4-Track Parallel Search Implementation

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
  meshTerms?: string[];
  techniques?: string[];
  influenceScore?: number;
}

function isPaper(paper: Paper | null): paper is Paper {
  return paper !== null;
}

// T1: PubMed track - clinical metadata
async function t1_pubmedEnhanced(query: string, yearFrom?: string, yearTo?: string): Promise<Paper[]> {
  console.log('[T1:PubMed] Search starting...');
  const startTime = Date.now();
  
  try {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const params = new URLSearchParams({
      db: 'pubmed',
      term: `${query} AND (Clinical Trial[pt] OR Meta-Analysis[pt] OR Randomized Controlled Trial[pt] OR Review[pt])`,
      retmode: 'json',
      retmax: '15',
      sort: 'relevance',
    });
    
    if (yearFrom || yearTo) {
      const minDate = yearFrom || '1900';
      const maxDate = yearTo || '2100';
      params.set('mindate', `${minDate}/01/01`);
      params.set('maxdate', `${maxDate}/12/31`);
      params.set('datetype', 'pdat');
    }

    const searchRes = await fetch(`${baseUrl}?${params.toString()}`, { 
      signal: AbortSignal.timeout(15000) 
    });
    const searchData = await searchRes.json();
    
    const ids = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) {
      console.log('[T1:PubMed] No results');
      return [];
    }

    // Fetch detailed info including MeSH terms
    const summaryUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    });

    const summaryRes = await fetch(`${summaryUrl}?${summaryParams.toString()}`, {
      signal: AbortSignal.timeout(15000)
    });
    const summaryData = await summaryRes.json();

    const papers = ids.map((id: string) => {
      const doc = summaryData.result?.[id];
      if (!doc) return null;
      
      // Extract MeSH terms if available
      const meshTerms = doc.meshterms?.map((t: any) => t.name) || [];
      
      // Determine study type
      const pubTypes = doc.pubtype || [];
      const studyType = pubTypes.find((t: string) => 
        t.includes('Clinical Trial') || t.includes('Meta-Analysis') || t.includes('Review')
      );
      
      return {
        id: `pmid-${id}`,
        title: doc.title || 'No title',
        authors: doc.authors?.map((a: any) => `${a.name}`) || [],
        abstract: doc.abstract || 'No abstract available',
        year: parseInt(doc.pubdate?.substring(0, 4)) || new Date().getFullYear(),
        source: 'pubmed' as const,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        meshTerms,
        techniques: studyType ? [studyType] : [],
      };
    }).filter(isPaper);

    console.log(`[T1:PubMed] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T1:PubMed] Error:', error);
    return [];
  }
}

// T2: arXiv track - ML technique extraction
async function t2_arxivEnhanced(query: string, yearFrom?: string, yearTo?: string): Promise<Paper[]> {
  console.log('[T2:arXiv] Search starting...');
  const startTime = Date.now();
  
  try {
    // Enhance query for AI/ML papers
    const mlQuery = `${query} AND (cat:cs.LG OR cat:cs.AI OR cat:cs.CL OR cat:cs.CV)`;
    const baseUrl = 'http://export.arxiv.org/api/query';
    const params = new URLSearchParams({
      search_query: mlQuery,
      start: '0',
      max_results: '15',
      sortBy: 'relevance',
      sortOrder: 'descending',
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      signal: AbortSignal.timeout(15000)
    });
    const xml = await res.text();
    
    const entries = xml.match(/<entry[>\s][\s\S]*?<\/entry>/g) || [];

    const papers: Paper[] = [];
    for (const [idx, entry] of entries.entries()) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || 'No title';
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || 'No abstract';
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || `arxiv-${idx}`;
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim();
      const year = published ? parseInt(published.substring(0, 4)) : new Date().getFullYear();

      // Year filter
      if (yearFrom && year < parseInt(yearFrom)) continue;
      if (yearTo && year > parseInt(yearTo)) continue;

      const authors = (entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g) || [])
        .map((a) => a.match(/<name>([\s\S]*?)<\/name>/)?.[1])
        .filter((name): name is string => Boolean(name));

      // Extract ML techniques from abstract
      const techniqueKeywords = [
        'transformer', 'BERT', 'GPT', 'LLM', 'neural network', 'deep learning',
        'CNN', 'RNN', 'LSTM', 'GRU', 'attention', 'self-attention',
        'reinforcement learning', 'GAN', 'diffusion', 'contrastive learning'
      ];
      const techniques = techniqueKeywords.filter((kw) =>
        summary.toLowerCase().includes(kw.toLowerCase())
      );

      const arxivId = id.split('/').pop()?.replace('abs/', '') || '';
      const paper: Paper = {
        id: `arxiv-${arxivId}`,
        title,
        authors,
        abstract: summary,
        year,
        source: 'arxiv',
        url: `https://arxiv.org/abs/${arxivId}`,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
      };
      if (techniques.length > 0) {
        paper.techniques = techniques;
      }
      papers.push(paper);
    }

    console.log(`[T2:arXiv] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T2:arXiv] Error:', error);
    return [];
  }
}

// T3: Semantic Scholar track - influence analysis
async function t3_semanticEnhanced(query: string, yearFrom?: string, yearTo?: string): Promise<Paper[]> {
  console.log('[T3:Semantic] Search starting...');
  const startTime = Date.now();
  
  try {
    const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
    const params = new URLSearchParams({
      query,
      limit: '15',
      fields: 'title,authors,year,abstract,url,citationCount,referenceCount,influentialCitationCount,openAccessPdf,fieldsOfStudy',
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      signal: AbortSignal.timeout(15000)
    });
    const data = await res.json();
    
    const papers = (data.data || [])
      .filter((paper: any) => {
        if (yearFrom && paper.year < parseInt(yearFrom)) return false;
        if (yearTo && paper.year > parseInt(yearTo)) return false;
        return true;
      })
      .map((paper: any) => {
        // Calculate influence score
        const totalCitations = paper.citationCount || 0;
        const influentialCitations = paper.influentialCitationCount || 0;
        const influenceScore = totalCitations > 0 
          ? Math.round((influentialCitations / totalCitations) * 100) 
          : 0;
        
        return {
          id: `semantic-${paper.paperId}`,
          title: paper.title || 'No title',
          authors: paper.authors?.map((a: any) => a.name) || [],
          abstract: paper.abstract || 'No abstract available',
          year: paper.year || new Date().getFullYear(),
          source: 'semantic' as const,
          url: paper.url,
          pdfUrl: paper.openAccessPdf?.url,
          citations: paper.citationCount,
          influenceScore,
        };
      });

    console.log(`[T3:Semantic] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T3:Semantic] Error:', error);
    return [];
  }
}

// T4: Ranker - Integration & ranking
function t4_integrateAndRank(
  t1Results: Paper[],
  t2Results: Paper[],
  t3Results: Paper[]
): Paper[] {
  console.log('[T4:Ranker] Integration and ranking starting...');
  const startTime = Date.now();
  
  // Merge all results
  const allPapers = [...t1Results, ...t2Results, ...t3Results];
  
  // Deduplication by DOI-like ID or title similarity
  const seen = new Set<string>();
  const uniquePapers = allPapers.filter(paper => {
    const key = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Ranking algorithm
  const rankedPapers = uniquePapers.map(paper => {
    let score = 0;
    
    // Recency (max 30 points)
    const currentYear = new Date().getFullYear();
    const age = currentYear - paper.year;
    score += Math.max(0, 30 - age * 2);
    
    // Citations (max 40 points)
    if (paper.citations) {
      score += Math.min(40, paper.citations / 10);
    }
    
    // Influence score from T3 (max 20 points)
    if (paper.influenceScore) {
      score += paper.influenceScore / 5;
    }
    
    // Source diversity bonus (max 10 points)
    if (paper.meshTerms?.length) score += 5;
    if (paper.techniques?.length) score += 5;
    
    return { ...paper, rankScore: Math.round(score) };
  }).sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
  
  console.log(`[T4:Ranker] Completed in ${Date.now() - startTime}ms, ${uniquePapers.length} unique papers ranked`);
  return rankedPapers;
}

export async function POST(request: NextRequest) {
  const overallStart = Date.now();
  
  try {
    const { query, filters } = await request.json();
    
    const sources = filters?.sources || ['pubmed', 'arxiv', 'semantic'];
    const yearFrom = filters?.yearFrom;
    const yearTo = filters?.yearTo;

    // Execute selected tracks in parallel and preserve source mapping.
    const trackJobs: Array<{
      source: 'pubmed' | 'arxiv' | 'semantic';
      promise: Promise<Paper[]>;
    }> = [];
    
    if (sources.includes('pubmed')) {
      trackJobs.push({ source: 'pubmed', promise: t1_pubmedEnhanced(query, yearFrom, yearTo) });
    }
    if (sources.includes('arxiv')) {
      trackJobs.push({ source: 'arxiv', promise: t2_arxivEnhanced(query, yearFrom, yearTo) });
    }
    if (sources.includes('semantic')) {
      trackJobs.push({ source: 'semantic', promise: t3_semanticEnhanced(query, yearFrom, yearTo) });
    }

    const settled = await Promise.allSettled(trackJobs.map((job) => job.promise));
    const bySource: Record<'pubmed' | 'arxiv' | 'semantic', Paper[]> = {
      pubmed: [],
      arxiv: [],
      semantic: [],
    };
    
    settled.forEach((result, index) => {
      const source = trackJobs[index]?.source;
      if (!source) return;
      bySource[source] = result.status === 'fulfilled' ? result.value : [];
    });
    
    const papers1 = bySource.pubmed;
    const papers2 = bySource.arxiv;
    const papers3 = bySource.semantic;
    
    // T4: Integration and ranking
    const finalPapers = t4_integrateAndRank(papers1, papers2, papers3);
    
    const totalTime = Date.now() - overallStart;
    console.log(`[Parallel Search] Total time: ${totalTime}ms`);
    
    return NextResponse.json({ 
      papers: finalPapers,
      meta: {
        totalTime,
        trackResults: {
          t1: papers1.length,
          t2: papers2.length,
          t3: papers3.length,
          final: finalPapers.length,
        }
      }
    });
  } catch (error) {
    console.error('[Parallel Search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', papers: [] },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
