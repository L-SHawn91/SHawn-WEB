// /app/api/papers/search-parallel/route.ts
// 4-Track Parallel Search Implementation

import { NextRequest, NextResponse } from 'next/server';
import { correctBioTypos } from '../../../../lib/bio-typo';
import { enrichPapersWithJournalMetrics } from '../../../../lib/journal-metrics';
import { makeCacheKey, papersCache } from '../../../../lib/server-cache';
import {
  buildArxivQuery,
  classifyIntent,
  splitAuthorAndTopic,
  type QueryIntent,
} from '../../../../lib/search/queryPlanner';
import {
  buildPublicKeywordSpeciesQuery,
  buildPublicSuggestedTopics,
  expandPublicBioQueryLoose,
  mergePublicPaperRecords,
  normalizePublicBioQuery,
  parsePublicBioQuery,
  publicSourceHealth,
  publicTopicGuard,
  publicWorkflowScore,
  type PublicSourceHealth,
  type SuggestedTopic,
} from '../../../../lib/bio-search-public/workflow';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  source: 'pubmed' | 'arxiv' | 'semantic' | 'crossref' | 'openalex' | 'europepmc' | 'biorxiv';
  url: string;
  doi?: string;
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
  evidenceLabel?: string;
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
  journal?: string;
  journalIssn?: string;
  impactFactor?: number;
  journalQuartile?: string;
  journalHIndex?: number;
  journalField?: string;
  journalSubfield?: string;
  journalDomain?: string;
  journalTopic?: string;
  journalRecentYears?: Array<{ year: number; works: number; citations: number }>;
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
      const firstInitialBare = first ? first[0] : "";
      return uniqueList([
        candidate,
        flatName,
        `${last} ${first}`,
        `${last} ${firstInitialBare}`,
        `${last} ${firstInitial}`,
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

function extractExplicitAuthorLabels(query: string): string[] {
  const q = normalizePublicBioQuery(query || '');
  const values: string[] = [];
  const regex = /(?:^|\s)(?:author|authors|by|저자)\s*[:=：]?\s*([\s\S]*?)(?=\s+(?:species|organism|종|동물종|keyword|keywords|title|topic|키워드|제목)\s*[:=：]?|$)/gi;
  for (const match of q.matchAll(regex)) {
    const clean = String(match[1] || '').trim().replace(/\s+/g, ' ');
    if (clean) values.push(clean);
  }
  return uniqueList(values);
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

function titleKeywordTokens(query: string): string[] {
  // Keep species terms as real title/topic anchors. For author+species searches,
  // removing species made the query collapse into an author-only search and let
  // unrelated homonym papers through.
  const stop = new Set(['and', 'or', 'the', 'with', 'from', 'into', 'species', 'organism', 'keyword', 'keywords', 'author', 'authors']);
  return Array.from(new Set(((query || '').toLowerCase().match(/[a-z0-9-]{3,}/g) || [])
    .map((t) => t === 'rnaseq' ? 'rna-seq' : t)
    .filter((t) => !stop.has(t))))
    .slice(0, 6);
}

function speciesTopicMatches(speciesTerms: string[], text: string): boolean {
  if (!speciesTerms.length) return false;
  const t = (text || '').toLowerCase();
  return speciesTerms.some((raw) => {
    const s = normalizeName(raw);
    if (!s) return false;
    if (s === 'pig' || s === 'porcine' || s === 'sus scrofa') return /\b(pig|pigs|porcine|swine|sus\s+scrofa)\b/i.test(t);
    if (s === 'human' || s === 'homo sapiens') return /\b(human|humans|patient|patients|homo\s+sapiens)\b/i.test(t);
    if (s === 'mouse' || s === 'mus musculus') return /\b(mouse|mice|murine|mus\s+musculus)\b/i.test(t);
    if (s === 'rat' || s === 'rattus norvegicus') return /\b(rat|rats|rattus)\b/i.test(t);
    return t.includes(s);
  });
}

function tokenFrequency(text: string, token: string): number {
  const normalized = (text || '').toLowerCase();
  const prefix = token.slice(0, Math.max(5, token.length - 2));
  const terms = normalized.match(/[a-z0-9가-힣-]{3,}/g) || [];
  return terms.filter((term) => term === token || term.startsWith(prefix)).length;
}

function bm25LikeFieldScore(text: string, token: string, boost: number, avgLen: number): number {
  const terms = (text || '').toLowerCase().match(/[a-z0-9가-힣-]{3,}/g) || [];
  const tf = tokenFrequency(text, token);
  if (!tf) return 0;
  const k1 = 1.2;
  const b = 0.72;
  const dl = Math.max(1, terms.length);
  const rarityProxy = Math.min(2.4, 0.8 + token.length / 9);
  return boost * rarityProxy * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgLen))));
}

function queryWeightedOverlap(query: string, title: string, abstract = ''): number {
  const tokens = titleKeywordTokens(query);
  if (!tokens.length) return 0;
  const t = (title || '').toLowerCase();
  const a = (abstract || '').toLowerCase();
  const hit = (text: string, tok: string) => text.includes(tok) || text.includes(tok.slice(0, Math.max(5, tok.length - 2)));
  const titleHits = tokens.filter((tok) => hit(t, tok)).length;
  const abstractHits = tokens.filter((tok) => hit(a, tok)).length;
  const uniqueHits = tokens.filter((tok) => hit(t, tok) || hit(a, tok)).length;
  const bm25 = tokens.reduce((sum, tok) => sum
    + bm25LikeFieldScore(title, tok, 3.1, 12)
    + bm25LikeFieldScore(abstract, tok, 1.0, 160), 0) / Math.max(1, tokens.length);
  const normalizedQuery = normalizePublicBioQuery(query).toLowerCase();
  const phraseBonus = normalizedQuery.length >= 5 && t.includes(normalizedQuery)
    ? 0.75
    : normalizedQuery.length >= 5 && a.includes(normalizedQuery) ? 0.35 : 0;
  const adjacency = tokens.length >= 2 && t.includes(tokens.join(' ')) ? 0.45 : tokens.length >= 2 && a.includes(tokens.join(' ')) ? 0.2 : 0;
  const andBonus = uniqueHits === tokens.length ? 0.7 : uniqueHits / tokens.length >= 0.67 ? 0.35 : 0;
  const titleCoverage = titleHits / tokens.length;
  const orCoverage = uniqueHits / tokens.length;
  return Math.min(3.2, bm25 * 0.42 + titleCoverage * 0.8 + orCoverage * 0.55 + andBonus + phraseBonus + adjacency);
}

function buildPubMedTitleQuery(query: string): string {
  const tokens = titleKeywordTokens(query);
  if (!tokens.length) return query;
  const titleAnd = tokens.map((t) => `"${t.replace(/"/g, '')}"[Title]`).join(' AND ');
  const titleOr = tokens.map((t) => `"${t.replace(/"/g, '')}"[Title]`).join(' OR ');
  return `((${titleAnd}) OR (${titleOr}))`;
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

const NEG_PHRASES = [
  'no significant', 'not significant', 'not significantly',
  'did not', 'does not', 'do not', 'was not', 'were not', 'is not',
  'had no', 'have no', 'has no',
  'showed no', 'shows no', 'demonstrated no',
  'failed to', 'unable to',
  'no effect', 'no association', 'no difference', 'no change',
  'no increase', 'no decrease', 'no expression', 'no evidence',
  'not associated', 'not detected', 'not expressed', 'not observed',
  'not found', 'not identified', 'not correlated',
  'no correlation', 'no relationship', 'no improvement',
  'did not show', 'did not demonstrate', 'did not affect',
  'does not affect', 'does not support',
];

function hasNegation(text: string): boolean {
  const lower = (text || '').toLowerCase();
  const toks = lower.match(/[a-z0-9]{3,}/g) || [];
  if (toks.some((t) => NEG_TERMS.has(t))) return true;
  return NEG_PHRASES.some((phrase) => lower.includes(phrase));
}

function classifyEvidenceLabel(supportScore: number, contradictionScore: number, evidenceScore: number, hasClaim: boolean): string {
  if (!hasClaim) return 'mention-only';
  if (supportScore >= 0.18 && supportScore > contradictionScore * 1.15) return 'support';
  if (contradictionScore >= 0.18 && contradictionScore > supportScore * 1.15) return 'contradict';
  if (evidenceScore >= 0.12 || supportScore >= 0.08 || contradictionScore >= 0.08) return 'uncertain';
  return 'mention-only';
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

function authorPositionWeight(index: number, total: number): number {
  // Treat first author and last/corresponding-author proxy as equivalent.
  // Most public APIs do not expose corresponding-author flags consistently, so
  // last author is the safest cross-source proxy for senior/corresponding author.
  if (index === 0 || (total > 1 && index === total - 1)) return 1.25;
  if (index === 1) return 1.1;
  if (index <= 3) return 1.0;
  if (index <= 8) return 0.82;
  return 0.68;
}

function matchedAuthorPosition(authors: string[] = [], candidates: string[]): { index: number; confidence: number } | null {
  if (!authors.length || !candidates.length) return null;
  const normalizedCandidates = candidates.map((c) => normalizeName(c)).filter(Boolean);
  let best: { index: number; confidence: number } | null = null;
  for (let i = 0; i < authors.length; i += 1) {
    const author = normalizeName(authors[i] || '');
    if (!author) continue;
    const overlap = normalizedCandidates.reduce((m, c) => Math.max(m, tokenOverlapRatio(c, author)), 0);
    const confidence = Math.min(1.25, overlap * authorPositionWeight(i, authors.length));
    if (!best || confidence > best.confidence) best = { index: i, confidence };
  }
  return best;
}

function matchedAuthorConfidence(authors: string[] = [], candidates: string[]): number {
  return Number((matchedAuthorPosition(authors, candidates)?.confidence || 0).toFixed(4));
}


function getAuthorPriorityBoost(paper: Paper, authorCandidates: string[], intent: QueryIntent): number {
  if (!authorCandidates.length) return 0;
  const isMatched = matchByAuthor(paper.authors || [], authorCandidates, intent === 'AUTHOR_WEAK' ? 0.9 : 0.8);
  if (!isMatched) return intent === 'AUTHOR_STRONG' ? -25 : -10;

  const matchedPosition = matchedAuthorPosition(paper.authors || [], authorCandidates);
  const total = paper.authors?.length || 0;
  const firstOrLast = matchedPosition && (matchedPosition.index === 0 || (total > 1 && matchedPosition.index === total - 1));
  const positionBoost = firstOrLast ? 12 : matchedPosition && matchedPosition.index <= 3 ? 6 : 0;
  if (paper.matchType === 'author-exact') return 35 + positionBoost;
  if (paper.matchType === 'author-weak') return 22 + positionBoost;
  return 15 + positionBoost;
}

// T1: PubMed track - clinical metadata
async function t1_pubmedEnhanced(query: string, yearFrom?: string, yearTo?: string, authorCandidates: string[] = [], intent: QueryIntent = 'TOPIC'): Promise<Paper[]> {
  console.log('[T1:PubMed] Search starting...');
  const startTime = Date.now();
  
  try {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const authorTerm = buildAuthorTermForPubMed(authorCandidates);
    const pubmedParts = parsePublicBioQuery(query);
    const speciesOrTerm = pubmedParts.species.length
      ? `(${pubmedParts.species.slice(0, 4).map((s) => `"${s.replace(/"/g, '')}"[Title/Abstract]`).join(' OR ')})`
      : '';
    const speciesOnlyKeyword = pubmedParts.species.length > 0
      && pubmedParts.keywords
      && pubmedParts.species.some((s) => normalizeName(s) === normalizeName(pubmedParts.keywords));
    const keywordTerm = pubmedParts.keywords && !speciesOnlyKeyword ? `(${pubmedParts.keywords})` : '';
    const topicTerm = speciesOrTerm && keywordTerm
      ? `${keywordTerm} AND ${speciesOrTerm}`
      : (speciesOrTerm || (query ? `(${query})` : ''));
    const termParts: string[] = [];

    if (intent === 'INSTITUTION') {
      // Split off institution prefix from topic suffix.
      // Use only the unique institution word (before "university/institute/...") for
      // [Affiliation] — PubMed stores affiliations in many formats, partial match is safer.
      const instKeywordPos = query.search(/\b(?:university|univ|institute|hospital|college|center|centre|laboratory|lab)\b/i);
      let instCore: string;
      let topicPart: string;
      if (instKeywordPos > 0) {
        // Include up to and including the keyword
        const afterKeyword = query.slice(instKeywordPos).match(/\b(?:university|univ|institute|hospital|college|center|centre|laboratory|lab)\b/i);
        const keywordEnd = instKeywordPos + (afterKeyword?.[0]?.length ?? 0);
        instCore = query.slice(0, keywordEnd).trim();
        topicPart = query.slice(keywordEnd).trim();
      } else {
        instCore = query;
        topicPart = '';
      }
      // Use first distinctive word of institution for broader affiliation match
      const distinctWord = instCore.split(/\s+/)[0] || instCore;
      termParts.push(`("${distinctWord}"[Affiliation])`);
      if (topicPart) {
        // OR-join so partial matches still retrieve results (strict AND may give 0 hits)
        const topicTokens = topicPart.trim().split(/\s+/).filter(Boolean);
        const topicOr = topicTokens.length > 1
          ? `(${topicTokens.join(' OR ')})`
          : `(${topicPart})`;
        termParts.push(topicOr);
      }
    } else if (authorTerm) {
      termParts.push(`(${authorTerm})`);
      if (intent === 'AUTHOR_WEAK' && topicTerm) {
        termParts.push(topicTerm);
      }
    } else if (topicTerm) {
      termParts.push(topicTerm);
    }

    const ncbiKeyEarly = process.env.NCBI_API_KEY || '';
    const params = new URLSearchParams({
      db: 'pubmed',
      term: termParts.join(' AND '),
      retmode: 'json',
      retmax: (authorCandidates.length > 0 && intent !== 'TOPIC') ? '50' : '15',
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
        journal: doc.fulljournalname || doc.source || undefined,
        journalIssn: doc.issn || doc.essn || undefined,
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

    const primaryQuery = `${planned} AND (cat:cs.LG OR cat:cs.AI OR cat:cs.CL OR cat:cs.CV OR cat:q-bio.GN OR cat:q-bio.CB OR cat:q-bio.MN OR cat:q-bio.TO OR cat:q-bio.BM)`;
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
      const fallbackQuery = `(${query}) AND (cat:cs.LG OR cat:cs.AI OR cat:cs.CL OR cat:cs.CV OR cat:q-bio.GN OR cat:q-bio.CB OR cat:q-bio.MN OR cat:q-bio.TO OR cat:q-bio.BM)`;
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

async function t3_semanticAuthorSearch(
  authorName: string,
  yearFrom?: string,
  yearTo?: string,
): Promise<Paper[]> {
  const s2Key = process.env.S2_API_KEY || process.env.SEMANTIC_SCHOLAR_API_KEY || '';
  const headers: Record<string, string> = s2Key ? { 'x-api-key': s2Key } : {};
  try {
    const authorRes = await fetch(
      `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(authorName)}&fields=authorId,name,paperCount,affiliations&limit=5`,
      { headers, signal: AbortSignal.timeout(10000) },
    );
    if (!authorRes.ok) return [];
    const authorData = await authorRes.json();
    const candidates: any[] = authorData.data || [];
    if (!candidates.length) return [];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const qNorm = norm(authorName);
    const best = candidates.find((a: any) => {
      const n = norm(a.name || '');
      return n === qNorm || n.includes(qNorm) || qNorm.includes(n);
    }) ?? candidates[0];
    if (!best?.authorId) return [];
    const papersRes = await fetch(
      `https://api.semanticscholar.org/graph/v1/author/${best.authorId}/papers?fields=paperId,title,authors,year,abstract,citationCount,openAccessPdf,url,publicationTypes,venue,journal&limit=100&sort=year`,
      { headers, signal: AbortSignal.timeout(15000) },
    );
    if (!papersRes.ok) return [];
    const papersData = await papersRes.json();
    // S2 publicationTypes that are NOT primary research outputs
    const NON_PAPER_TYPES = new Set(['LettersAndComments', 'Editorial', 'News', 'Dataset']);
    const NON_PAPER_TITLE = /^(comment(ed)?|letter|response|reply|erratum|correction|retraction|editorial)\b/i;
    return ((papersData.data as any[]) || [])
      .filter((p: any) => {
        if (yearFrom && (p.year || 0) < parseInt(yearFrom)) return false;
        if (yearTo && (p.year || 0) > parseInt(yearTo)) return false;
        // Exclude non-paper publication types
        const types: string[] = p.publicationTypes || [];
        if (types.length && types.every((t: string) => NON_PAPER_TYPES.has(t))) return false;
        // Exclude by title pattern as fallback
        const title: string = p.title || '';
        if (title && NON_PAPER_TITLE.test(title.trim())) return false;
        return true;
      })
      .map((p: any) => ({
        id: `semantic-${p.paperId}`,
        title: p.title || 'No title',
        authors: (p.authors || []).map((a: any) => a.name).filter(Boolean),
        abstract: p.abstract || 'No abstract available',
        year: p.year || new Date().getFullYear(),
        source: 'semantic' as const,
        url: p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
        pdfUrl: p.openAccessPdf?.url,
        citations: typeof p.citationCount === 'number' ? p.citationCount : undefined,
        matchType: 'author-exact' as const,
        journal: (p.venue as string | undefined) || (p.journal?.name as string | undefined) || undefined,
        journalIssn: (p.journal?.issn as string | undefined) || undefined,
      }));
  } catch {
    return [];
  }
}

// T3: Semantic Scholar track - influence analysis
async function t3_semanticEnhanced(query: string, yearFrom?: string, yearTo?: string, authorCandidates: string[] = [], intent: QueryIntent = 'TOPIC'): Promise<Paper[]> {
  console.log('[T3:Semantic] Search starting...');
  const startTime = Date.now();
  
  try {
    if (authorCandidates.length > 0 && (intent === 'AUTHOR_STRONG' || intent === 'AUTHOR_WEAK')) {
      const results = await t3_semanticAuthorSearch(authorCandidates[0]!, yearFrom, yearTo);
      if (results.length > 0) return results;
    }

    const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
    const params = new URLSearchParams({
      query,
      limit: '15',
      fields: 'title,authors,year,abstract,url,citationCount,referenceCount,influentialCitationCount,openAccessPdf,fieldsOfStudy,venue,journal',
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
          journal: (paper.venue as string | undefined) || (paper.journal?.name as string | undefined) || undefined,
          journalIssn: (paper.journal?.issn as string | undefined) || undefined,
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
    if (authorCandidates.length > 0 && (intent === 'AUTHOR_STRONG' || intent === 'AUTHOR_WEAK')) {
      try {
        const authorSearchRes = await fetch(
          `https://api.openalex.org/authors?search=${encodeURIComponent(authorCandidates[0]!)}&select=id,display_name&per_page=5`,
          { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } },
        );
        if (authorSearchRes.ok) {
          const authorData = await authorSearchRes.json();
          const authorResults: any[] = authorData?.results || [];
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          const qNorm = norm(authorCandidates[0]!);
          const bestAuthor = authorResults.find((a: any) => {
            const n = norm(a.display_name || '');
            return n === qNorm || n.includes(qNorm) || qNorm.includes(n);
          }) ?? authorResults[0];
          if (bestAuthor?.id) {
            const worksParams = new URLSearchParams({
              filter: `author.id:${bestAuthor.id}`,
              per_page: '50',
              select: 'id,display_name,publication_year,authorships,abstract_inverted_index,primary_location,cited_by_count',
            });
            const worksRes = await fetch(`https://api.openalex.org/works?${worksParams.toString()}`, {
              signal: AbortSignal.timeout(15000),
              headers: { Accept: 'application/json' },
            });
            if (worksRes.ok) {
              const worksData = await worksRes.json();
              const rows: any[] = worksData?.results || [];
              const authorPapers = rows
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
                    matchType: 'author-exact' as const,
                    journal: (row.primary_location?.source?.display_name as string | undefined) || undefined,
                    journalIssn: (row.primary_location?.source?.issn_l as string | undefined) || undefined,
                    impactFactor: typeof row.primary_location?.source?.impact_factor === 'number' ? row.primary_location.source.impact_factor : undefined,
                  } as Paper;
                })
                .filter((p: Paper | null): p is Paper => p !== null);
              if (authorPapers.length > 0) {
                console.log(`[T5:OpenAlex] Author API found ${authorPapers.length} papers in ${Date.now() - startTime}ms`);
                return authorPapers;
              }
            }
          }
        }
      } catch {
        // fall through to text search
      }
    }

    const params = new URLSearchParams({
      search: query,
      per_page: authorCandidates.length > 0 && intent !== 'TOPIC' ? '50' : '15',
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
          journal: (row.primary_location?.source?.display_name as string | undefined) || undefined,
          journalIssn: (row.primary_location?.source?.issn_l as string | undefined) || undefined,
          impactFactor: typeof row.primary_location?.source?.impact_factor === 'number' ? row.primary_location.source.impact_factor : undefined,
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

async function t5_openalexTitleFallback(query: string, yearFrom?: string, yearTo?: string): Promise<Paper[]> {
  const clean = buildPublicKeywordSpeciesQuery(query, { expand: false, titleOnly: true });
  const params = new URLSearchParams({
    filter: `title.search:${clean}`,
    per_page: '25',
    select: 'id,display_name,publication_year,authorships,abstract_inverted_index,primary_location,cited_by_count',
  });
  try {
    const res = await fetch(`https://api.openalex.org/works?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows: any[] = Array.isArray(data?.results) ? data.results : [];
    return rows.map((row: any) => {
      const year = row?.publication_year || new Date().getFullYear();
      if (yearFrom && year < parseInt(yearFrom)) return null;
      if (yearTo && year > parseInt(yearTo)) return null;
      const inv = row.abstract_inverted_index;
      const words: Record<number, string> = {};
      if (inv && typeof inv === 'object') {
        for (const [word, positions] of Object.entries(inv)) {
          if (Array.isArray(positions)) positions.forEach((p) => { if (typeof p === 'number') words[p] = String(word); });
        }
      }
      const abstract = Object.keys(words).map(Number).sort((a, b) => a - b).map((i) => words[i]).filter(Boolean).join(' ') || 'No abstract available';
      return {
        id: `openalex-${row.id || Math.random().toString(36).slice(2)}`,
        title: row.display_name || 'No title',
        authors: Array.isArray(row.authorships) ? row.authorships.map((a: any) => a?.author?.display_name).filter((x: unknown): x is string => typeof x === 'string') : [],
        abstract,
        year,
        source: 'openalex' as const,
        url: row?.primary_location?.landing_page_url || row?.id || 'https://openalex.org',
        citations: typeof row?.cited_by_count === 'number' ? row.cited_by_count : undefined,
        matchType: 'topic' as const,
        journal: (row.primary_location?.source?.display_name as string | undefined) || undefined,
        journalIssn: (row.primary_location?.source?.issn_l as string | undefined) || undefined,
      } as Paper;
    }).filter((p: Paper | null): p is Paper => p !== null);
  } catch {
    return [];
  }
}

// T6: Europe PMC - free, indexes PubMed + European research + bioRxiv/medRxiv preprints
async function t6_europePmcEnhanced(
  query: string,
  yearFrom?: string,
  yearTo?: string,
  authorCandidates: string[] = [],
  intent: QueryIntent = 'TOPIC',
): Promise<Paper[]> {
  console.log('[T6:EuropePMC] Search starting...');
  const startTime = Date.now();
  try {
    let searchQuery = query;
    if (intent === 'INSTITUTION') {
      const instKeywordPos = query.search(/\b(?:university|univ|institute|hospital|college|center|centre|laboratory|lab)\b/i);
      if (instKeywordPos > 0) {
        const afterKeyword = query.slice(instKeywordPos).match(/\b(?:university|univ|institute|hospital|college|center|centre|laboratory|lab)\b/i);
        const keywordEnd = instKeywordPos + (afterKeyword?.[0]?.length ?? 0);
        const distinctWord = query.slice(0, keywordEnd).trim().split(/\s+/)[0] || '';
        const topicPart = query.slice(keywordEnd).trim();
        searchQuery = topicPart ? `AFF:"${distinctWord}" AND (${topicPart})` : `AFF:"${distinctWord}"`;
      }
    } else if (authorCandidates.length && intent !== 'TOPIC') {
      const authorPart = authorCandidates.slice(0, 2).map((a) => `AUTH:"${a}"`).join(' OR ');
      const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      const nameTokens = new Set(authorCandidates.flatMap((a) => a.toLowerCase().split(/\s+/).filter(Boolean)));
      const isJustName = queryTokens.length > 0 && queryTokens.every((t) => nameTokens.has(t));
      searchQuery = isJustName ? `(${authorPart})` : `(${authorPart}) AND (${query})`;
    }
    if (yearFrom || yearTo) {
      const from = yearFrom || '1900';
      const to = yearTo || String(new Date().getFullYear());
      searchQuery += ` AND FIRST_PDATE:[${from}-01-01 TO ${to}-12-31]`;
    }
    const params = new URLSearchParams({
      query: searchQuery,
      format: 'json',
      pageSize: '15',
      resulttype: 'core',
    });
    const res = await fetch(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const data = await res.json();
    const rows = data?.resultList?.result;
    if (!Array.isArray(rows)) return [];

    const papers = rows
      .map((r: any) => {
        const year = parseInt(r.pubYear || '0') || new Date().getFullYear();
        if (yearFrom && year < parseInt(yearFrom)) return null;
        if (yearTo && year > parseInt(yearTo)) return null;
        const authorStr: string = r.authorString || '';
        const authors = authorStr.split(',').map((a: string) => a.trim()).filter(Boolean).slice(0, 10);
        const src = (r.source || '').toLowerCase();
        const pid = r.pmid || r.id || '';
        const doi = r.doi || undefined;
        return {
          id: `europepmc-${r.id || Math.random().toString(36).slice(2)}`,
          title: r.title || 'No title',
          authors,
          abstract: r.abstractText || 'No abstract available',
          year,
          source: 'europepmc' as const,
          url: doi ? `https://doi.org/${doi}` : pid ? `https://europepmc.org/article/${src}/${pid}` : 'https://europepmc.org',
          doi,
          citations: parseInt(r.citedByCount || '0') || undefined,
          matchType: authorCandidates.length ? (intent === 'AUTHOR_WEAK' ? 'author-weak' : 'author-exact') : 'topic',
          journal: r.journalTitle || r.journal || undefined,
          journalIssn: r.journalInfo?.issn || r.journalInfo?.journal?.issn || undefined,
        } as Paper;
      })
      .filter((p: Paper | null): p is Paper => p !== null)
      .filter((paper) => {
        if (!authorCandidates.length || intent === 'TOPIC') return true;
        const minOverlap = intent === 'AUTHOR_WEAK' ? 0.92 : 0.8;
        return matchByAuthor(paper.authors || [], authorCandidates, minOverlap);
      });

    console.log(`[T6:EuropePMC] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T6:EuropePMC] Error:', error);
    return [];
  }
}

// T7: bioRxiv — direct preprint search via NCBI Entrez (biorxiv[TA] filter)
async function t7_biorxivEnhanced(
  query: string,
  yearFrom?: string,
  yearTo?: string,
  _authorCandidates: string[] = [],
  intent: QueryIntent = 'TOPIC',
): Promise<Paper[]> {
  if (!query || intent === 'INSTITUTION') return [];
  console.log('[T7:bioRxiv] Search starting...');
  const startTime = Date.now();
  try {
    const apiKey = process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : '';
    const datePart = yearFrom
      ? `&mindate=${yearFrom}&maxdate=${yearTo || new Date().getFullYear()}&datetype=pdat`
      : '';
    const searchQ = encodeURIComponent(`(${query}) AND biorxiv[TA]`);
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${searchQ}&retmax=20&retmode=json${datePart}${apiKey}`;
    const searchResp = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
    if (!searchResp.ok) return [];
    const searchData = await searchResp.json() as { esearchresult?: { idlist?: string[] } };
    const ids: string[] = searchData?.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${ids.join(',')}&retmode=xml${apiKey}`;
    const fetchResp = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
    if (!fetchResp.ok) return [];
    const xml = await fetchResp.text();

    // Lightweight XML extraction — no DOM parser needed for this structure
    const papers: Paper[] = [];
    const articleRx = /<article[\s>][\s\S]*?<\/article>/gi;
    let match: RegExpExecArray | null;
    while ((match = articleRx.exec(xml)) !== null && papers.length < 20) {
      const block = match[0];
      const getText = (tag: string) => {
        const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
        return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
      };
      const title = getText('article-title');
      const abstract = getText('abstract');
      const doiMatch = /<article-id pub-id-type="doi">(.*?)<\/article-id>/i.exec(block);
      const doi = doiMatch ? doiMatch[1].trim() : '';
      const yearMatch = /<pub-date[^>]*>[\s\S]*?<year>(\d{4})<\/year>/i.exec(block);
      const year = yearMatch ? parseInt(yearMatch[1]) : 0;
      const authorsBlock = block.match(/<surname>(.*?)<\/surname>/gi) || [];
      const firstAuthor = authorsBlock[0]?.replace(/<[^>]+>/g, '').trim() || '';
      if (!title) continue;
      papers.push({
        id: doi || title.slice(0, 40),
        title,
        abstract,
        authors: firstAuthor ? [firstAuthor] : [],
        year,
        source: 'biorxiv',
        doi,
        url: doi ? `https://www.biorxiv.org/content/${doi}` : '',
        citations: 0,
      });
    }
    console.log(`[T7:bioRxiv] Completed in ${Date.now() - startTime}ms, found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('[T7:bioRxiv] Error:', error);
    return [];
  }
}

// T_Ranker: Integration & ranking
function t6_integrateAndRank(
  t1Results: Paper[],
  t2Results: Paper[],
  t3Results: Paper[],
  t4Results: Paper[],
  t5Results: Paper[],
  t6Results: Paper[],
  intent: QueryIntent,
  authorCandidates: string[] = [],
  claim: string = '',
  hypothesis: string = '',
  query: string = '',
  t7Results: Paper[] = [],
): Paper[] {
  console.log('[T6:Ranker] Integration and ranking starting...');
  const startTime = Date.now();
  
  // Merge all results
  const allPapers = [...t1Results, ...t2Results, ...t3Results, ...t4Results, ...t5Results, ...t6Results, ...t7Results];
  
  // Public-safe workflow merge: DOI/public ID/title dedupe while preserving source hits and best metadata.
  const uniquePapers = mergePublicPaperRecords(allPapers);
  
  // Ranking algorithm
  const hasEvidenceQuery = Boolean((claim || '').trim() || (hypothesis || '').trim());
  const rankedPapers = uniquePapers.map(paper => {
    let score = 0;
    const mergedText = `${paper.title || ''} ${paper.abstract || ''}`.trim();
    const claimOverlap = claim ? overlapRatio(claim, mergedText) : 0;
    const hypothesisOverlap = hypothesis ? overlapRatio(hypothesis, mergedText) : 0;
    // citations excluded from relevance — used only for user-facing sort
    const stage1Score = Number((0.75 * claimOverlap + 0.25 * hypothesisOverlap).toFixed(4));
    const s2 = sentenceEvidence(claim, hypothesis, paper.abstract || '');
    const hasAbstract = (paper.abstract || '').trim().length > 0 && !(paper.abstract || '').startsWith('No abstract');
    const evidenceScore = claim && hasAbstract
      ? Number((0.45 * stage1Score + 0.55 * s2.stage2Score).toFixed(4))
      : stage1Score;
    
    // Public-safe SHawn bio workflow score: recency + citation signal + topic overlap + source reliability + metadata hints.
    score += publicWorkflowScore(paper, query);
    score += Math.round(queryWeightedOverlap(query, paper.title || '', paper.abstract || '') * 35);

    // Author-first priority boost
    const authorBoost = getAuthorPriorityBoost(paper, authorCandidates, intent);
    score += authorBoost;
    if (authorCandidates.length) score += Math.round(matchedAuthorConfidence(paper.authors || [], authorCandidates) * 22);
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
      evidenceLabel: classifyEvidenceLabel(s2.supportScore, s2.contradictionScore, evidenceScore, Boolean(claim)),
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

type TrackSource = 'pubmed' | 'arxiv' | 'semantic' | 'crossref' | 'openalex' | 'europepmc' | 'biorxiv';
type SearchMode = 'broad' | 'precision' | 'author';

// Tiered parallel fetch constants
// Tier 1 (fast/reliable): 12s deadline; Tier 2 (slower/optional): +8s
const TIER1_SOURCES_WEB = new Set<TrackSource>(['pubmed', 'semantic', 'openalex', 'europepmc']);
const TIER1_DEADLINE_MS = 12_000;
const TIER2_DEADLINE_MS = 8_000;
// Skip Tier 2 when Tier 1 already returned this many raw papers
const TIER1_EARLY_STOP = 30;

async function tieredSettle(promises: Promise<Paper[]>[], deadlineMs: number): Promise<PromiseSettledResult<Paper[]>[]> {
  if (!promises.length) return [];
  return Promise.race([
    Promise.allSettled(promises),
    new Promise<PromiseSettledResult<Paper[]>[]>((resolve) =>
      setTimeout(() => resolve(promises.map(() => ({ status: 'fulfilled' as const, value: [] }))), deadlineMs)
    ),
  ]);
}

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
  trackResults: { t1: number; t2: number; t3: number; t4: number; t5: number; t6: number; final: number };
  sourceHealth?: PublicSourceHealth[];
  papers: Paper[];
  bySource?: Record<string, Paper[]>;
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
  const parsedPublicQuery = parsePublicBioQuery(query);
  const explicitAuthorLabels = extractExplicitAuthorLabels(query);
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
  const labeledAuthorAliases = uniqueList([...explicitAuthorLabels, ...parsedPublicQuery.authors].flatMap((name) => [name, ...extractAuthorCandidates(name).authorCandidates]));
  const baseCandidates = split.author ? [split.author, ...extractAuthorCandidates(split.author).authorCandidates] : [split.author, ...labeledAuthorAliases, ...extracted.authorCandidates];
  const authorCandidatesRaw = uniqueList(baseCandidates.filter(Boolean))
    .filter((name) => String(name || '').trim().split(/\s+/).filter(Boolean).length <= 4);
  const authorCandidatesMerged = uniqueList([...authorCandidatesRaw, ...manualAuthorNames]);
  const hasStructuredAuthor = explicitAuthorLabels.length > 0 || parsedPublicQuery.authors.length > 0;
  // AUTO-PROMOTE: name-like query or explicit author-labeled query → author mode
  const effectiveMode: SearchMode = (mode === 'broad' && (hasStructuredAuthor || intent === 'AUTHOR_STRONG' || intent === 'AUTHOR_WEAK'))
    ? 'author'
    : mode;

  const authorCandidates =
    effectiveMode === 'author' || hasStructuredAuthor
      ? authorCandidatesMerged
      : hasManualAuthor
        ? authorCandidatesMerged
        : (intent === 'TOPIC' || intent === 'INSTITUTION' ? [] : authorCandidatesRaw);
  const hasStructuredTopic = parsedPublicQuery.species.length > 0 || parsedPublicQuery.keywords !== parsedPublicQuery.normalized;
  const detectedTopic = (parsedPublicQuery.authors.length || hasStructuredTopic)
    ? (parsedPublicQuery.keywords || parsedPublicQuery.species.join(' ') || extracted.cleanQuery || query).trim()
    : (split.topic || parsedPublicQuery.keywords || extracted.cleanQuery || query).trim();
  const pureAuthorSearch = effectiveMode === 'author' && !split.topic && !hasStructuredTopic;
  const topicQuery = pureAuthorSearch
    ? ''
    : ((!hasManualAuthor && effectiveMode !== 'author' && intent === 'AUTHOR_WEAK' && !split.topic && !hasStructuredTopic) ? '' : detectedTopic);
  const effectiveQuery = pureAuthorSearch
    ? (authorCandidates[0] || query).trim()
    : expandPublicBioQueryLoose((topicQuery || authorCandidates[0] || query).trim());

  const defaultSourcesByMode: Record<SearchMode, TrackSource[]> = {
    broad: ['pubmed', 'semantic', 'openalex', 'europepmc', 'biorxiv'],
    precision: ['pubmed', 'semantic', 'openalex', 'europepmc'],
    author: ['pubmed', 'semantic', 'openalex', 'europepmc'],
  };
  const sources: TrackSource[] = filters?.sources || defaultSourcesByMode[effectiveMode];
  const yearFrom = filters?.yearFrom;
  const yearTo = filters?.yearTo;
  const claimRaw = typeof filters?.claim === 'string' ? filters.claim.trim() : '';
  const claim = effectiveMode === 'precision' && !claimRaw ? query : claimRaw;
  const hypothesis = typeof filters?.hypothesis === 'string' ? filters.hypothesis.trim() : '';
  const profileMergeThreshold = typeof filters?.profileMergeThreshold === 'number'
    ? filters.profileMergeThreshold
    : Number(filters?.profileMergeThreshold);
  const nonAuthorQuery = buildPublicKeywordSpeciesQuery(topicQuery || query, { expand: true, titleOnly: true });

  const trackJobs: Array<{ source: TrackSource; promise: Promise<Paper[]> }> = [];
  if (sources.includes('pubmed')) {
    // INSTITUTION: pass full original query so T1 can extract affiliation name.
    // TOPIC/AUTHOR: pass raw topicQuery — synonym expansion causes zero results for
    // specific gene queries (e.g. DHCR24 endometrium → adds "uterine lining" AND).
    const pubmedQuery = intent === 'INSTITUTION' ? query : buildPublicKeywordSpeciesQuery(topicQuery || query, { expand: true, titleOnly: true });
    trackJobs.push({ source: 'pubmed', promise: t1_pubmedEnhanced(pubmedQuery, yearFrom, yearTo, authorCandidates, intent) });
  }
  if (sources.includes('semantic')) {
    trackJobs.push({ source: 'semantic', promise: t3_semanticEnhanced(effectiveQuery, yearFrom, yearTo, authorCandidates, intent) });
  }
  if (sources.includes('openalex')) {
    trackJobs.push({ source: 'openalex', promise: t5_openalexEnhanced(nonAuthorQuery, yearFrom, yearTo, authorCandidates, intent) });
  }
  if (sources.includes('europepmc')) {
    const epmcQuery = intent === 'INSTITUTION' ? query : buildPublicKeywordSpeciesQuery(topicQuery || query, { expand: true, titleOnly: true });
    trackJobs.push({ source: 'europepmc', promise: t6_europePmcEnhanced(epmcQuery, yearFrom, yearTo, authorCandidates, intent) });
  }
  if (sources.includes('biorxiv')) {
    trackJobs.push({ source: 'biorxiv', promise: t7_biorxivEnhanced(buildPublicKeywordSpeciesQuery(topicQuery || query, { expand: true, titleOnly: true }), yearFrom, yearTo, authorCandidates, intent) });
  }

  const sourceStartedAt = new Map(trackJobs.map((job) => [job.source, Date.now()]));

  // Tiered parallel fetch: Tier 1 (fast) → Tier 2 (supplemental, skipped on early-stop)
  const tier1Jobs = trackJobs.filter((j) => TIER1_SOURCES_WEB.has(j.source));
  const tier2Jobs = trackJobs.filter((j) => !TIER1_SOURCES_WEB.has(j.source));

  const tier1Settled = await tieredSettle(tier1Jobs.map((j) => j.promise), TIER1_DEADLINE_MS);
  const tier1Count = tier1Settled.reduce(
    (sum, r) => sum + (r.status === 'fulfilled' ? r.value.length : 0), 0
  );
  const skipTier2 = tier1Count >= TIER1_EARLY_STOP;

  const tier2Settled = skipTier2
    ? tier2Jobs.map((): PromiseSettledResult<Paper[]> => ({ status: 'fulfilled', value: [] }))
    : await tieredSettle(tier2Jobs.map((j) => j.promise), TIER2_DEADLINE_MS);

  const t1Map = new Map(tier1Jobs.map((j, i) => [j.source, tier1Settled[i]!]));
  const t2Map = new Map(tier2Jobs.map((j, i) => [j.source, tier2Settled[i]!]));
  const settled = trackJobs.map(
    (j): PromiseSettledResult<Paper[]> =>
      t1Map.get(j.source) ?? t2Map.get(j.source) ?? { status: 'fulfilled', value: [] }
  );

  const bySource: Record<TrackSource, Paper[]> = {
    pubmed: [],
    arxiv: [],
    semantic: [],
    crossref: [],
    openalex: [],
    europepmc: [],
    biorxiv: [],
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
    bySource.europepmc,
    intent,
    authorCandidates,
    claim,
    hypothesis,
    nonAuthorQuery,
    bySource.biorxiv,
  );
  const fallbackRawPapers = papersRanked.length
    ? papersRanked
    : mergePublicPaperRecords([
        ...bySource.pubmed,
        ...bySource.semantic,
        ...bySource.openalex,
        ...bySource.europepmc,
        ...bySource.biorxiv,
      ]).map((p) => ({ ...p, rankScore: Math.round(publicWorkflowScore(p, effectiveQuery || nonAuthorQuery)) }));
  let papers = firstAuthorOnly
    ? fallbackRawPapers.filter((paper) => matchByFirstAuthor(paper.authors || [], authorCandidates, hasManualAuthor ? 0.85 : 0.9))
    : fallbackRawPapers;
  let homonymProfiles: SearchAttemptResult['homonymProfiles'] = undefined;

  if (effectiveMode === 'author' && authorCandidates.length) {
    papers = papers.filter((paper) => matchByAuthor(paper.authors || [], authorCandidates, hasManualAuthor ? 0.85 : 0.9));
    // Reduce obvious noise in author-mode when topic terms exist.
    const topicText = (nonAuthorQuery || '').trim();
    const topicTokenCount = (topicText.match(/[a-z0-9가-힣]{3,}/gi) || []).length;
    if (topicTokenCount >= 1 && parsedPublicQuery.species.length > 0) {
      papers = papers.filter((paper) => {
        const merged = `${paper.title || ''} ${paper.abstract || ''}`;
        const rel = overlapRatio(topicText, merged);
        return rel >= 0.03 || speciesTopicMatches(parsedPublicQuery.species, merged);
      });
    } else if (topicTokenCount >= 2) {
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
  if (effectiveMode === 'precision') {
    papers = papers.filter((paper) => (paper.evidenceScore || 0) >= 0.05);
  }
  if (authorCandidates.length && intent !== 'TOPIC') {
    papers = papers.filter((paper) => strictAuthorWordMatch(paper.authors || [], authorCandidates));
  }
  // INSTITUTION: affiliation filter in PubMed already constrains results; skip topic guard.
  if (intent !== 'INSTITUTION') {
    const beforeTopicGuard = papers;
    const guardQuery = buildPublicKeywordSpeciesQuery(topicQuery || query, { expand: false, titleOnly: true }) || nonAuthorQuery || effectiveQuery;
    papers = papers.filter((paper) => {
      if (parsedPublicQuery.species.length > 0 && speciesTopicMatches(parsedPublicQuery.species, `${paper.title || ''} ${paper.abstract || ''}`)) return true;
      return publicTopicGuard(paper, guardQuery);
    });
    if (papers.length === 0 && beforeTopicGuard.length > 0) {
      const relaxedTopic = buildPublicKeywordSpeciesQuery(topicQuery || query, { expand: false, titleOnly: true });
      papers = beforeTopicGuard
        .filter((paper) => {
          const merged = `${paper.title || ''} ${paper.abstract || ''}`;
          return overlapRatio(relaxedTopic, merged) >= 0.08 || queryWeightedOverlap(relaxedTopic, paper.title || '', paper.abstract || '') >= 0.28;
        })
        .map((paper) => ({ ...paper, rankScore: Math.max(paper.rankScore || 0, Math.round(publicWorkflowScore(paper, relaxedTopic) + queryWeightedOverlap(relaxedTopic, paper.title || '', paper.abstract || '') * 35)) }))
        .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
        .slice(0, 50);
    }
    if (papers.length === 0 && topicQuery && !(effectiveMode === 'author' && authorCandidates.length)) {
      const titleFallback = await Promise.allSettled([
        t1_pubmedEnhanced(buildPubMedTitleQuery(topicQuery), yearFrom, yearTo, [], 'TOPIC'),
        t5_openalexTitleFallback(topicQuery, yearFrom, yearTo),
        t3_semanticEnhanced(buildPublicKeywordSpeciesQuery(topicQuery, { expand: false, titleOnly: true }), yearFrom, yearTo, [], 'TOPIC'),
      ]);
      const fallbackRows = titleFallback.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
      papers = mergePublicPaperRecords(fallbackRows)
        .filter((paper) => overlapRatio(buildPublicKeywordSpeciesQuery(topicQuery, { expand: false, titleOnly: true }), `${paper.title || ''} ${paper.abstract || ''}`) >= 0.08)
        .map((paper) => ({ ...paper, rankScore: Math.round(publicWorkflowScore(paper, topicQuery)) }))
        .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
        .slice(0, 50);
    }
  }

  papers = papers.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));

  // Per-source view: topic-guarded raw results scored lightly (no cross-source dedup)
  const bySourceScored: Record<string, Paper[]> = {};
  const activeSrcs: TrackSource[] = ['pubmed', 'semantic', 'openalex', 'europepmc', 'biorxiv'];
  for (const src of activeSrcs) {
    const srcPapers = bySource[src];
    if (!srcPapers?.length) continue;
    const guardFilter = intent === 'INSTITUTION'
      ? srcPapers
      : srcPapers.filter((p) => {
          if (parsedPublicQuery.species.length > 0 && speciesTopicMatches(parsedPublicQuery.species, `${p.title || ''} ${p.abstract || ''}`)) return true;
          return publicTopicGuard(p, buildPublicKeywordSpeciesQuery(topicQuery || query, { expand: false, titleOnly: true }) || nonAuthorQuery || effectiveQuery);
        });
    if (guardFilter.length) {
      bySourceScored[src] = guardFilter
        .map((p) => ({ ...p, rankScore: Math.round(publicWorkflowScore(p, effectiveQuery || nonAuthorQuery)) }))
        .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
    }
  }

  return {
    query,
    mode: effectiveMode,
    intent,
    authorCandidates,
    papers,
    bySource: bySourceScored,
    homonymProfiles,
    sourceHealth,
    trackResults: {
      t1: bySource.pubmed.length,
      t2: 0,
      t3: bySource.semantic.length,
      t4: 0,
      t5: bySource.openalex.length,
      t6: bySource.europepmc.length,
      final: papers.length,
    },
  };
}

type SortBy = 'relevance' | 'citations' | 'year';

function normalizeSortBy(value: unknown): SortBy {
  if (value === 'citations') return 'citations';
  if (value === 'year') return 'year';
  return 'relevance';
}

function applySortBy(papers: Paper[], sortBy: SortBy): Paper[] {
  if (sortBy === 'citations') {
    return [...papers].sort((a, b) => (b.citations || 0) - (a.citations || 0));
  }
  if (sortBy === 'year') {
    return [...papers].sort((a, b) => (b.year || 0) - (a.year || 0));
  }
  return papers; // 'relevance' — already sorted by rankScore
}

export async function POST(request: NextRequest) {
  const overallStart = Date.now();

  try {
    const payload = await request.json();
    const rawQuery = typeof payload?.query === 'string' ? String(payload.query).trim() : '';
    const correctedQuery = correctBioTypos(rawQuery);
    const normalizedQuery = preprocessUserQuery(correctedQuery);
    const filters = payload?.filters || {};
    const mode = normalizeSearchMode(payload?.mode || filters?.mode);
    const sortBy = normalizeSortBy(payload?.sortBy ?? filters?.sortBy);
    if (typeof payload?.claim === 'string' && !filters.claim) filters.claim = payload.claim;
    if (typeof payload?.hypothesis === 'string' && !filters.hypothesis) filters.hypothesis = payload.hypothesis;

    // Cache lookup — skip for author mode to always return fresh profile data
    if (mode !== 'author') {
      const cacheKey = makeCacheKey({ v: 'query-parts-1', q: normalizedQuery, mode, sortBy, filters: { yearFrom: filters.yearFrom, yearTo: filters.yearTo } });
      const cached = papersCache.get(cacheKey);
      if (cached) {
        const c = cached as Record<string, unknown>;
        return NextResponse.json({ ...c, meta: { ...(c.meta as Record<string, unknown>), cached: true, totalTime: Date.now() - overallStart } });
      }
    }

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
      if (primaryIntent === 'INSTITUTION') break;
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
      bySource: {},
      homonymProfiles: [],
      sourceHealth: [],
      trackResults: { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, final: 0 },
    };

    const sortedPapers = applySortBy(selected.papers, sortBy);

    // Enrich papers with journal quartile (non-blocking, best-effort).
    // Include per-source rows too, because the All/source tabs are built from bySource.
    const sourceRows = Object.values(selected.bySource || {}).flat() as Paper[];
    const uniqueForMetrics = Array.from(new Map([...sortedPapers, ...sourceRows].map((p) => [p.id, p])).values());
    const enrichedAll = await enrichPapersWithJournalMetrics(uniqueForMetrics).catch(() => uniqueForMetrics);
    const enrichedById = new Map(enrichedAll.map((p) => [p.id, p]));
    const enrichedPapers = sortedPapers.map((p) => enrichedById.get(p.id) || p);

    // Propagate enrichment to bySource so all tabs show IF/quartile
    const enrichedBySource: Record<string, Paper[]> = {};
    for (const [src, srcPapers] of Object.entries(selected.bySource || {})) {
      enrichedBySource[src] = (srcPapers as Paper[]).map((p) => enrichedById.get(p.id) || p);
    }

    const responseBody = {
      papers: enrichedPapers,
      bySource: enrichedBySource,
      suggestedTopics: buildPublicSuggestedTopics(selected.papers, normalizePublicBioQuery(normalizedQuery)),
      meta: {
        totalTime,
        mode: selected.mode,
        intent: selected.intent,
        normalizedQuery,
        selectedQuery: selected.query,
        sortBy,
        attempts,
        authorCandidates: selected.authorCandidates,
        homonymProfiles: selected.homonymProfiles || [],
        sourceHealth: selected.sourceHealth || [],
        trackResults: selected.trackResults,
        cached: false,
      }
    };

    // Store in cache (skip author mode — profile results are user-specific)
    if (mode !== 'author' && sortedPapers.length > 0) {
      const cacheKey = makeCacheKey({ v: 'query-parts-1', q: normalizedQuery, mode, sortBy, filters: { yearFrom: filters.yearFrom, yearTo: filters.yearTo } });
      papersCache.set(cacheKey, responseBody);
    }

    return NextResponse.json(responseBody);
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
