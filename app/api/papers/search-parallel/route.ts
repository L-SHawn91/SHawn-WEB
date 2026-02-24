// /app/api/papers/search-parallel/route.ts
// 4-Track Parallel Search Implementation

import { NextRequest, NextResponse } from 'next/server';
import {
  buildArxivQuery,
  classifyIntent,
  splitAuthorAndTopic,
  type QueryIntent,
} from '../../../../lib/search/queryPlanner';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  source: 'pubmed' | 'arxiv' | 'semantic' | 'crossref' | 'openalex';
  url: string;
  pdfUrl?: string;
  citations?: number;
  meshTerms?: string[];
  techniques?: string[];
  influenceScore?: number;
  matchType?: 'author-exact' | 'author-weak' | 'topic';
}

function isPaper(paper: Paper | null): paper is Paper {
  return paper !== null;
}


type AuthorExtraction = {
  cleanQuery: string;
  authorCandidates: string[];
};

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean).map((value) => value.trim())));
}

function preprocessUserQuery(raw: string): string {
  let q = (raw || "").normalize("NFKC").trim();
  if (!q) return "";

  // Split glued Hangul/Latin tokens: "Bazer논문의" -> "Bazer 논문의"
  q = q
    .replace(/([A-Za-z])([가-힣])/g, "$1 $2")
    .replace(/([가-힣])([A-Za-z])/g, "$1 $2");

  const isMixedLang = /[A-Za-z]/.test(q) && /[가-힣]/.test(q);
  if (isMixedLang) {
    // Remove Korean query filler words in mixed-language requests.
    q = q
      .replace(/논문(의|들|을|에)?/g, " ")
      .replace(/관련(된)?/g, " ")
      .replace(/에\s*대한/g, " ")
      .replace(/대한/g, " ")
      .replace(/검색(해줘)?/g, " ")
      .replace(/찾아줘/g, " ")
      .replace(/알려줘/g, " ")
      .replace(/보여줘/g, " ");
  }

  q = q.replace(/[^\p{L}\p{N}"'\-.\s]/gu, " ").replace(/\s+/g, " ").trim();
  return q;
}

function extractAuthorCandidates(query: string): AuthorExtraction {
  const original = (query || "").trim();
  if (!original) return { cleanQuery: "", authorCandidates: [] };

  let remaining = original;
  const quotedMatches = Array.from(remaining.matchAll(/"([^"]+)"/g));
  const candidates = new Set<string>();

  for (const match of quotedMatches) {
    const token = (match[1] || "").trim();
    if (token) candidates.add(token);
    remaining = remaining.replace(match[0], " ");
  }

  const commaMatches = Array.from(remaining.matchAll(/\b([A-Za-z][A-Za-z'\-\.]+\s*,\s*[A-Za-z][A-Za-z'\-\.]+(?:\s+[A-Za-z][A-Za-z'\-\.]*)?)\b/g));
  for (const match of commaMatches) {
    const token = (match[1] || "").trim();
    if (!token) continue;
    if (token.length <= 3) continue;
    candidates.add(token);
    remaining = remaining.replace(token, " ");
  }

  const explicitPatterns = [
    /\b([A-Z][A-Za-z'\-]+\s+[A-Z][a-z](?:\.|)\b)/g,
    /\b([A-Za-z]{1,}\s+[A-Za-z]{1,}\s*[A-Za-z]{0,})\b/g,
  ];

  for (const regex of explicitPatterns) {
    for (const match of remaining.matchAll(regex)) {
      const token = (match[1] || match[0]).trim();
      const words = token.split(/\s+/);
      if (words.length < 2 || words.length > 3) continue;
      if (!/^[A-Za-z]/.test(token)) continue;
      if (token.length < 4) continue;
      candidates.add(token);
    }
  }

  const cleanQuery = remaining.replace(/\bby\b/gi, " ").replace(/\s+/g, " ").trim();

  const authorCandidates = uniqueList(Array.from(candidates).flatMap((candidate) => {
    const parts = candidate.split(",").map((p) => p.trim()).filter(Boolean);
    const flatName = normalizeName(candidate).replace(/\s+/g, " ");

    if (parts.length === 2) {
      const family = parts[0] || "";
      const given = parts[1] || "";
      const givenInitial = given[0] ? `${given[0]}` : "";
      return uniqueList([
        `${family},${given}`,
        `${given} ${family}`,
        `${givenInitial}. ${family}`,
        `${family} ${given}`,
        candidate,
        flatName,
      ]);
    }

    const words = flatName.split(" ");
    if (words.length >= 2) {
      const first = words[0] || "";
      const last = words[words.length - 1] || "";
      const lastInitial = last ? `${last[0]}.` : "";
      const firstInitial = first ? `${first[0]}.` : "";
      return uniqueList([
        candidate,
        flatName,
        `${last} ${first}`,
        `${firstInitial} ${last}`,
        `${lastInitial} ${first}`,
      ]);
    }

    return [candidate];
  }));

  return {
    cleanQuery,
    authorCandidates,
  };
}

function buildAuthorTermForPubMed(authors: string[]): string {
  const tokens = authors.filter((name) => name.includes(",") || name.includes(" "));
  if (tokens.length === 0) return "";

  const quoted = tokens.map((name) => {
    const q = name.replace(/["']/g, "");
    return `"${q}"[au]`;
  });
  return quoted.map((token) => `(${token})`).join(" OR ");
}

function buildAuthorTermForArxiv(authors: string[]): string {
  const tokens = uniqueList(authors.map((author) => author.replace(/["']/g, "").trim())).filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map((name) => `au:"${name}"`).join(" OR ");
}

function normalizeAuthorToken(raw: string): string {
  return normalizeName(raw).replace(/\s+/g, "");
}

function tokenOverlapRatio(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / Math.max(ta.size, tb.size);
}

function matchByAuthor(authors: string[] = [], candidates: string[], minOverlap = 0.8): boolean {
  if (!candidates.length) return true;
  const normalizedCandidates = candidates.map((c) => normalizeName(c));
  const normalizedTokens = candidates.map((c) => normalizeAuthorToken(c));
  return authors.some((author) => {
    const target = normalizeName(author);
    const targetToken = normalizeAuthorToken(author);

    const exactOrContained = normalizedCandidates.some((candidate) => candidate === target || target.includes(candidate) || candidate.includes(target))
      || normalizedTokens.some((token) => token === targetToken || targetToken.includes(token) || token.includes(targetToken));

    if (exactOrContained) return true;

    return normalizedCandidates.some((candidate) => tokenOverlapRatio(candidate, target) >= minOverlap);
  });
}


function getAuthorPriorityBoost(paper: Paper, authorCandidates: string[], intent: QueryIntent): number {
  if (!authorCandidates.length) return 0;
  const isMatched = matchByAuthor(paper.authors || [], authorCandidates, intent === 'AUTHOR_WEAK' ? 0.9 : 0.8);
  if (!isMatched) return intent === 'AUTHOR_STRONG' ? -25 : -10;

  if (paper.matchType === 'author-exact') return 35;
  if (paper.matchType === 'author-weak') return 22;
  return 15;
}

// T1: PubMed track - clinical metadata
async function t1_pubmedEnhanced(query: string, yearFrom?: string, yearTo?: string, authorCandidates: string[] = [], intent: QueryIntent = 'TOPIC'): Promise<Paper[]> {
  console.log('[T1:PubMed] Search starting...');
  const startTime = Date.now();
  
  try {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const authorTerm = buildAuthorTermForPubMed(authorCandidates);
    const publicationTerm = '(Clinical Trial[pt] OR Meta-Analysis[pt] OR Randomized Controlled Trial[pt] OR Review[pt])';
    const topicTerm = query ? `(${query})` : '';
    const termParts: string[] = [];

    if (authorTerm) {
      termParts.push(`(${authorTerm})`);
      if (intent === 'AUTHOR_WEAK' && topicTerm) {
        termParts.push(topicTerm);
      }
    } else if (topicTerm) {
      termParts.push(topicTerm);
    }

    termParts.push(publicationTerm);

    const params = new URLSearchParams({
      db: 'pubmed',
      term: termParts.join(' AND '),
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
        matchType: authorCandidates.length ? (intent === 'AUTHOR_WEAK' ? 'author-weak' : 'author-exact') : 'topic',
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
async function t2_arxivEnhanced(query: string, yearFrom?: string, yearTo?: string, authorCandidates: string[] = [], intent: QueryIntent = 'TOPIC', explicitAuthor = ''): Promise<Paper[]> {
  console.log('[T2:arXiv] Search starting...');
  const startTime = Date.now();

  const parseArxivEntries = (xml: string, matchType: Paper['matchType']): Paper[] => {
    const entries = xml.match(/<entry[>\s][\s\S]*?<\/entry>/g) || [];
    const papers: Paper[] = [];

    for (const [idx, entry] of entries.entries()) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || 'No title';
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || 'No abstract';
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || `arxiv-${idx}`;
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim();
      const year = published ? parseInt(published.substring(0, 4)) : new Date().getFullYear();

      if (yearFrom && year < parseInt(yearFrom)) continue;
      if (yearTo && year > parseInt(yearTo)) continue;

      const authors = (entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g) || [])
        .map((a) => a.match(/<name>([\s\S]*?)<\/name>/)?.[1])
        .filter((name): name is string => Boolean(name));

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
        matchType,
      };
      if (techniques.length > 0) {
        paper.techniques = techniques;
      }
      papers.push(paper);
    }

    return papers;
  };
  
  try {
    const chosenAuthor = explicitAuthor || authorCandidates[0] || '';
    const baseTopic = query ? `(${query})` : '';
    const planned = buildArxivQuery(intent, chosenAuthor, baseTopic);

    if (planned === null) {
      console.log('[T2:arXiv] Skipped by planner (AUTHOR_WEAK without topic)');
      return [];
    }

    const baseUrl = 'http://export.arxiv.org/api/query';

    const primaryQuery = `${planned} AND (cat:cs.LG OR cat:cs.AI OR cat:cs.CL OR cat:cs.CV)`;
    const params = new URLSearchParams({
      search_query: primaryQuery,
      start: '0',
      max_results: '15',
      sortBy: 'relevance',
      sortOrder: 'descending',
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      signal: AbortSignal.timeout(15000)
    });
    const xml = await res.text();

    let papers = parseArxivEntries(xml, chosenAuthor ? (intent === 'AUTHOR_WEAK' ? 'author-weak' : 'author-exact') : 'topic');

    if (papers.length === 0 && intent === 'AUTHOR_WEAK' && query) {
      const fallbackQuery = `(${query}) AND (cat:cs.LG OR cat:cs.AI OR cat:cs.CL OR cat:cs.CV)`;
      const fallbackParams = new URLSearchParams({
        search_query: fallbackQuery,
        start: '0',
        max_results: '8',
        sortBy: 'relevance',
        sortOrder: 'descending',
      });
      const fallbackRes = await fetch(`${baseUrl}?${fallbackParams.toString()}`, {
        signal: AbortSignal.timeout(15000)
      });
      const fallbackXml = await fallbackRes.text();
      papers = parseArxivEntries(fallbackXml, 'topic');
      console.log(`[T2:arXiv] Fallback(topic-only) applied for weak author query, found ${papers.length}`);
    }


    console.log(`[T2:arXiv] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T2:arXiv] Error:', error);
    return [];
  }
}

// T3: Semantic Scholar track - influence analysis
async function t3_semanticEnhanced(query: string, yearFrom?: string, yearTo?: string, authorCandidates: string[] = [], intent: QueryIntent = 'TOPIC'): Promise<Paper[]> {
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
      .filter((paper: any) => {
        const minOverlap = intent === 'AUTHOR_WEAK' ? 0.9 : 0.8;
        return matchByAuthor((paper.authors || []).map((a: any) => a?.name || ''), authorCandidates, minOverlap);
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
          matchType: authorCandidates.length ? (intent === 'AUTHOR_WEAK' ? 'author-weak' : 'author-exact') : 'topic',
        };
      });

    console.log(`[T3:Semantic] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T3:Semantic] Error:', error);
    return [];
  }
}

// T4: Crossref track
async function t4_crossrefEnhanced(query: string, yearFrom?: string, yearTo?: string, authorCandidates: string[] = [], intent: QueryIntent = 'TOPIC'): Promise<Paper[]> {
  console.log('[T4:Crossref] Search starting...');
  const startTime = Date.now();
  try {
    const params = new URLSearchParams({
      query,
      rows: '15',
      sort: 'relevance',
      order: 'desc',
      select: 'DOI,title,author,issued,URL,is-referenced-by-count,abstract',
    });
    const res = await fetch(`https://api.crossref.org/works?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    const rows = data?.message?.items;
    if (!Array.isArray(rows)) return [];

    const papers = rows
      .map((row: any) => {
        const year = row?.issued?.['date-parts']?.[0]?.[0] || new Date().getFullYear();
        if (yearFrom && year < parseInt(yearFrom)) return null;
        if (yearTo && year > parseInt(yearTo)) return null;
        const doi = row?.DOI;
        const paper = {
          id: `crossref-${doi || Math.random().toString(36).slice(2)}`,
          title: Array.isArray(row.title) ? row.title[0] || 'No title' : 'No title',
          authors: Array.isArray(row.author) ? row.author.map((a: any) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean) : [],
          abstract: row.abstract ? String(row.abstract).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 'No abstract available',
          year,
          source: 'crossref' as const,
          url: row.URL || (doi ? `https://doi.org/${doi}` : 'https://api.crossref.org'),
          citations: typeof row['is-referenced-by-count'] === 'number' ? row['is-referenced-by-count'] : undefined,
          matchType: authorCandidates.length ? (intent === 'AUTHOR_WEAK' ? 'author-weak' : 'author-exact') : 'topic',
        } as Paper;
        return paper;
      })
      .filter((p: Paper | null): p is Paper => p !== null)
      .filter((paper) => {
        if (!authorCandidates.length || intent === 'TOPIC') return true;
        const minOverlap = intent === 'AUTHOR_WEAK' ? 0.92 : 0.8;
        return matchByAuthor(paper.authors || [], authorCandidates, minOverlap);
      });

    console.log(`[T4:Crossref] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T4:Crossref] Error:', error);
    return [];
  }
}

// T5: OpenAlex track
async function t5_openalexEnhanced(query: string, yearFrom?: string, yearTo?: string, authorCandidates: string[] = [], intent: QueryIntent = 'TOPIC'): Promise<Paper[]> {
  console.log('[T5:OpenAlex] Search starting...');
  const startTime = Date.now();
  try {
    const params = new URLSearchParams({
      search: query,
      per_page: '15',
      select: 'id,display_name,publication_year,authorships,abstract_inverted_index,primary_location,cited_by_count',
    });
    const res = await fetch(`https://api.openalex.org/works?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    const rows = data?.results;
    if (!Array.isArray(rows)) return [];

    const papers = rows
      .map((row: any) => {
        const year = row?.publication_year || new Date().getFullYear();
        if (yearFrom && year < parseInt(yearFrom)) return null;
        if (yearTo && year > parseInt(yearTo)) return null;
        return {
          id: `openalex-${row.id || Math.random().toString(36).slice(2)}`,
          title: row.display_name || 'No title',
          authors: Array.isArray(row.authorships)
            ? row.authorships.map((a: any) => a?.author?.display_name).filter((x: unknown): x is string => typeof x === 'string')
            : [],
          abstract: 'No abstract available',
          year,
          source: 'openalex' as const,
          url: row?.primary_location?.landing_page_url || row?.id || 'https://openalex.org',
          citations: typeof row?.cited_by_count === 'number' ? row.cited_by_count : undefined,
          matchType: authorCandidates.length ? (intent === 'AUTHOR_WEAK' ? 'author-weak' : 'author-exact') : 'topic',
        } as Paper;
      })
      .filter((p: Paper | null): p is Paper => p !== null)
      .filter((paper) => {
        if (!authorCandidates.length || intent === 'TOPIC') return true;
        const minOverlap = intent === 'AUTHOR_WEAK' ? 0.92 : 0.8;
        return matchByAuthor(paper.authors || [], authorCandidates, minOverlap);
      });

    console.log(`[T5:OpenAlex] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T5:OpenAlex] Error:', error);
    return [];
  }
}

// T6: Ranker - Integration & ranking
function t6_integrateAndRank(
  t1Results: Paper[],
  t2Results: Paper[],
  t3Results: Paper[],
  t4Results: Paper[],
  t5Results: Paper[],
  intent: QueryIntent,
  authorCandidates: string[] = []
): Paper[] {
  console.log('[T6:Ranker] Integration and ranking starting...');
  const startTime = Date.now();
  
  // Merge all results
  const allPapers = [...t1Results, ...t2Results, ...t3Results, ...t4Results, ...t5Results];
  
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

    // Author-first priority boost
    const authorBoost = getAuthorPriorityBoost(paper, authorCandidates, intent);
    score += authorBoost;
    const authorMatched = authorCandidates.length
      ? matchByAuthor(paper.authors || [], authorCandidates, intent === 'AUTHOR_WEAK' ? 0.9 : 0.8)
      : false;
    
    return { ...paper, rankScore: Math.round(score), _authorMatched: authorMatched };
  }).sort((a, b) => {
    if (intent !== 'TOPIC' && authorCandidates.length) {
      if ((a as any)._authorMatched !== (b as any)._authorMatched) {
        return (b as any)._authorMatched ? 1 : -1;
      }
    }
    return (b.rankScore || 0) - (a.rankScore || 0);
  }).map((paper: any) => {
    const { _authorMatched, ...rest } = paper;
    return rest as Paper;
  });
  
  console.log(`[T6:Ranker] Completed in ${Date.now() - startTime}ms, ${uniquePapers.length} unique papers ranked`);
  return rankedPapers;
}

type TrackSource = 'pubmed' | 'arxiv' | 'semantic' | 'crossref' | 'openalex';

type SearchAttemptResult = {
  query: string;
  intent: QueryIntent;
  authorCandidates: string[];
  trackResults: { t1: number; t2: number; t3: number; t4: number; t5: number; final: number };
  papers: Paper[];
};

function attemptScore(attempt: SearchAttemptResult): number {
  const diverseHits = attempt.trackResults.t1 + attempt.trackResults.t2 + attempt.trackResults.t3 + attempt.trackResults.t5;
  return attempt.papers.length + diverseHits * 5;
}

function shouldStopRetry(attempt: SearchAttemptResult): boolean {
  const diverseHits = attempt.trackResults.t1 + attempt.trackResults.t2 + attempt.trackResults.t3 + attempt.trackResults.t5;
  return attempt.papers.length >= 12 && diverseHits >= 1;
}

function stripKoreanParticle(token: string): string {
  if (!/[가-힣]/.test(token)) return token;
  const stripped = token.replace(/(으로|에서|에게|께서|부터|까지|처럼|보다|조차|마저|라도|이나|나|은|는|이|가|을|를|의|에|와|과|도|만|로)$/u, '');
  return stripped.length >= 2 ? stripped : token;
}

function buildQueryVariants(rawQuery: string, normalizedQuery: string): string[] {
  const variants = new Set<string>();
  const add = (value: string) => {
    const v = value.replace(/\s+/g, ' ').trim();
    if (v) variants.add(v);
  };

  add(normalizedQuery);
  add(preprocessUserQuery(rawQuery));

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    add([...tokens.slice(1), tokens[0]].join(' '));
  }

  const particleStripped = tokens.map(stripKoreanParticle);
  add(particleStripped.join(' '));
  if (particleStripped.length >= 2) {
    add([...particleStripped.slice(1), particleStripped[0]].join(' '));
  }

  return Array.from(variants).slice(0, 4);
}

async function runSingleSearchAttempt(query: string, filters: any): Promise<SearchAttemptResult> {
  const intent = classifyIntent(query);
  const split = splitAuthorAndTopic(query);
  const extracted = extractAuthorCandidates(query);
  const baseCandidates = split.author ? [split.author] : [split.author, ...extracted.authorCandidates];
  const authorCandidatesRaw = uniqueList(baseCandidates.filter(Boolean))
    .filter((name) => String(name || '').trim().split(/\s+/).filter(Boolean).length <= 4);
  const authorCandidates = intent === 'TOPIC' ? [] : authorCandidatesRaw;
  const detectedTopic = (split.topic || extracted.cleanQuery || query).trim();
  const topicQuery = intent === 'AUTHOR_WEAK' && !split.topic ? '' : detectedTopic;
  const effectiveQuery = (topicQuery || authorCandidates[0] || query).trim();

  const sources: TrackSource[] = filters?.sources || ['pubmed', 'arxiv', 'semantic', 'crossref', 'openalex'];
  const yearFrom = filters?.yearFrom;
  const yearTo = filters?.yearTo;
  const nonAuthorQuery = topicQuery || query;

  const trackJobs: Array<{ source: TrackSource; promise: Promise<Paper[]> }> = [];
  if (sources.includes('pubmed')) {
    trackJobs.push({ source: 'pubmed', promise: t1_pubmedEnhanced(effectiveQuery, yearFrom, yearTo, authorCandidates, intent) });
  }
  if (sources.includes('arxiv')) {
    trackJobs.push({ source: 'arxiv', promise: t2_arxivEnhanced(topicQuery, yearFrom, yearTo, authorCandidates, intent, split.author) });
  }
  if (sources.includes('semantic')) {
    trackJobs.push({ source: 'semantic', promise: t3_semanticEnhanced(effectiveQuery, yearFrom, yearTo, authorCandidates, intent) });
  }
  if (sources.includes('crossref')) {
    trackJobs.push({ source: 'crossref', promise: t4_crossrefEnhanced(nonAuthorQuery, yearFrom, yearTo, authorCandidates, intent) });
  }
  if (sources.includes('openalex')) {
    trackJobs.push({ source: 'openalex', promise: t5_openalexEnhanced(nonAuthorQuery, yearFrom, yearTo, authorCandidates, intent) });
  }

  const settled = await Promise.allSettled(trackJobs.map((job) => job.promise));
  const bySource: Record<TrackSource, Paper[]> = {
    pubmed: [],
    arxiv: [],
    semantic: [],
    crossref: [],
    openalex: [],
  };

  settled.forEach((result, index) => {
    const source = trackJobs[index]?.source;
    if (!source) return;
    bySource[source] = result.status === 'fulfilled' ? result.value : [];
  });

  const papers = t6_integrateAndRank(
    bySource.pubmed,
    bySource.arxiv,
    bySource.semantic,
    bySource.crossref,
    bySource.openalex,
    intent,
    authorCandidates,
  );

  return {
    query,
    intent,
    authorCandidates,
    papers,
    trackResults: {
      t1: bySource.pubmed.length,
      t2: bySource.arxiv.length,
      t3: bySource.semantic.length,
      t4: bySource.crossref.length,
      t5: bySource.openalex.length,
      final: papers.length,
    },
  };
}

export async function POST(request: NextRequest) {
  const overallStart = Date.now();
  
  try {
    const payload = await request.json();
    const rawQuery = typeof payload?.query === 'string' ? String(payload.query).trim() : '';
    const normalizedQuery = preprocessUserQuery(rawQuery);
    const filters = payload?.filters || {};
    const variants = buildQueryVariants(rawQuery, normalizedQuery);
    const attempts: Array<{ query: string; intent: QueryIntent; count: number }> = [];

    let best: SearchAttemptResult | null = null;
    for (const candidate of variants) {
      const attempt = await runSingleSearchAttempt(candidate, filters);
      attempts.push({ query: attempt.query, intent: attempt.intent, count: attempt.papers.length });
      if (!best || attemptScore(attempt) > attemptScore(best)) {
        best = attempt;
      }
      if (shouldStopRetry(attempt)) break;
    }
    
    const totalTime = Date.now() - overallStart;
    console.log(`[Parallel Search] Total time: ${totalTime}ms`);
    const selected = best || {
      query: normalizedQuery,
      intent: 'TOPIC' as QueryIntent,
      authorCandidates: [],
      papers: [],
      trackResults: { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, final: 0 },
    };
    
    return NextResponse.json({ 
      papers: selected.papers,
      meta: {
        totalTime,
        intent: selected.intent,
        normalizedQuery,
        selectedQuery: selected.query,
        attempts,
        authorCandidates: selected.authorCandidates,
        trackResults: selected.trackResults,
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
