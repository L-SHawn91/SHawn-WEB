// /app/api/papers/search-parallel/route.ts
// 4-Track Parallel Search Implementation

import { NextRequest, NextResponse } from 'next/server';
import {
  buildArxivQuery,
  classifyIntent,
  splitAuthorAndTopic,
  type QueryIntent,
} from '../../../../lib/search/queryPlanner';
import {
  buildPublicPubMedQuery,
  expandPublicBioQuery,
  mergePublicPaperRecords,
  publicSourceHealth,
  publicTopicGuard,
  publicWorkflowScore,
  type PublicSourceHealth,
} from '../../../../lib/bio-search-public/workflow';

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
  rankScore?: number;
  claimOverlap?: number;
  hypothesisOverlap?: number;
  stage1Score?: number;
  stage2Score?: number;
  evidenceScore?: number;
  supportScore?: number;
  contradictionScore?: number;
  bestSupportSentence?: string;
  bestContradictSentence?: string;
  homonymProfileId?: string;
  homonymProfileScore?: number;
  matchedAuthorName?: string;
  authorAffiliations?: string[];
  authorCountries?: string[];
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
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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
    /\b([A-Z][A-Za-z'\-]+\s+[A-Z](?:\.)?\s+[A-Z][A-Za-z'\-]+)\b/g,
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

function overlapRatio(base: string, target: string): number {
  const ta = new Set(((base || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []));
  const tb = new Set(((target || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / ta.size;
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);
}

const NEG_TERMS = new Set([
  'not', 'no', 'without', 'lack', 'lacks', 'failed', 'fail', 'fails',
  'reduced', 'decrease', 'decreased', 'lower', 'suppressed', 'inhibit', 'inhibited', 'inhibits'
]);

function hasNegation(text: string): boolean {
  const toks = (text || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  return toks.some((t) => NEG_TERMS.has(t));
}

function sentenceEvidence(claim: string, hypothesis: string, abstract: string) {
  const sents = splitSentences(abstract);
  if (!claim || sents.length === 0) {
    return {
      supportScore: 0,
      contradictionScore: 0,
      stage2Score: 0,
      bestSupportSentence: '',
      bestContradictSentence: '',
    };
  }
  const claimNeg = hasNegation(claim);
  let bestSupport = { score: 0, sent: '' };
  let bestContra = { score: 0, sent: '' };
  let bestHyp = 0;

  for (const sent of sents) {
    const claimOv = overlapRatio(claim, sent);
    const hypOv = hypothesis ? overlapRatio(hypothesis, sent) : 0;
    const sentNeg = hasNegation(sent);
    const support = claimOv;
    const contra = claimNeg ? (!sentNeg ? claimOv * 0.85 : 0) : (sentNeg ? claimOv * 0.85 : 0);

    if (support > bestSupport.score) bestSupport = { score: support, sent };
    if (contra > bestContra.score) bestContra = { score: contra, sent };
    if (hypOv > bestHyp) bestHyp = hypOv;
  }

  const stage2 = Math.max(0, bestSupport.score - 0.7 * bestContra.score + 0.25 * bestHyp);
  return {
    supportScore: Number(bestSupport.score.toFixed(4)),
    contradictionScore: Number(bestContra.score.toFixed(4)),
    stage2Score: Number(Math.min(1, stage2).toFixed(4)),
    bestSupportSentence: bestSupport.sent,
    bestContradictSentence: bestContra.sent,
  };
}

function matchByAuthor(authors: string[] = [], candidates: string[], minOverlap = 0.8): boolean {
  if (!candidates.length) return true;
  const normalizedCandidates = candidates.map((c) => normalizeName(c)).filter(Boolean);
  const normalizedTokens = candidates.map((c) => normalizeAuthorToken(c)).filter(Boolean);
  if (!normalizedCandidates.length && !normalizedTokens.length) return false;
  return authors.some((author) => {
    const target = normalizeName(author);
    const targetToken = normalizeAuthorToken(author);

    const exactOrContained = normalizedCandidates.some((candidate) => {
      if (candidate === target) return true;
      const candidateParts = candidate.split(/\s+/).filter(Boolean);
      if (candidateParts.length === 1) return target.split(/\s+/).includes(candidate);
      return target.includes(candidate) || candidate.includes(target);
    }) || normalizedTokens.some((token) => {
      if (token === targetToken) return true;
      const candidateParts = normalizedCandidates.find((candidate) => normalizeAuthorToken(candidate) === token)?.split(/\s+/).filter(Boolean) || [];
      if (candidateParts.length <= 1) return false;
      return targetToken.includes(token) || token.includes(targetToken);
    });

    if (exactOrContained) return true;

    return normalizedCandidates.some((candidate) => tokenOverlapRatio(candidate, target) >= minOverlap);
  });
}

function matchByFirstAuthor(authors: string[] = [], candidates: string[], minOverlap = 0.9): boolean {
  if (!candidates.length) return true;
  if (!authors.length) return false;
  return matchByAuthor([authors[0]], candidates, minOverlap);
}

function strictAuthorWordMatch(authors: string[] = [], candidates: string[]): boolean {
  if (!candidates.length) return true;
  const authorText = ` ${authors.map((author) => normalizeName(author)).join(" ")} `;
  return candidates.some((candidate) => {
    const clean = normalizeName(candidate);
    if (!clean) return false;
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return authorText.includes(` ${parts[0]} `);
    const first = parts[0];
    const last = parts[parts.length - 1];
    return authorText.includes(` ${clean} `) || (Boolean(first && last) && authorText.includes(` ${first} `) && authorText.includes(` ${last} `));
  });
}

function findMatchedAuthor(authors: string[] = [], candidates: string[], minOverlap = 0.85): string {
  if (!authors.length || !candidates.length) return '';
  const normalizedCandidates = candidates.map((c) => normalizeName(c)).filter(Boolean);
  const normalizedTokens = candidates.map((c) => normalizeAuthorToken(c)).filter(Boolean);
  for (const author of authors) {
    const target = normalizeName(author);
    const targetToken = normalizeAuthorToken(author);
    const exactOrContained = normalizedCandidates.some((candidate) => {
      if (candidate === target) return true;
      const candidateParts = candidate.split(/\s+/).filter(Boolean);
      if (candidateParts.length === 1) return target.split(/\s+/).includes(candidate);
      return target.includes(candidate) || candidate.includes(target);
    }) || normalizedTokens.some((token) => {
      if (token === targetToken) return true;
      const candidateParts = normalizedCandidates.find((candidate) => normalizeAuthorToken(candidate) === token)?.split(/\s+/).filter(Boolean) || [];
      if (candidateParts.length <= 1) return false;
      return targetToken.includes(token) || token.includes(targetToken);
    });
    if (exactOrContained) return author;
    const fuzzy = normalizedCandidates.some((candidate) => tokenOverlapRatio(candidate, target) >= minOverlap);
    if (fuzzy) return author;
  }
  return '';
}

function matchedAuthorConfidence(authors: string[] = [], candidates: string[]): number {
  if (!authors.length || !candidates.length) return 0;
  const normalizedCandidates = candidates.map((c) => normalizeName(c)).filter(Boolean);
  let best = 0;
  for (let i = 0; i < authors.length; i += 1) {
    const author = normalizeName(authors[i] || '');
    if (!author) continue;
    const overlap = normalizedCandidates.reduce((m, c) => Math.max(m, tokenOverlapRatio(c, author)), 0);
    const positionBoost = i === 0 ? 0.1 : i <= 2 ? 0.05 : 0;
    best = Math.max(best, Math.min(1, overlap + positionBoost));
  }
  return Number(best.toFixed(4));
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

    const ncbiKeyEarly = process.env.NCBI_API_KEY || '';
    const params = new URLSearchParams({
      db: 'pubmed',
      term: termParts.join(' AND '),
      retmode: 'json',
      retmax: '15',
      sort: 'relevance',
      ...(ncbiKeyEarly ? { api_key: ncbiKeyEarly } : {}),
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

    const ncbiKey = process.env.NCBI_API_KEY || '';

    // esummary: title, authors, pubdate, pubtype, meshterms
    const summaryUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
      ...(ncbiKey ? { api_key: ncbiKey } : {}),
    });

    const summaryRes = await fetch(`${summaryUrl}?${summaryParams.toString()}`, {
      signal: AbortSignal.timeout(15000)
    });
    const summaryData = await summaryRes.json();

    // efetch: real abstracts + DOI + MeSH (esummary never returns abstract text)
    const fetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'xml',
      ...(ncbiKey ? { api_key: ncbiKey } : {}),
    });
    const abstractMap: Record<string, string> = {};
    const meshMapFromFetch: Record<string, string[]> = {};
    try {
      const fetchRes = await fetch(`${fetchUrl}?${fetchParams.toString()}`, {
        signal: AbortSignal.timeout(20000),
      });
      const xmlText = await fetchRes.text();
      const articleBlocks = xmlText.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) || [];
      for (const block of articleBlocks) {
        const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
        const pmid = pmidMatch?.[1];
        if (!pmid) continue;
        // abstract
        const parts: string[] = [];
        const abMatches = block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
        for (const m of abMatches) {
          const txt = (m[1] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          if (txt) parts.push(txt);
        }
        if (parts.length) abstractMap[pmid] = parts.join(' ');
        // MeSH
        const meshMatches = block.matchAll(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g);
        const mesh: string[] = [];
        for (const m of meshMatches) mesh.push((m[1] || '').trim());
        if (mesh.length) meshMapFromFetch[pmid] = mesh;
      }
    } catch {
      // efetch failure is non-fatal — fall back to no-abstract
    }

    const papers = ids.map((id: string) => {
      const doc = summaryData.result?.[id];
      if (!doc) return null;

      const meshTerms = meshMapFromFetch[id] || doc.meshterms?.map((t: any) => t.name) || [];
      const pubTypes = doc.pubtype || [];
      const studyType = pubTypes.find((t: string) =>
        t.includes('Clinical Trial') || t.includes('Meta-Analysis') || t.includes('Review')
      );

      return {
        id: `pmid-${id}`,
        title: doc.title || 'No title',
        authors: doc.authors?.map((a: any) => `${a.name}`) || [],
        abstract: abstractMap[id] || 'No abstract available',
        year: parseInt(doc.pubdate?.substring(0, 4)) || new Date().getFullYear(),
        source: 'pubmed' as const,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        meshTerms,
        techniques: studyType ? [studyType] : [],
        matchType: authorCandidates.length ? (intent === 'AUTHOR_WEAK' ? 'author-weak' : 'author-exact') : 'topic',
      };
    }).filter(isPaper)
      .filter((paper: Paper) => {
        if (!authorCandidates.length || intent === 'TOPIC') return true;
        const minOverlap = intent === 'AUTHOR_WEAK' ? 0.92 : 0.8;
        return matchByAuthor(paper.authors || [], authorCandidates, minOverlap);
      });

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

    const s2Key = process.env.S2_API_KEY || process.env.SEMANTIC_SCHOLAR_API_KEY || '';
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: s2Key ? { 'x-api-key': s2Key } : {},
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
        
        const authorAffiliations = Array.isArray(paper.authors)
          ? paper.authors.flatMap((a: any) => {
              if (Array.isArray(a?.affiliations)) return a.affiliations;
              if (typeof a?.affiliations === 'string') return [a.affiliations];
              return [];
            }).filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
          : [];

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
          authorAffiliations,
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
        const authorAffiliations = Array.isArray(row.author)
          ? row.author.flatMap((a: any) =>
              Array.isArray(a?.affiliation)
                ? a.affiliation.map((af: any) => af?.name).filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
                : [],
            )
          : [];
        const paper = {
          id: `crossref-${doi || Math.random().toString(36).slice(2)}`,
          title: Array.isArray(row.title) ? row.title[0] || 'No title' : 'No title',
          authors: Array.isArray(row.author) ? row.author.map((a: any) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean) : [],
          abstract: row.abstract ? String(row.abstract).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 'No abstract available',
          year,
          source: 'crossref' as const,
          url: row.URL || (doi ? `https://doi.org/${doi}` : 'https://api.crossref.org'),
          citations: typeof row['is-referenced-by-count'] === 'number' ? row['is-referenced-by-count'] : undefined,
          authorAffiliations,
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
  const openAlexAbstract = (inv: any): string => {
    if (!inv || typeof inv !== 'object') return 'No abstract available';
    const posToWord: Record<number, string> = {};
    for (const [word, positions] of Object.entries(inv)) {
      if (!Array.isArray(positions)) continue;
      positions.forEach((p) => {
        if (typeof p === 'number') posToWord[p] = String(word);
      });
    }
    const keys = Object.keys(posToWord).map((k) => Number(k)).filter((k) => Number.isFinite(k));
    if (keys.length === 0) return 'No abstract available';
    const maxPos = Math.max(...keys);
    const seq: string[] = [];
    for (let i = 0; i <= maxPos; i += 1) {
      if (posToWord[i]) seq.push(posToWord[i]);
    }
    return seq.join(' ').trim() || 'No abstract available';
  };
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
        const authorAffiliations = Array.isArray(row.authorships)
          ? row.authorships.flatMap((a: any) =>
              Array.isArray(a?.institutions)
                ? a.institutions.map((ins: any) => ins?.display_name).filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
                : [],
            )
          : [];
        const authorCountries = Array.isArray(row.authorships)
          ? row.authorships.flatMap((a: any) =>
              Array.isArray(a?.institutions)
                ? a.institutions.map((ins: any) => ins?.country_code).filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
                : [],
            )
          : [];
        return {
          id: `openalex-${row.id || Math.random().toString(36).slice(2)}`,
          title: row.display_name || 'No title',
          authors: Array.isArray(row.authorships)
            ? row.authorships.map((a: any) => a?.author?.display_name).filter((x: unknown): x is string => typeof x === 'string')
            : [],
          abstract: openAlexAbstract(row.abstract_inverted_index),
          year,
          source: 'openalex' as const,
          url: row?.primary_location?.landing_page_url || row?.id || 'https://openalex.org',
          citations: typeof row?.cited_by_count === 'number' ? row.cited_by_count : undefined,
          authorAffiliations,
          authorCountries,
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
  authorCandidates: string[] = [],
  claim: string = '',
  hypothesis: string = ''
): Paper[] {
  console.log('[T6:Ranker] Integration and ranking starting...');
  const startTime = Date.now();
  
  // Merge all results
  const allPapers = [...t1Results, ...t2Results, ...t3Results, ...t4Results, ...t5Results];
  
  // Public-safe workflow merge: DOI/public ID/title dedupe while preserving source hits and best metadata.
  const uniquePapers = mergePublicPaperRecords(allPapers);
  
  // Ranking algorithm
  const hasEvidenceQuery = Boolean((claim || '').trim() || (hypothesis || '').trim());
  const rankedPapers = uniquePapers.map(paper => {
    let score = 0;
    const mergedText = `${paper.title || ''} ${paper.abstract || ''}`.trim();
    const claimOverlap = claim ? overlapRatio(claim, mergedText) : 0;
    const hypothesisOverlap = hypothesis ? overlapRatio(hypothesis, mergedText) : 0;
    const citeComponent = Math.min((paper.citations || 0), 500) / 500;
    const stage1Score = Number((0.55 * claimOverlap + 0.25 * hypothesisOverlap + 0.2 * citeComponent).toFixed(4));
    const s2 = sentenceEvidence(claim, hypothesis, paper.abstract || '');
    const evidenceScore = claim && (paper.abstract || '').trim().length > 0
      ? Number((0.45 * stage1Score + 0.55 * s2.stage2Score).toFixed(4))
      : stage1Score;
    
    // Public-safe SHawn bio workflow score: recency + public citation signal + source reliability + metadata hints.
    score += publicWorkflowScore(paper);

    // Author-first priority boost
    const authorBoost = getAuthorPriorityBoost(paper, authorCandidates, intent);
    score += authorBoost;
    // Claim/hypothesis evidence boost only when the user requested evidence mode inputs.
    if (hasEvidenceQuery) {
      score += evidenceScore * 25;
    }
    const authorMatched = authorCandidates.length
      ? matchByAuthor(paper.authors || [], authorCandidates, intent === 'AUTHOR_WEAK' ? 0.9 : 0.8)
      : false;
    
    return {
      ...paper,
      rankScore: Math.round(score),
      claimOverlap: Number(claimOverlap.toFixed(4)),
      hypothesisOverlap: Number(hypothesisOverlap.toFixed(4)),
      stage1Score,
      stage2Score: s2.stage2Score,
      evidenceScore,
      supportScore: s2.supportScore,
      contradictionScore: s2.contradictionScore,
      bestSupportSentence: s2.bestSupportSentence,
      bestContradictSentence: s2.bestContradictSentence,
      _authorMatched: authorMatched,
    };
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
type SearchMode = 'broad' | 'precision' | 'author';

function normalizeSearchMode(value: unknown): SearchMode {
  const v = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (v === 'precision') return 'precision';
  if (v === 'author') return 'author';
  return 'broad';
}

type SearchAttemptResult = {
  query: string;
  mode: SearchMode;
  intent: QueryIntent;
  authorCandidates: string[];
  trackResults: { t1: number; t2: number; t3: number; t4: number; t5: number; final: number };
  sourceHealth?: PublicSourceHealth[];
  papers: Paper[];
  homonymProfiles?: Array<{
    profileId: string;
    matchedAuthor: string;
    topicBucket: string;
    count: number;
    avgRankScore: number;
    avgEvidenceScore: number;
    avgAuthorConfidence: number;
    yearMin: number;
    yearMax: number;
    sources: string[];
    topAffiliations: string[];
    topCountries: string[];
    mergedFrom: string[];
    sampleTitles: string[];
    recommendationScore: number;
  }>;
};

function inferTopicBucket(title: string, abstract: string): string {
  return inferTopicBucketWithQuery(title, abstract, '');
}

const TOPIC_STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'were', 'been', 'have', 'into', 'their', 'there', 'after', 'before',
  'between', 'among', 'using', 'based', 'study', 'results', 'analysis', 'clinical', 'research', 'method',
  'methods', 'data', 'dataset', 'datasets', 'paper', 'papers', 'article', 'articles', 'approach', 'model',
  'models', 'propose', 'proposed', 'investigate', 'investigated', 'evaluation', 'evaluated', 'novel',
  'finding', 'findings', 'effect', 'effects', 'improve', 'improved', 'performance', 'evidence', 'review',
  'reviews', 'systematic', 'meta', 'association', 'associated', 'across', 'within', 'through', 'towards',
  'abstract', 'available',
  '대한', '관련', '논문', '검색', '연구', '결과', '분석', '기반', '방법', '데이터', '모델'
]);

function topicTokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [])
    .filter((token) => !TOPIC_STOPWORDS.has(token));
}

function cleanAbstractForTopic(abstract: string): string {
  const raw = (abstract || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'no abstract' || raw === 'no abstract available') return '';
  if (raw.startsWith('no abstract available')) return '';
  return abstract;
}

function inferTopicBucketWithQuery(title: string, abstract: string, query: string): string {
  const titleTokens = topicTokens(title || '');
  const bodyTokens = topicTokens(cleanAbstractForTopic(abstract || ''));
  const queryTokenSet = new Set(topicTokens(query || ''));
  const counts = new Map<string, number>();

  // Weight title terms higher for faster disambiguation.
  for (const token of titleTokens) {
    counts.set(token, (counts.get(token) || 0) + 2);
  }
  for (const token of bodyTokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  for (const token of queryTokenSet) {
    if (counts.has(token)) {
      counts.set(token, (counts.get(token) || 0) + 2);
    }
  }

  const bigrams = new Map<string, number>();
  const ordered = [...titleTokens, ...bodyTokens];
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const a = ordered[i];
    const b = ordered[i + 1];
    if (!a || !b) continue;
    if (TOPIC_STOPWORDS.has(a) || TOPIC_STOPWORDS.has(b)) continue;
    const key = `${a}+${b}`;
    bigrams.set(key, (bigrams.get(key) || 0) + 1);
  }

  const topBigram = Array.from(bigrams.entries())
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0];
  if (topBigram) return topBigram;

  const topTokens = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([token]) => token);
  return topTokens.length ? topTokens.join('+') : 'general';
}

function normalizeAffiliation(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTopList(values: string[], limit = 3): string[] {
  const m = new Map<string, { raw: string; count: number }>();
  for (const v of values) {
    const raw = (v || '').trim();
    if (!raw) continue;
    const key = normalizeAffiliation(raw);
    if (!key) continue;
    const prev = m.get(key);
    if (prev) prev.count += 1;
    else m.set(key, { raw, count: 1 });
  }
  return Array.from(m.values())
    .sort((a, b) => b.count - a.count || a.raw.localeCompare(b.raw))
    .slice(0, limit)
    .map((x) => x.raw);
}

function topicSignatureTokens(bucket: string): string[] {
  return (bucket || '')
    .split('+')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function tokenSetOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let hit = 0;
  for (const t of sa) if (sb.has(t)) hit += 1;
  return hit / Math.max(sa.size, sb.size);
}

function buildHomonymProfiles(
  papers: Paper[],
  query: string,
  authorCandidates: string[],
  options?: { mergeThreshold?: number },
) {
  const mergeThreshold = Math.min(0.9, Math.max(0.3, Number(options?.mergeThreshold ?? 0.5)));
  const grouped = new Map<string, Paper[]>();
  const profileMatchedAuthor = new Map<string, string>();
  const profileTopicBucket = new Map<string, string>();
  for (const p of papers) {
    const matchedAuthor = findMatchedAuthor(p.authors || [], authorCandidates, 0.85) || ((p.authors || [])[0] || 'unknown');
    const topicBucket = inferTopicBucketWithQuery(p.title || '', p.abstract || '', query);
    const profileId = `${normalizeName(matchedAuthor)}|${topicBucket}`;
    const arr = grouped.get(profileId) || [];
    arr.push({ ...p, matchedAuthorName: matchedAuthor, homonymProfileId: profileId });
    grouped.set(profileId, arr);
    if (!profileMatchedAuthor.has(profileId)) profileMatchedAuthor.set(profileId, matchedAuthor);
    if (!profileTopicBucket.has(profileId)) profileTopicBucket.set(profileId, topicBucket);
  }

  const q = (query || '').toLowerCase();
  const currentYear = new Date().getFullYear();
  const rawProfiles = Array.from(grouped.entries()).map(([profileId, rows]) => {
    const matchedAuthor = profileMatchedAuthor.get(profileId) || 'unknown';
    const topicBucket = profileTopicBucket.get(profileId) || inferTopicBucketWithQuery(rows[0]?.title || '', rows[0]?.abstract || '', query);
    const years = rows.map((r) => r.year || 0).filter((y) => y > 0);
    const avgRankScore = rows.reduce((a, r) => a + (r.rankScore || 0), 0) / Math.max(1, rows.length);
    const avgEvidenceScore = rows.reduce((a, r) => a + (r.evidenceScore || 0), 0) / Math.max(1, rows.length);
    const avgAuthorConfidence = rows.reduce((a, r) => a + matchedAuthorConfidence(r.authors || [], authorCandidates), 0) / Math.max(1, rows.length);
    const avgCitations = rows.reduce((a, r) => a + (r.citations || 0), 0) / Math.max(1, rows.length);
    const sources = Array.from(new Set(rows.map((r) => r.source)));
    const topAffiliations = toTopList(rows.flatMap((r) => r.authorAffiliations || []), 3);
    const topCountries = toTopList(rows.flatMap((r) => r.authorCountries || []), 3);
    const sampleTitles = rows.slice(0, 3).map((r) => r.title || '').filter(Boolean);
    const textBlob = rows.map((r) => `${r.title || ''} ${r.abstract || ''}`.trim()).join(' ').toLowerCase();
    const queryOverlap = overlapRatio(q, textBlob);
    const latestYear = years.length ? Math.max(...years) : currentYear - 10;
    const recencyScore = Math.max(0, 1 - Math.max(0, currentYear - latestYear) / 12);
    const qualityScore = Math.min(avgRankScore / 100, 1);
    const citationScore = Math.min(avgCitations / 150, 1);
    const sourceDiversity = Math.min(sources.length / 4, 1);
    const recommendationScore = Number((
      0.4 * queryOverlap +
      0.2 * qualityScore +
      0.2 * avgEvidenceScore +
      0.1 * recencyScore +
      0.05 * citationScore +
      0.05 * sourceDiversity
    ).toFixed(4));
    return {
      profileId,
      matchedAuthor,
      topicBucket,
      count: rows.length,
      avgRankScore: Number(avgRankScore.toFixed(2)),
      avgEvidenceScore: Number(avgEvidenceScore.toFixed(4)),
      avgAuthorConfidence: Number(avgAuthorConfidence.toFixed(4)),
      yearMin: years.length ? Math.min(...years) : 0,
      yearMax: years.length ? Math.max(...years) : 0,
      sources,
      topAffiliations,
      topCountries,
      mergedFrom: [profileId],
      sampleTitles,
      recommendationScore,
    };
  });

  // Merge near-duplicate topic signatures for the same matched author.
  const clusters: Array<{
    matchedAuthor: string;
    topicBucket: string;
    memberIds: string[];
    rows: Paper[];
  }> = [];
  for (const profile of rawProfiles.sort((a, b) => b.count - a.count)) {
    const rows = grouped.get(profile.profileId) || [];
    const pTokens = topicSignatureTokens(profile.topicBucket);
    const pAff = (profile.topAffiliations || []).map(normalizeAffiliation);
    const pCountries = (profile.topCountries || []).map(normalizeAffiliation);

    let merged = false;
    for (const c of clusters) {
      if (normalizeName(c.matchedAuthor) !== normalizeName(profile.matchedAuthor)) continue;
      const cTokens = topicSignatureTokens(c.topicBucket);
      const topicOverlap = tokenSetOverlap(pTokens, cTokens);
      const cAff = toTopList(c.rows.flatMap((r) => r.authorAffiliations || []), 3).map(normalizeAffiliation);
      const cCountries = toTopList(c.rows.flatMap((r) => r.authorCountries || []), 3).map(normalizeAffiliation);
      const affOverlap = tokenSetOverlap(pAff, cAff);
      const countryOverlap = tokenSetOverlap(pCountries, cCountries);
      if (topicOverlap >= mergeThreshold || (topicOverlap >= Math.max(0.25, mergeThreshold - 0.15) && (affOverlap > 0 || countryOverlap > 0))) {
        c.memberIds.push(profile.profileId);
        c.rows.push(...rows);
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push({
        matchedAuthor: profile.matchedAuthor,
        topicBucket: profile.topicBucket,
        memberIds: [profile.profileId],
        rows: [...rows],
      });
    }
  }

  const profiles = clusters.map((cluster) => {
    const dedupRows = Array.from(new Map(cluster.rows.map((r) => [r.id, r])).values());
    const years = dedupRows.map((r) => r.year || 0).filter((y) => y > 0);
    const avgRankScore = dedupRows.reduce((a, r) => a + (r.rankScore || 0), 0) / Math.max(1, dedupRows.length);
    const avgEvidenceScore = dedupRows.reduce((a, r) => a + (r.evidenceScore || 0), 0) / Math.max(1, dedupRows.length);
    const avgAuthorConfidence = dedupRows.reduce((a, r) => a + matchedAuthorConfidence(r.authors || [], authorCandidates), 0) / Math.max(1, dedupRows.length);
    const avgCitations = dedupRows.reduce((a, r) => a + (r.citations || 0), 0) / Math.max(1, dedupRows.length);
    const sources = Array.from(new Set(dedupRows.map((r) => r.source)));
    const topAffiliations = toTopList(dedupRows.flatMap((r) => r.authorAffiliations || []), 3);
    const topCountries = toTopList(dedupRows.flatMap((r) => r.authorCountries || []), 3);
    const sampleTitles = dedupRows.slice(0, 3).map((r) => r.title || '').filter(Boolean);
    const textBlob = dedupRows.map((r) => `${r.title || ''} ${r.abstract || ''}`.trim()).join(' ').toLowerCase();
    const queryOverlap = overlapRatio(q, textBlob);
    const latestYear = years.length ? Math.max(...years) : currentYear - 10;
    const recencyScore = Math.max(0, 1 - Math.max(0, currentYear - latestYear) / 12);
    const qualityScore = Math.min(avgRankScore / 100, 1);
    const citationScore = Math.min(avgCitations / 150, 1);
    const sourceDiversity = Math.min(sources.length / 4, 1);
    const affiliationStrength = Math.min(topAffiliations.length / 3, 1);
    const recommendationScore = Number((
      0.34 * queryOverlap +
      0.18 * qualityScore +
      0.18 * avgEvidenceScore +
      0.09 * avgAuthorConfidence +
      0.1 * recencyScore +
      0.06 * citationScore +
      0.05 * sourceDiversity +
      0.05 * affiliationStrength
    ).toFixed(4));
    const mergedTopic = toTopList(
      cluster.memberIds.flatMap((id) => topicSignatureTokens(profileTopicBucket.get(id) || cluster.topicBucket)),
      2,
    ).join('+') || cluster.topicBucket;
    return {
      profileId: `${normalizeName(cluster.matchedAuthor)}|${mergedTopic}`,
      matchedAuthor: cluster.matchedAuthor,
      topicBucket: mergedTopic,
      count: dedupRows.length,
      avgRankScore: Number(avgRankScore.toFixed(2)),
      avgEvidenceScore: Number(avgEvidenceScore.toFixed(4)),
      avgAuthorConfidence: Number(avgAuthorConfidence.toFixed(4)),
      yearMin: years.length ? Math.min(...years) : 0,
      yearMax: years.length ? Math.max(...years) : 0,
      sources,
      topAffiliations,
      topCountries,
      mergedFrom: cluster.memberIds,
      sampleTitles,
      recommendationScore,
    };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore);

  const rawToMerged = new Map<string, string>();
  for (const p of profiles) {
    for (const memberId of p.mergedFrom) {
      rawToMerged.set(memberId, p.profileId);
    }
  }
  const byProfile = new Map<string, number>();
  profiles.forEach((p) => byProfile.set(p.profileId, p.recommendationScore));
  const rankedPapers = papers
    .map((p) => {
      const matchedAuthor = findMatchedAuthor(p.authors || [], authorCandidates, 0.85) || ((p.authors || [])[0] || 'unknown');
      const topicBucket = inferTopicBucketWithQuery(p.title || '', p.abstract || '', query);
      const rawProfileId = `${normalizeName(matchedAuthor)}|${topicBucket}`;
      const profileId = rawToMerged.get(rawProfileId) || rawProfileId;
      return {
        ...p,
        matchedAuthorName: matchedAuthor,
        homonymProfileId: profileId,
        homonymProfileScore: byProfile.get(profileId) || 0,
      };
    })
    .sort((a, b) => (b.homonymProfileScore || 0) - (a.homonymProfileScore || 0) || (b.rankScore || 0) - (a.rankScore || 0));

  return { profiles, rankedPapers };
}

function attemptScore(attempt: SearchAttemptResult): number {
  const diverseHits = attempt.trackResults.t1 + attempt.trackResults.t2 + attempt.trackResults.t3 + attempt.trackResults.t5;
  const base = attempt.papers.length + diverseHits * 5;
  if (attempt.mode === 'precision') {
    const topEvidence = (attempt.papers || []).slice(0, 5).reduce((acc, p) => acc + (p.evidenceScore || 0), 0);
    return base + topEvidence * 20;
  }
  if (attempt.mode === 'author') {
    const authorHits = (attempt.papers || []).slice(0, 10).filter((p) => p.matchType === 'author-exact' || p.matchType === 'author-weak').length;
    return base + authorHits * 8;
  }
  return base;
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

async function runSingleSearchAttempt(query: string, filters: any, mode: SearchMode = 'broad'): Promise<SearchAttemptResult> {
  const intent = classifyIntent(query);
  const split = splitAuthorAndTopic(query);
  const extracted = extractAuthorCandidates(query);
  const manualAuthorNames: string[] = [];
  if (typeof filters?.authorName === 'string' && filters.authorName.trim()) {
    manualAuthorNames.push(filters.authorName.trim());
  }
  if (Array.isArray(filters?.authorNames)) {
    for (const n of filters.authorNames) {
      if (typeof n === 'string' && n.trim()) manualAuthorNames.push(n.trim());
    }
  }
  const hasManualAuthor = manualAuthorNames.length > 0;
  const firstAuthorOnly = Boolean(filters?.firstAuthorOnly);
  const baseCandidates = split.author ? [split.author] : [split.author, ...extracted.authorCandidates];
  const authorCandidatesRaw = uniqueList(baseCandidates.filter(Boolean))
    .filter((name) => String(name || '').trim().split(/\s+/).filter(Boolean).length <= 4);
  const authorCandidatesMerged = uniqueList([...authorCandidatesRaw, ...manualAuthorNames]);
  const authorCandidates =
    mode === 'author'
      ? authorCandidatesMerged
      : hasManualAuthor
        ? authorCandidatesMerged
        : (intent === 'TOPIC' ? [] : authorCandidatesRaw);
  const detectedTopic = (split.topic || extracted.cleanQuery || query).trim();
  const topicQuery = (!hasManualAuthor && mode !== 'author' && intent === 'AUTHOR_WEAK' && !split.topic) ? '' : detectedTopic;
  const effectiveQuery = expandPublicBioQuery((topicQuery || authorCandidates[0] || query).trim());

  const defaultSourcesByMode: Record<SearchMode, TrackSource[]> = {
    broad: ['pubmed', 'arxiv', 'semantic', 'crossref', 'openalex'],
    precision: ['pubmed', 'semantic', 'crossref', 'openalex'],
    author: ['pubmed', 'semantic', 'crossref', 'openalex'],
  };
  const sources: TrackSource[] = filters?.sources || defaultSourcesByMode[mode];
  const yearFrom = filters?.yearFrom;
  const yearTo = filters?.yearTo;
  const claimRaw = typeof filters?.claim === 'string' ? filters.claim.trim() : '';
  const claim = mode === 'precision' && !claimRaw ? query : claimRaw;
  const hypothesis = typeof filters?.hypothesis === 'string' ? filters.hypothesis.trim() : '';
  const profileMergeThreshold = typeof filters?.profileMergeThreshold === 'number'
    ? filters.profileMergeThreshold
    : Number(filters?.profileMergeThreshold);
  const nonAuthorQuery = topicQuery || query;

  const trackJobs: Array<{ source: TrackSource; promise: Promise<Paper[]> }> = [];
  if (sources.includes('pubmed')) {
    trackJobs.push({ source: 'pubmed', promise: t1_pubmedEnhanced(buildPublicPubMedQuery(effectiveQuery), yearFrom, yearTo, authorCandidates, intent) });
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

  const sourceStartedAt = new Map(trackJobs.map((job) => [job.source, Date.now()]));
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

  const sourceHealth = settled.map((result, index) => {
    const source = trackJobs[index]?.source || 'unknown';
    return publicSourceHealth(source, result, Date.now() - (sourceStartedAt.get(source as TrackSource) || Date.now()));
  });

  const papersRanked = t6_integrateAndRank(
    bySource.pubmed,
    bySource.arxiv,
    bySource.semantic,
    bySource.crossref,
    bySource.openalex,
    intent,
    authorCandidates,
    claim,
    hypothesis,
  );
  let papers = firstAuthorOnly
    ? papersRanked.filter((paper) => matchByFirstAuthor(paper.authors || [], authorCandidates, hasManualAuthor ? 0.85 : 0.9))
    : papersRanked;
  let homonymProfiles: SearchAttemptResult['homonymProfiles'] = undefined;

  if (mode === 'author' && authorCandidates.length) {
    papers = papers.filter((paper) => matchByAuthor(paper.authors || [], authorCandidates, hasManualAuthor ? 0.85 : 0.9));
    // Reduce obvious noise in author-mode when topic terms exist.
    const topicText = (nonAuthorQuery || '').trim();
    const topicTokenCount = (topicText.match(/[a-z0-9가-힣]{3,}/gi) || []).length;
    if (topicTokenCount >= 2) {
      papers = papers.filter((paper) => {
        const merged = `${paper.title || ''} ${paper.abstract || ''}`;
        const rel = overlapRatio(topicText, merged);
        const conf = matchedAuthorConfidence(paper.authors || [], authorCandidates);
        return rel >= 0.03 || conf >= 0.9 || (paper.rankScore || 0) >= 72;
      });
    }
    const homonym = buildHomonymProfiles(papers, topicText || query, authorCandidates, {
      mergeThreshold: Number.isFinite(profileMergeThreshold) ? profileMergeThreshold : 0.5,
    });
    homonymProfiles = homonym.profiles;
    papers = homonym.rankedPapers;
    const requestedProfiles: string[] = Array.isArray(filters?.profileIds)
      ? filters.profileIds.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    if (requestedProfiles.length > 0) {
      const allowed = new Set(requestedProfiles);
      papers = papers.filter((p) => p.homonymProfileId && allowed.has(p.homonymProfileId));
    }
  }
  if (mode === 'precision') {
    papers = papers.filter((paper) => (paper.evidenceScore || 0) >= 0.05);
  }
  if (authorCandidates.length && intent !== 'TOPIC') {
    papers = papers.filter((paper) => strictAuthorWordMatch(paper.authors || [], authorCandidates));
  }
  papers = papers.filter((paper) => publicTopicGuard(paper, nonAuthorQuery || effectiveQuery));

  return {
    query,
    mode,
    intent,
    authorCandidates,
    papers,
    homonymProfiles,
    sourceHealth,
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
    const mode = normalizeSearchMode(payload?.mode || filters?.mode);
    if (typeof payload?.claim === 'string' && !filters.claim) filters.claim = payload.claim;
    if (typeof payload?.hypothesis === 'string' && !filters.hypothesis) filters.hypothesis = payload.hypothesis;
    const variants = buildQueryVariants(rawQuery, normalizedQuery);
    const attempts: Array<{ query: string; intent: QueryIntent; count: number }> = [];

    const primaryIntent = classifyIntent(normalizedQuery);
    let best: SearchAttemptResult | null = null;
    for (const candidate of variants) {
      const attempt = await runSingleSearchAttempt(candidate, filters, mode);
      attempts.push({ query: attempt.query, intent: attempt.intent, count: attempt.papers.length });
      if (!best || attemptScore(attempt) > attemptScore(best)) {
        best = attempt;
      }
      if (primaryIntent !== 'TOPIC' && attempt.intent !== 'TOPIC' && attempt.authorCandidates.length) break;
      if (shouldStopRetry(attempt)) break;
    }
    
    const totalTime = Date.now() - overallStart;
    console.log(`[Parallel Search] Total time: ${totalTime}ms`);
    const selected = best || {
      query: normalizedQuery,
      mode,
      intent: 'TOPIC' as QueryIntent,
      authorCandidates: [],
      papers: [],
      homonymProfiles: [],
      sourceHealth: [],
      trackResults: { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, final: 0 },
    };
    
    return NextResponse.json({ 
      papers: selected.papers,
      meta: {
        totalTime,
        mode: selected.mode,
        intent: selected.intent,
        normalizedQuery,
        selectedQuery: selected.query,
        attempts,
        authorCandidates: selected.authorCandidates,
        homonymProfiles: selected.homonymProfiles || [],
        sourceHealth: selected.sourceHealth || [],
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
