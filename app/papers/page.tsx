'use client';
// i18n-exempt: legacy client page uses fixed bilingual/search UI copy; full i18n migration is separate.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/data-source/client';
import {
  Activity,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Database,
  Download,
  ExternalLink,
  Filter,
  Info,
  Search,
  Sparkles,
} from 'lucide-react';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  source: 'pubmed' | 'semantic' | 'openalex' | 'europepmc' | 'biorxiv';
  url: string;
  pdfUrl?: string;
  citations?: number;
  meshTerms?: string[];
  techniques?: string[];
  influenceScore?: number;
  rankScore?: number;
  matchType?: 'author-exact' | 'author-weak' | 'topic';
  doi?: string;
  evidenceLabel?: string;
  evidenceScore?: number;
  supportScore?: number;
  contradictionScore?: number;
  bestSupportSentence?: string;
  bestContradictSentence?: string;
  journal?: string;
  impactFactor?: number;
  journalQuartile?: string;
  journalHIndex?: number;
}

interface TrackStatus {
  t1: 'idle' | 'loading' | 'done' | 'error';
  t2: 'idle' | 'loading' | 'done' | 'error';
  t3: 'idle' | 'loading' | 'done' | 'error';
  t4: 'idle' | 'loading' | 'done' | 'error';
}

interface SearchMeta {
  totalTime?: number;
  mode?: 'broad' | 'precision' | 'author';
  intent?: 'AUTHOR_STRONG' | 'AUTHOR_WEAK' | 'TOPIC';
  authorCandidates?: string[];
  trackResults?: {
    t1?: number;
    t2?: number;
    t3?: number;
    t4?: number;
    t5?: number;
    final?: number;
  };
  homonymProfiles?: HomonymProfile[];
  suggestedTopics?: Array<{ type: string; label: string; query: string; count: number; filter?: { yearFrom?: string; yearTo?: string } }>;
}

interface HomonymProfile {
  profileId: string;
  matchedAuthor: string;
  topicBucket: string;
  count: number;
  avgRankScore: number;
  avgEvidenceScore: number;
  avgAuthorConfidence?: number;
  yearMin: number;
  yearMax: number;
  sources: string[];
  topAffiliations?: string[];
  topCountries?: string[];
  mergedFrom?: string[];
  sampleTitles?: string[];
  recommendationScore: number;
}

type SortMode = 'score' | 'recent' | 'citations' | 'source';
type SearchMode = 'broad' | 'precision' | 'author';

type RelatedItem = { id: string; title: string; year?: number; source: string; url: string };

type MergeSuggestion = { left: string; right: string; merged: string };

const T_MERGE = 350;

const SEARCH_GUIDE = {
  quick: [],
  keyboard: ['Space/Tab: 블록(chip) 확정', 'Enter: 현재 입력 확정 후 검색', 'Backspace(빈 입력): 마지막 chip 제거'],
  tips: ['따옴표(" ")를 쓰면 저자/구문 exact 매칭이 강화됩니다.', '두 단어 이상으로 구체화할수록 결과 품질이 좋아집니다.', '추천어는 입력값/검색결과/최근 검색어를 기반으로 실시간 생성됩니다.'],
};

type SuggestionIntent = 'AUTHOR_STRONG' | 'AUTHOR_WEAK' | 'TOPIC';

function detectSuggestionIntent(q: string): SuggestionIntent {
  const query = q.trim();
  if (/"[^"]+"/.test(query)) return 'AUTHOR_STRONG';
  const tokens = query.split(/\s+/).filter(Boolean);
  if (
    tokens.length >= 2 &&
    /^[A-Z][a-z'\-]+$/.test(tokens[0] || '') &&
    /^[A-Z][a-z'\-]+$/.test(tokens[1] || '')
  ) {
    return 'AUTHOR_WEAK';
  }
  return 'TOPIC';
}

const intentBadgeClass: Record<SuggestionIntent, string> = {
  AUTHOR_STRONG: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  AUTHOR_WEAK: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  TOPIC: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
};

function tokenizeInput(input: string): string[] {
  const out: string[] = [];
  const regex = /"([^"]+)"|[^\s,;\/]+/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    const token = (m[1] || m[0] || '').trim();
    if (token) out.push(token);
  }
  return out;
}

function looksLikeNameToken(token: string): boolean {
  return /^[A-Z][a-z'\-]+$/.test(token);
}

function canSuggestMerge(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (looksLikeNameToken(left) && looksLikeNameToken(right)) return true;
  return left.length <= 12 && right.length <= 12;
}

function buildQueryFromChips(chips: string[], buffer: string): string {
  const tokens = [...chips];
  const parsed = tokenizeInput(buffer);
  tokens.push(...parsed);
  return tokens
    .map((t) => (t.includes(' ') ? `"${t}"` : t))
    .join(' ')
    .trim();
}

const SUGGESTION_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'of', 'on', 'or', 'that', 'the', 'to', 'with',
]);

function tokenizeSuggestionSource(input: string): string[] {
  return (input.match(/[A-Za-z][A-Za-z0-9-]{1,}/g) || []).map((token) => token.trim());
}

function collectSuggestionTerms(papers: Paper[], chips: string[], history: string[]): string[] {
  const freq = new Map<string, { text: string; count: number }>();
  const push = (token: string, weight = 1) => {
    const cleaned = token.trim();
    if (cleaned.length < 2) return;
    const normalized = cleaned.toLowerCase();
    if (SUGGESTION_STOP_WORDS.has(normalized)) return;
    if (/^\d+$/.test(normalized)) return;
    const existing = freq.get(normalized);
    if (existing) {
      existing.count += weight;
      return;
    }
    freq.set(normalized, { text: cleaned, count: weight });
  };

  for (const chip of chips) {
    for (const token of tokenizeInput(chip)) push(token, 3);
  }

  for (const q of history) {
    for (const token of tokenizeInput(q)) push(token, 2);
  }

  for (const paper of papers) {
    for (const token of tokenizeSuggestionSource(paper.title)) push(token, 2);
    for (const token of paper.authors || []) push(token, 1);
    for (const token of paper.meshTerms || []) push(token, 1);
    for (const token of paper.techniques || []) push(token, 1);
  }

  return Array.from(freq.values())
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
    .map((item) => item.text);
}

const trackNames: Record<keyof TrackStatus, string> = {
  t1: 'PubMed / EuropePMC',
  t2: 'Semantic Scholar',
  t3: 'OpenAlex / bioRxiv',
  t4: 'Ranking',
};

const sourceLabel: Record<Paper['source'], string> = {
  pubmed: 'PubMed',
  semantic: 'Semantic',
  openalex: 'OpenAlex',
  europepmc: 'EuropePMC',
  biorxiv: 'bioRxiv',
};

const sourceBadge: Record<Paper['source'], string> = {
  pubmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  semantic: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  openalex: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  europepmc: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  biorxiv: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
};

const scoreTooltip = 'Score는 통합 랭킹 점수입니다. 최신성(최대 30) + 주제 연관도(최대 25) + 영향도(최대 20) + 메타정보 보너스(최대 10)로 계산됩니다. 인용수는 Sort에서만 사용됩니다.';
const citationTooltip = 'Citations는 원본 소스가 제공한 누적 인용 횟수입니다.';
const yearTooltip = '발행 연도입니다. 최신 논문일수록 랭킹 점수에서 유리합니다.';
const journalMetricHint: Record<Paper['source'], { if: string; q: string; note: string }> = {
  pubmed: { if: 'N/A (journal별 상이)', q: 'Q1~Q4', note: 'PubMed는 저널 인덱스이며 개별 논문의 저널 메타데이터 추가 연동이 필요합니다.' },
  semantic: { if: 'N/A (source-dependent)', q: 'N/A', note: 'Semantic Scholar는 통합 메타데이터이며 저널 지표는 별도 소스 필요.' },
  openalex: { if: 'N/A (venue-dependent)', q: 'N/A', note: 'OpenAlex는 venue 정보 기반으로 추정 가능하나 별도 매핑이 필요합니다.' },
  europepmc: { if: 'N/A', q: 'N/A', note: 'EuropePMC는 통합 오픈 액세스 인덱스입니다.' },
  biorxiv: { if: 'N/A', q: 'N/A', note: 'bioRxiv는 프리프린트 서버로 동료심사 전 논문을 제공합니다.' },
};
const sourceTooltip: Record<Paper['source'], string> = {
  pubmed: 'PubMed: 의생명/임상 중심의 NCBI 논문 데이터베이스',
  semantic: 'Semantic Scholar: 인용/영향도 메타데이터 제공',
  openalex: 'OpenAlex: 글로벌 오픈 학술 그래프 메타데이터',
  europepmc: 'EuropePMC: PubMed + 유럽 연구 + bioRxiv/medRxiv 통합 인덱스',
  biorxiv: 'bioRxiv: 생명과학 분야 프리프린트 서버 (동료심사 전)',
};

const evidenceLabelBadge: Record<string, string> = {
  'support': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'contradict': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'uncertain': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'mention-only': 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};
const evidenceLabelText: Record<string, string> = {
  'support': '지지',
  'contradict': '반박',
  'uncertain': '불확실',
  'mention-only': '언급',
};

function trackCardClass(status: TrackStatus[keyof TrackStatus]): string {
  if (status === 'done') {
    return 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40';
  }
  if (status === 'loading') {
    return 'border-blue-200 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/40 animate-pulse';
  }
  if (status === 'error') {
    return 'border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/40';
  }
  return 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/60';
}

function trackStatusText(status: TrackStatus[keyof TrackStatus]): string {
  if (status === 'done') return 'Complete';
  if (status === 'loading') return 'Running';
  if (status === 'error') return 'Error';
  return 'Idle';
}

export default function PapersPage() {
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const lastChipCommitAtRef = useRef<number | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [bySource, setBySource] = useState<Record<string, Paper[]>>({});
  const [activeSourceTab, setActiveSourceTab] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [trackStatus, setTrackStatus] = useState<TrackStatus>({
    t1: 'idle',
    t2: 'idle',
    t3: 'idle',
    t4: 'idle',
  });
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('score');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const [saveLoadingId, setSaveLoadingId] = useState<string | null>(null);
  const [hoverPaperId, setHoverPaperId] = useState<string | null>(null);
  const [relatedByPaper, setRelatedByPaper] = useState<Record<string, RelatedItem[]>>({});
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    mode: 'broad' as SearchMode,
    sources: ['pubmed', 'semantic', 'openalex', 'europepmc', 'biorxiv'] as string[],
    yearFrom: '',
    yearTo: '',
    claim: '',
    hypothesis: '',
    authorNames: '',
    firstAuthorOnly: false,
    profileMergeThreshold: 0.5,
    profileIds: [] as string[],
  });

  const sourceCounts = useMemo(() => {
    return papers.reduce(
      (acc, paper) => {
        acc[paper.source] = (acc[paper.source] || 0) + 1;
        return acc;
      },
      { pubmed: 0, semantic: 0, openalex: 0, europepmc: 0, biorxiv: 0 } as Record<string, number>,
    );
  }, [papers]);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await apiFetch('/api/auth/me');
        if (!authRes.ok) return;
        const authData = await authRes.json();
        setAuthUserId(authData.userId || null);

        const savedRes = await apiFetch('/api/saved-items?type=paper');
        if (!savedRes.ok) return;
        const savedData = await savedRes.json();
        const ids = new Set<string>((savedData.items || []).map((x: any) => x.itemId));
        setSavedIds(ids);
      } catch {
        // no-op
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldOpen = !window.matchMedia('(max-width: 1023px)').matches;
    setIsAdvancedOpen(shouldOpen);
  }, []);

  const displayedPapers = useMemo(() => {
    let base: Paper[];
    if (activeSourceTab !== 'all' && bySource[activeSourceTab]?.length) {
      base = bySource[activeSourceTab];
    } else {
      const allMap = new Map<string, Paper>();
      for (const src of ['pubmed', 'semantic', 'openalex', 'europepmc', 'biorxiv']) {
        for (const p of (bySource[src] || [])) {
          if (!allMap.has(p.id)) allMap.set(p.id, p);
        }
      }
      const allUnion = allMap.size > 0 ? Array.from(allMap.values()) : papers;
      base = showSavedOnly ? allUnion.filter((p) => savedIds.has(p.id)) : allUnion;
    }
    const sorted = [...base];
    if (sortMode === 'recent') {
      sorted.sort((a, b) => b.year - a.year);
    } else if (sortMode === 'citations') {
      sorted.sort((a, b) => (b.citations || 0) - (a.citations || 0));
    } else if (sortMode === 'source') {
      sorted.sort((a, b) => a.source.localeCompare(b.source));
    } else {
      sorted.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
    }
    return sorted;
  }, [papers, bySource, activeSourceTab, savedIds, showSavedOnly, sortMode]);

  const topSignals = useMemo(() => {
    return [...displayedPapers]
      .sort((a, b) => {
        const aScore = a.rankScore ?? a.citations ?? 0;
        const bScore = b.rankScore ?? b.citations ?? 0;
        return bScore - aScore;
      })
      .slice(0, 5);
  }, [displayedPapers]);

  const toggleSave = async (paper: Paper) => {
    if (!authUserId) return;
    const isSaved = savedIds.has(paper.id);
    setSaveLoadingId(paper.id);
    try {
      if (isSaved) {
        await apiFetch('/api/saved-items', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'paper', itemId: paper.id }),
        });
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(paper.id);
          return next;
        });
      } else {
        await apiFetch('/api/saved-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'paper',
            itemId: paper.id,
            title: paper.title,
            url: paper.url,
            source: paper.source,
            year: paper.year,
          }),
        });
        setSavedIds((prev) => new Set(prev).add(paper.id));
      }
    } finally {
      setSaveLoadingId(null);
    }
  };

  const loadRelatedPapers = async (paper: Paper) => {
    if (relatedByPaper[paper.id]) return;
    try {
      const res = await apiFetch('/api/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'paper', title: paper.title }),
      });
      const data = await res.json();
      setRelatedByPaper((prev) => ({ ...prev, [paper.id]: data.items || [] }));
    } catch {
      setRelatedByPaper((prev) => ({ ...prev, [paper.id]: [] }));
    }
  };

  const effectiveInputQuery = useMemo(() => buildQueryFromChips(chips, query), [chips, query]);
  const suggestionTerms = useMemo(
    () => collectSuggestionTerms(papers, chips, queryHistory),
    [papers, chips, queryHistory],
  );
  const liveHint = useMemo(() => {
    const tokenCount = effectiveInputQuery.split(/\s+/).filter(Boolean).length;
    if (!effectiveInputQuery) return '키워드를 입력하면 실시간 추천어가 나타납니다.';
    if (tokenCount === 1) return '단일 토큰은 범위가 넓을 수 있습니다. 두 단어 이상 조합을 권장합니다.';
    if (effectiveInputQuery.includes('"')) return '따옴표 기반 phrase 검색이 적용됩니다.';
    return '현재 입력은 다중 토큰 검색으로 실행됩니다.';
  }, [effectiveInputQuery]);

  const contextualSuggestions = useMemo(() => {
    const raw = (effectiveInputQuery || query).trim();
    const tokens = raw ? raw.split(/\s+/).filter(Boolean) : [];
    const lastToken = tokens[tokens.length - 1] || '';
    const lastLower = lastToken.toLowerCase();
    const hasPartialToken = query.trim().length > 0 && !/\s$/.test(query) && !!lastToken;
    const head = tokens.slice(0, -1).join(' ');

    const values = suggestionTerms
      .filter((term) => {
        const lower = term.toLowerCase();
        if (raw.toLowerCase().includes(lower)) return false;
        if (!hasPartialToken) return true;
        return lower.startsWith(lastLower) || lower.includes(lastLower);
      })
      .slice(0, 6)
      .map((term) => {
        if (!raw) return term;
        if (!hasPartialToken) return `${raw} ${term}`;
        return [head, term].filter(Boolean).join(' ');
      });

    return values.map((value) => ({
      value,
      intent: detectSuggestionIntent(value),
    }));
  }, [effectiveInputQuery, query, suggestionTerms]);

  const ghostTail = useMemo(() => {
    const top = contextualSuggestions[0]?.value || '';
    if (!top || !effectiveInputQuery) return '';
    const lowerTop = top.toLowerCase();
    const lowerCurrent = effectiveInputQuery.toLowerCase();
    if (lowerTop.startsWith(lowerCurrent)) {
      return top.slice(effectiveInputQuery.length);
    }
    return ` → ${top}`;
  }, [contextualSuggestions, effectiveInputQuery]);

  const quickQueries = useMemo(
    () => queryHistory.slice(0, 5),
    [queryHistory],
  );

  const commitBufferToChip = (text: string) => {
    const tokens = tokenizeInput(text);
    if (!tokens.length) return;
    setChips((prev) => [...prev, ...tokens]);
    lastChipCommitAtRef.current = Date.now();
  };

  const searchPapers = async (forcedQuery?: string) => {
    const userQuery = (forcedQuery ?? effectiveInputQuery).trim();
    if (!userQuery.trim()) return;

    setLoading(true);
    setTrackStatus({ t1: 'loading', t2: 'loading', t3: 'loading', t4: 'idle' });
    setMeta(null);
    setActiveSourceTab('all');

    const parsedAuthorNames = filters.authorNames
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const requestFilters: Record<string, unknown> = {
      sources: filters.sources,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      claim: filters.claim,
      hypothesis: filters.hypothesis,
      firstAuthorOnly: filters.firstAuthorOnly,
      profileMergeThreshold: filters.profileMergeThreshold,
    };
    if (parsedAuthorNames.length) requestFilters.authorNames = parsedAuthorNames;
    if (filters.profileIds.length) requestFilters.profileIds = filters.profileIds;

    try {
      setTimeout(() => setTrackStatus((s) => ({ ...s, t1: 'done' })), 700);
      setTimeout(() => setTrackStatus((s) => ({ ...s, t2: 'done' })), 1100);
      setTimeout(() => setTrackStatus((s) => ({ ...s, t3: 'done' })), 1400);

      const response = await apiFetch('/api/papers/search-parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, mode: filters.mode, filters: requestFilters, claim: filters.claim }),
      });
      const data = await response.json();

      setPapers(data.papers || []);
      setBySource(data.bySource || {});
      setVisibleCount(25);
      setMeta(data.meta || null);
      setQueryHistory((prev) => [userQuery, ...prev.filter((item) => item !== userQuery)].slice(0, 10));
      setTrackStatus({ t1: 'done', t2: 'done', t3: 'done', t4: 'done' });
    } catch (error) {
      console.error('Search failed:', error);
      setTrackStatus({ t1: 'error', t2: 'error', t3: 'error', t4: 'error' });
    }

    setLoading(false);
  };

  const runQuickQuery = async (item: string) => {
    const normalized = item.trim();
    setChips([]);
    setQuery(normalized);
    await searchPapers(normalized);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('query');
    if (!q) return;
    setChips([]);
    setQuery(q);
    setQueryHistory((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 10));
  }, []);

  const exportBibTeX = () => {
    const bibtex = papers
      .map(
        (p, i) => `@article{paper${i},\n  title={${p.title}},\n  author={${p.authors.join(
          ' and ',
        )}},\n  year={${p.year}},\n  url={${p.url}}\n}`,
      )
      .join('\n\n');

    const blob = new Blob([bibtex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'papers.bib';
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#F7F3EA] dark:bg-slate-900 text-[#263238] dark:text-slate-200 paper-ruled dark:bg-slate-950 dark:text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        {/* Navigation */}
        <nav className="mb-5 flex items-center gap-1 rounded-2xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA]/90 dark:bg-slate-950/90 px-3 py-2 text-sm backdrop-blur">
          <Link href="/" className="rounded-lg px-3 py-1.5 text-[#263238]/60 dark:text-slate-400 transition hover:bg-[#2A9D8F]/10 dark:hover:bg-teal-900/30 hover:text-[#10243A] dark:text-slate-100">Home</Link>
          <Link href="/papers" className="rounded-lg bg-[#2A9D8F] px-3 py-1.5 font-semibold text-white">Papers</Link>
          <Link href="/datasets" className="rounded-lg px-3 py-1.5 text-[#263238]/60 dark:text-slate-400 transition hover:bg-[#2A9D8F]/10 dark:hover:bg-teal-900/30 hover:text-[#10243A] dark:text-slate-100">Datasets</Link>
        </nav>
        {/* Hero Header */}
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-[#D8DEE6] dark:border-slate-700 bg-gradient-to-br from-[#2A9D8F]/10 via-[#7B6BA8]/5 to-[#F7F3EA] dark:from-teal-900/20 dark:via-purple-900/10 dark:to-slate-950 px-6 py-8 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 60%, #2A9D8F 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, #7B6BA8 0%, transparent 50%)' }} />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-[#10243A] dark:text-slate-100 sm:text-4xl">
                <span className="text-4xl">🔬</span>
                SHawn Bio Search
              </h1>
              <p className="mt-2 text-sm text-[#263238]/70 dark:text-slate-400">
                5개 소스 · 티어드 병렬 검색 · Evidence 분류 · 가설 검증
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(['pubmed', 'europepmc', 'biorxiv', 'semantic', 'openalex'] as const).map((src) => (
                  <span key={src} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sourceBadge[src]}`}>
                    {sourceLabel[src]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {meta?.totalTime && (
                <div className="flex items-center gap-1.5 rounded-full border border-[#2A9D8F]/40 bg-[#2A9D8F]/10 px-3 py-1.5 text-xs text-[#2A9D8F]">
                  <Activity className="h-3.5 w-3.5" />
                  {meta.totalTime}ms
                </div>
              )}
              {meta?.intent && (
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${intentBadgeClass[meta.intent as keyof typeof intentBadgeClass] || 'bg-[#D8DEE6] text-[#263238] dark:text-slate-200'}`}>
                  {meta.intent}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Sticky Search Bar */}
        <div className="sticky top-0 z-30 mb-6 rounded-2xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA]/95 dark:bg-slate-950/95 px-4 py-4 shadow-md shadow-[#2A9D8F]/10 dark:shadow-black/20 backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#263238]/40 dark:text-slate-600" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPapers()}
                placeholder="논문 검색: single-cell endometrium, DHCR24 cholesterol..."
                className="w-full rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 px-10 py-3 text-sm text-[#263238] dark:text-slate-200 placeholder:text-[#263238]/40 dark:placeholder:text-slate-500 dark:text-slate-600 outline-none ring-[#2A9D8F] transition focus:border-[#2A9D8F] focus:ring-2"
              />
            </div>
            <button
              onClick={() => { void searchPapers(); }}
              disabled={loading}
              className="sketch-btn rounded-xl bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#2A9D8F]/20 dark:shadow-black/20 transition hover:bg-[#238a7e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />검색 중...</span>
              ) : '검색 실행'}
            </button>
          </div>
          {quickQueries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[11px] text-[#263238]/40 dark:text-slate-600 self-center">최근:</span>
              {quickQueries.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { void runQuickQuery(item); }}
                  className="rounded-full border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400 transition hover:border-[#2A9D8F] hover:text-[#2A9D8F]"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 pb-12 lg:grid-cols-12">

          {/* ── LEFT: Results column ── */}
          <section className="space-y-4 lg:col-span-8">

            {/* Advanced Query Builder */}
            <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#10243A] dark:text-slate-100">Advanced Query Builder</span>
                  <span className="text-[11px] text-[#263238]/50 dark:text-slate-500">chip 기반 쿼리 조합</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen((v) => !v)}
                  className="rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2.5 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400 transition hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100"
                >
                  {isAdvancedOpen ? '접기' : '열기'}
                </button>
              </div>

              {isAdvancedOpen && (
                <div className="space-y-3 border-t border-[#D8DEE6] dark:border-slate-700 px-4 pb-4 pt-3">
                  {/* Chip input */}
                  <div className="min-h-[44px] w-full rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2 ring-[#2A9D8F] transition focus-within:ring-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {chips.map((chip, idx) => (
                        <span key={`${chip}-${idx}`} className="inline-flex items-center gap-1 rounded-lg border border-[#2A9D8F]/40 bg-[#2A9D8F]/10 px-2 py-0.5 text-xs text-[#2A9D8F]">
                          {chip}
                          <button type="button" onClick={() => setChips((prev) => prev.filter((_, i) => i !== idx)) } className="text-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100" title="블록 제거">×</button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setMergeSuggestion(null); }}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        onKeyDown={(e) => {
                          if (isComposing || (e.nativeEvent as any)?.isComposing) return;
                          const now = Date.now();
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (query.trim()) { commitBufferToChip(query); setQuery(''); }
                            void searchPapers(); return;
                          }
                          if (e.key === 'Backspace' && !query && chips.length > 0) {
                            e.preventDefault(); setChips((prev) => prev.slice(0, -1)); setMergeSuggestion(null); return;
                          }
                          if (e.key === ' ' || e.key === 'Tab' || e.key === ',' || e.key === ';' || e.key === '/') {
                            if (!query.trim()) return;
                            e.preventDefault();
                            const newToken = tokenizeInput(query).join(' ').trim();
                            if (!newToken) { setQuery(''); return; }
                            setChips((prev) => {
                              const next = [...prev, newToken];
                              const prevToken = prev[prev.length - 1];
                              const last = lastChipCommitAtRef.current;
                              if (prevToken && last && now - last <= T_MERGE && canSuggestMerge(prevToken, newToken)) {
                                setMergeSuggestion({ left: prevToken, right: newToken, merged: `${prevToken} ${newToken}` });
                              } else { setMergeSuggestion(null); }
                              return next;
                            });
                            lastChipCommitAtRef.current = now; setQuery('');
                          }
                        }}
                        placeholder={chips.length ? '다음 블록 입력...' : '질환, 기술, 저자, 키워드 입력'}
                        className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-[#263238] dark:text-slate-200 outline-none placeholder:text-[#263238]/40 dark:placeholder:text-slate-500 dark:text-slate-600 sm:min-w-[180px]"
                      />
                    </div>
                  </div>

                  {/* Ghost tail */}
                  {effectiveInputQuery && ghostTail && (
                    <p className="text-xs text-[#263238]/50 dark:text-slate-500">
                      <span className="text-[#263238]/70 dark:text-slate-400">{effectiveInputQuery}</span>
                      <span className="text-[#263238]/30 dark:text-slate-700">{ghostTail}</span>
                    </p>
                  )}

                  {/* Chip actions */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#263238]/50 dark:text-slate-500">
                    <button type="button" onClick={() => { if (!query.trim()) return; commitBufferToChip(query); setQuery(''); }} className="rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100 transition">Add chip</button>
                    <button type="button" onClick={() => { setChips([]); setQuery(''); setMergeSuggestion(null); }} className="rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100 transition">Clear</button>
                    <button type="button" onClick={() => setIsGuideOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100 transition"><Info className="h-3 w-3" />{isGuideOpen ? 'Guide 닫기' : 'Guide'}</button>
                    <span className="text-[#263238]/30 dark:text-slate-700">IME 조합 중 자동 분할 보류</span>
                  </div>

                  {/* Merge suggestion */}
                  {mergeSuggestion && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-[#263238] dark:text-slate-200">
                      <span className="text-[#263238]/70 dark:text-slate-400">병합 제안: [{mergeSuggestion.left}] + [{mergeSuggestion.right}]</span>
                      <button type="button" onClick={() => { setChips((prev) => { if (prev.length < 2) return prev; return [...prev.slice(0, -2), mergeSuggestion.merged]; }); setMergeSuggestion(null); }} className="rounded-md border border-emerald-500 px-2 py-0.5 text-emerald-700 hover:bg-emerald-100 transition">Merge</button>
                      <button type="button" onClick={() => setMergeSuggestion(null)} className="rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] transition">Keep split</button>
                    </div>
                  )}

                  {/* Guide */}
                  {isGuideOpen && (
                    <div className="rounded-xl border border-[#2A9D8F]/20 bg-[#2A9D8F]/5 dark:bg-teal-900/10 p-3 text-xs text-[#263238] dark:text-slate-200">
                      <p className="mb-2 font-semibold text-[#2A9D8F]">검색 가이드</p>
                      <p className="mb-2 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400">힌트: {liveHint}</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div><p className="mb-1 font-medium text-[#10243A] dark:text-slate-100">빠른 예시</p><ul className="space-y-1 text-[11px] text-[#263238]/50 dark:text-slate-500">{SEARCH_GUIDE.quick.length === 0 ? <li>• 최근 검색어가 자동으로 표시됩니다.</li> : SEARCH_GUIDE.quick.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                        <div><p className="mb-1 font-medium text-[#10243A] dark:text-slate-100">키보드 조작</p><ul className="space-y-1 text-[11px] text-[#263238]/50 dark:text-slate-500">{SEARCH_GUIDE.keyboard.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                        <div><p className="mb-1 font-medium text-[#10243A] dark:text-slate-100">정확도 팁</p><ul className="space-y-1 text-[11px] text-[#263238]/50 dark:text-slate-500">{SEARCH_GUIDE.tips.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                      </div>
                    </div>
                  )}

                  {/* Contextual suggestions */}
                  {contextualSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] text-[#263238]/40 dark:text-slate-600">추천 확장:</span>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {contextualSuggestions.map((s) => (
                          <button key={s.value} type="button" onClick={() => { setChips([]); setQuery(s.value); }} className="rounded-xl border border-[#7B6BA8]/40 bg-[#7B6BA8]/5 dark:bg-purple-900/10 px-3 py-2 text-left text-[11px] text-[#7B6BA8] transition hover:border-[#7B6BA8] hover:bg-[#7B6BA8]/10 dark:bg-purple-900/20">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${intentBadgeClass[s.intent]}`}>{s.intent}</span>
                              <span className="text-[10px] text-[#263238]/40 dark:text-slate-600">클릭해 반영</span>
                            </div>
                            <p className="line-clamp-2 text-[#263238] dark:text-slate-200">{s.value}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Track status pills */}
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    {(Object.keys(trackStatus) as Array<keyof TrackStatus>).map((track) => (
                      <div key={track} title={`${trackNames[track]}`} className={`rounded-xl border p-2.5 ${trackCardClass(trackStatus[track])}`}>
                        <p className="text-[11px] font-medium text-[#263238]/50 dark:text-slate-500">{trackNames[track]}</p>
                        <p className="mt-0.5 text-xs font-bold text-[#10243A] dark:text-slate-100">{trackStatusText(trackStatus[track])}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results header: sort bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
                {(['score', 'recent', 'citations'] as const).map((mode) => (
                  <button key={mode} onClick={() => setSortMode(mode)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${sortMode === mode ? 'bg-[#2A9D8F] text-white shadow' : 'text-[#263238]/60 dark:text-slate-400 hover:text-[#10243A] dark:text-slate-100'}`}>
                    {mode === 'score' ? 'Score' : mode === 'recent' ? 'Recent' : 'Citations'}
                  </button>
                ))}
                <button onClick={() => setSortMode('source')} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${sortMode === 'source' ? 'bg-[#2A9D8F] text-white shadow' : 'text-[#263238]/60 dark:text-slate-400 hover:text-[#10243A] dark:text-slate-100'}`}>Source</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#263238]/50 dark:text-slate-500">{displayedPapers.length} papers</span>
                <button onClick={() => setShowSavedOnly((v) => !v)} className={`rounded-lg border px-3 py-1.5 text-xs transition ${showSavedOnly ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]' : 'border-[#D8DEE6] dark:border-slate-700 text-[#263238]/60 dark:text-slate-400 hover:border-[#2A9D8F] hover:text-[#2A9D8F]'}`}>{showSavedOnly ? 'Saved only' : 'All'}</button>
                {papers.length > 0 && (
                  <button onClick={exportBibTeX} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-3 py-1.5 text-xs text-[#263238]/60 dark:text-slate-400 transition hover:border-[#2A9D8F] hover:text-[#2A9D8F]">
                    <Download className="h-3.5 w-3.5" /> BibTeX
                  </button>
                )}
              </div>
            </div>

            {/* Source tabs — per-source view */}
            {(papers.length > 0 || Object.keys(bySource).length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const ids = new Set<string>();
                  for (const src of ['pubmed', 'semantic', 'openalex', 'europepmc', 'biorxiv']) {
                    for (const p of (bySource[src] || [])) ids.add(p.id);
                  }
                  const allCount = ids.size || papers.length;
                  return (
                    <button
                      onClick={() => setActiveSourceTab('all')}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeSourceTab === 'all' ? 'bg-[#10243A] text-white shadow' : 'border border-[#D8DEE6] dark:border-slate-700 text-[#263238]/60 dark:text-slate-400 hover:border-[#2A9D8F] hover:text-[#2A9D8F]'}`}
                    >
                      All ({allCount})
                    </button>
                  );
                })()}
                {(['pubmed', 'semantic', 'openalex', 'europepmc', 'biorxiv'] as const).map((src) => {
                  const count = (bySource[src] || []).length;
                  if (!count) return null;
                  const isActive = activeSourceTab === src;
                  return (
                    <button
                      key={src}
                      onClick={() => setActiveSourceTab(src)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${isActive ? `${sourceBadge[src]} shadow` : 'border border-[#D8DEE6] dark:border-slate-700 text-[#263238]/60 dark:text-slate-400 hover:border-[#2A9D8F] hover:text-[#2A9D8F]'}`}
                    >
                      {sourceLabel[src]} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Paper list */}
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                    <div className="mb-3 flex gap-2"><div className="h-5 w-16 rounded-full bg-[#D8DEE6]" /><div className="h-5 w-10 rounded-full bg-[#D8DEE6]" /><div className="h-5 w-20 rounded-full bg-[#D8DEE6]" /></div>
                    <div className="h-5 w-3/4 rounded bg-[#D8DEE6]" />
                    <div className="mt-2 h-3 w-1/3 rounded bg-[#D8DEE6]" />
                    <div className="mt-3 space-y-1.5"><div className="h-3 rounded bg-[#D8DEE6]" /><div className="h-3 w-5/6 rounded bg-[#D8DEE6]" /><div className="h-3 w-4/6 rounded bg-[#D8DEE6]" /></div>
                  </div>
                ))}
              </div>
            ) : displayedPapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8DEE6] dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 py-20 text-center">
                <Search className="mb-4 h-12 w-12 text-[#D8DEE6]" />
                <p className="text-base font-semibold text-[#263238]/60 dark:text-slate-400">
                  {effectiveInputQuery ? '검색 결과가 없습니다' : '검색어를 입력해 주세요'}
                </p>
                <p className="mt-1 text-sm text-[#263238]/40 dark:text-slate-600">
                  {effectiveInputQuery ? '필터를 조정하거나 다른 키워드로 시도해보세요.' : '상단 검색창에 키워드를 입력하면 7개 소스에서 동시에 검색합니다.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedPapers.slice(0, visibleCount).map((paper) => {
                  const evAccent =
                    paper.evidenceLabel === 'support' ? 'bg-emerald-500' :
                    paper.evidenceLabel === 'contradict' ? 'bg-rose-500' :
                    paper.evidenceLabel === 'uncertain' ? 'bg-amber-500' : 'bg-slate-700';
                  return (
                    <article key={paper.id} className="sketch-card overflow-hidden border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200 hover:border-[#2A9D8F]/40">
                      {/* Top accent bar */}
                      <div className={`h-0.5 w-full ${evAccent}`} />
                      <div className="p-5">
                        {/* Badges row */}
                        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${sourceBadge[paper.source]}`} title={sourceTooltip[paper.source]}>{sourceLabel[paper.source]}</span>
                          {paper.matchType && <span className="rounded-full bg-[#7B6BA8]/15 dark:bg-purple-900/20 px-2.5 py-0.5 text-[#7B6BA8]">{paper.matchType}</span>}
                          <span className="rounded-full bg-[#D8DEE6]/60 dark:bg-slate-700/40 px-2.5 py-0.5 text-[#263238]/70 dark:text-slate-400" title={yearTooltip}>{paper.year}</span>
                          {paper.rankScore !== undefined && (
                            <span className="group relative inline-block">
                              <span className="cursor-help rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-amber-700 dark:text-amber-400">Score {paper.rankScore}</span>
                              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-64 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[11px] shadow-lg group-hover:block">
                                <p className="font-semibold text-[#10243A] dark:text-slate-100 mb-1">통합 랭킹 점수 (0~100)</p>
                                <ul className="space-y-0.5 text-[#263238]/70 dark:text-slate-400">
                                  <li>최신성: 최대 30점 (최근 논문 우대)</li>
                                  <li>주제 연관도: 최대 25점</li>
                                  <li>영향도: 최대 20점</li>
                                  <li>메타정보 보너스: 최대 10점</li>
                                </ul>
                                <p className="mt-1.5 text-[#263238]/40 dark:text-slate-600 text-[10px]">인용수는 Citations 탭 정렬에 사용</p>
                              </div>
                            </span>
                          )}
                          {paper.citations !== undefined && (
                            <span className="group relative inline-block">
                              <span className="cursor-help rounded-full bg-sky-100 dark:bg-sky-900/30 px-2.5 py-0.5 text-sky-700 dark:text-sky-400">⬆ {paper.citations}</span>
                              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-40 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] shadow-lg group-hover:block">
                                <p className="font-semibold text-[#10243A] dark:text-slate-100">피인용 횟수</p>
                                <p className="text-[#263238]/60 dark:text-slate-400">이 논문을 인용한 다른 논문 수</p>
                              </div>
                            </span>
                          )}
                          {paper.evidenceLabel && (
                            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${evidenceLabelBadge[paper.evidenceLabel] || 'bg-[#D8DEE6]/50 text-[#263238]/60 dark:text-slate-400'}`} title={paper.evidenceScore !== undefined ? `Evidence score: ${paper.evidenceScore.toFixed(3)}` : ''}>{evidenceLabelText[paper.evidenceLabel] || paper.evidenceLabel}</span>
                          )}
                          {paper.evidenceScore !== undefined && paper.evidenceScore > 0 && (
                            <span className="text-[11px] text-[#263238]/40 dark:text-slate-600">ev {paper.evidenceScore.toFixed(2)}</span>
                          )}
                          {paper.journal && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F3EA] dark:bg-slate-900 border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 text-[11px] text-[#10243A] dark:text-slate-100/70" title={`${paper.journal}${paper.journalHIndex ? ` · h-index ${paper.journalHIndex}` : ''}`}>
                              <span>📖</span>
                              <span className="max-w-[180px] truncate">{paper.journal}</span>
                              {paper.impactFactor ? (
                                <span className="ml-1 font-semibold text-[#2A9D8F]">IF {paper.impactFactor.toFixed(1)}</span>
                              ) : null}
                              {paper.journalQuartile ? (
                                <span className={`ml-0.5 font-bold text-[10px] px-1 py-0.5 rounded ${
                                  paper.journalQuartile === 'Q1' ? 'bg-emerald-100 text-emerald-700' :
                                  paper.journalQuartile === 'Q2' ? 'bg-blue-100 text-blue-700' :
                                  paper.journalQuartile === 'Q3' ? 'bg-amber-100 text-amber-700' :
                                  'bg-[#D8DEE6] text-[#263238]/60 dark:text-slate-400'
                                }`}>{paper.journalQuartile}</span>
                              ) : null}
                            </span>
                          )}
                          {/* Related hover button — right-aligned via ml-auto */}
                          <div className="relative ml-auto">
                            <button onMouseEnter={() => { setHoverPaperId(paper.id); void loadRelatedPapers(paper); }} onMouseLeave={() => setHoverPaperId((id) => (id === paper.id ? null : id))} className="inline-flex items-center gap-1 rounded-full border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 text-[11px] text-[#263238]/40 dark:text-slate-600 transition hover:border-[#7B6BA8] hover:text-[#7B6BA8]" title="연관 논문 미리보기"><Sparkles className="h-3 w-3" /> Related</button>
                            {hoverPaperId === paper.id && (
                              <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs shadow-xl sm:w-80">
                                <p className="mb-2 font-semibold text-[#10243A] dark:text-slate-100">연관 논문</p>
                                {(relatedByPaper[paper.id] || []).length === 0 ? <p className="text-[#263238]/40 dark:text-slate-600">불러오는 중이거나 결과가 없습니다.</p> : (
                                  <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
                                    {(relatedByPaper[paper.id] || []).map((r) => (
                                      <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[#2A9D8F] hover:underline">{r.title}</a><p className="text-[11px] text-[#263238]/40 dark:text-slate-600">{r.source}{r.year ? ` · ${r.year}` : ''}</p></li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#10243A] dark:text-slate-100">{paper.title}</h3>
                        {/* Authors */}
                        <p className="mt-1 truncate text-xs text-[#263238]/60 dark:text-slate-400">{paper.authors.join(', ')}</p>
                        {/* Abstract */}
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#263238]/70 dark:text-slate-400">{paper.abstract}</p>

                        {/* Support sentence */}
                        {(paper.evidenceLabel === 'support' || paper.evidenceLabel === 'contradict') && paper.bestSupportSentence && (
                          <blockquote className={`mt-3 border-l-2 pl-3 text-xs italic ${paper.evidenceLabel === 'support' ? 'border-emerald-500 text-emerald-700' : 'border-rose-500 text-rose-700'}`}>
                            &ldquo;{paper.bestSupportSentence.slice(0, 160)}{paper.bestSupportSentence.length > 160 ? '…' : ''}&rdquo;
                          </blockquote>
                        )}

                        {/* MeSH / technique tags */}
                        {(paper.meshTerms?.length || paper.techniques?.length) ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {paper.meshTerms?.slice(0, 3).map((term) => <span key={term} className="rounded bg-[#D8DEE6]/40 dark:bg-slate-700/30 px-1.5 py-0.5 text-[10px] text-[#263238]/70 dark:text-slate-400">{term}</span>)}
                            {paper.techniques?.slice(0, 3).map((tech) => <span key={tech} className="rounded bg-[#7B6BA8]/10 dark:bg-purple-900/20 px-1.5 py-0.5 text-[10px] text-[#7B6BA8]">{tech}</span>)}
                          </div>
                        ) : null}

                        {/* Footer actions */}
                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#D8DEE6] dark:border-slate-700 pt-3 text-xs">
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" title="원문/초록 페이지" className="inline-flex items-center gap-1 text-[#2A9D8F] transition hover:text-[#238a7e]">Open <ExternalLink className="h-3.5 w-3.5" /></a>
                          {paper.pdfUrl && <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" title="PDF 원문" className="inline-flex items-center gap-1 text-emerald-600 transition hover:text-emerald-700">PDF <Download className="h-3.5 w-3.5" /></a>}
                          <Link href={`/datasets?query=${encodeURIComponent(paper.title)}`} className="inline-flex items-center gap-1 rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2 py-1 text-[#263238]/60 dark:text-slate-400 transition hover:border-[#7B6BA8] hover:text-[#7B6BA8]" title="연관 데이터셋 검색"><Database className="h-3 w-3" /> Datasets</Link>
                          {authUserId ? (
                            <button onClick={() => toggleSave(paper)} disabled={saveLoadingId === paper.id} className="inline-flex items-center gap-1 rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2 py-1 text-[#263238]/60 dark:text-slate-400 transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-50" title="보관함에 저장/해제">
                              {savedIds.has(paper.id) ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" /> : <Bookmark className="h-3.5 w-3.5" />}
                              {savedIds.has(paper.id) ? 'Saved' : 'Save'}
                            </button>
                          ) : (
                            <span className="text-[#263238]/30 dark:text-slate-700" title="저장은 로그인 후 사용 가능">Login to save</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {displayedPapers.length > visibleCount && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setVisibleCount((v) => v + 25)}
                      className="sketch-btn rounded-xl border border-[#2A9D8F] bg-white dark:bg-slate-900 px-8 py-2.5 text-sm font-semibold text-[#2A9D8F] transition hover:bg-[#2A9D8F]/10 dark:hover:bg-teal-900/30"
                    >
                      더 보기 ({displayedPapers.length - visibleCount}개 남음)
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── RIGHT: Sidebar ── */}
          <aside className="space-y-4 lg:col-span-4">

            {/* Filters */}
            <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#10243A] dark:text-slate-100">
                <Filter className="h-4 w-4 text-[#263238]/40 dark:text-slate-600" /> Filters
              </h3>
              <div className="space-y-3">
                {/* Mode */}
                <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                  <span className="mb-1.5 block text-[11px] text-[#263238]/50 dark:text-slate-500">Search Mode</span>
                  {filters.mode !== 'precision' ? (
                    <p className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">Citation-critical 검색은 Precision 모드 권장</p>
                  ) : (
                    <p className="mb-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">Precision: claim/evidence 정합성 우선</p>
                  )}
                  <select value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value as SearchMode, profileIds: [] })} className="w-full bg-transparent text-xs text-[#263238] dark:text-slate-200 outline-none">
                    <option value="broad">Broad</option>
                    <option value="precision">Precision · citation-critical</option>
                    <option value="author">Author</option>
                  </select>
                </div>

                {/* Author fields */}
                {filters.mode === 'author' && (
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-1 block text-[11px] text-[#263238]/50 dark:text-slate-500">Author Aliases</span>
                    <input type="text" value={filters.authorNames} onChange={(e) => setFilters({ ...filters, authorNames: e.target.value })} placeholder="Author Name, Name Initials" className="w-full bg-transparent text-xs text-[#263238] dark:text-slate-200 outline-none placeholder:text-[#263238]/40 dark:placeholder:text-slate-500 dark:text-slate-600" />
                  </div>
                )}
                {filters.mode === 'author' && (
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-1.5 block text-[11px] text-[#263238]/50 dark:text-slate-500">Profile Merge Strictness: {filters.profileMergeThreshold.toFixed(2)}</span>
                    <input type="range" min={0.3} max={0.9} step={0.05} value={filters.profileMergeThreshold} onChange={(e) => setFilters({ ...filters, profileMergeThreshold: Number(e.target.value), profileIds: [] })} className="w-full accent-[#2A9D8F]" />
                    <div className="mt-1 flex justify-between text-[10px] text-[#263238]/40 dark:text-slate-600"><span>More merge</span><span>More split</span></div>
                  </div>
                )}

                {/* Year */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-1 block text-[11px] text-[#263238]/50 dark:text-slate-500">Year From</span>
                    <input type="number" value={filters.yearFrom} onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })} className="w-full bg-transparent text-xs text-[#263238] dark:text-slate-200 outline-none" />
                  </div>
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-1 block text-[11px] text-[#263238]/50 dark:text-slate-500">Year To</span>
                    <input type="number" value={filters.yearTo} onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })} className="w-full bg-transparent text-xs text-[#263238] dark:text-slate-200 outline-none" />
                  </div>
                </div>

                {filters.mode === 'author' && (
                  <label className="flex items-center gap-2 rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5 text-xs text-[#263238]/60 dark:text-slate-400">
                    <input type="checkbox" checked={filters.firstAuthorOnly} onChange={(e) => setFilters({ ...filters, firstAuthorOnly: e.target.checked })} className="accent-[#2A9D8F]" />
                    First author only
                  </label>
                )}

                {/* Source toggles */}
                <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                  <span className="mb-2 block text-[11px] text-[#263238]/50 dark:text-slate-500">Sources</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['pubmed', 'europepmc', 'biorxiv', 'semantic', 'openalex'] as const).map((source) => {
                      const active = filters.sources.includes(source);
                      return (
                        <button key={source} title={sourceTooltip[source]} onClick={() => { const next = active ? filters.sources.filter((s) => s !== source) : [...filters.sources, source]; setFilters({ ...filters, sources: next }); }} className={`rounded-full border px-2 py-0.5 text-[11px] transition ${active ? 'border-[#2A9D8F] bg-[#2A9D8F] text-white' : 'border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#263238]/60 dark:text-slate-400 hover:border-[#2A9D8F] hover:text-[#2A9D8F]'}`}>
                          {sourceLabel[source]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Author profiles */}
                {filters.mode === 'author' && (meta?.homonymProfiles?.length || 0) > 0 && (
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-2 block text-[11px] text-[#263238]/50 dark:text-slate-500">Recommended Author Profiles</span>
                    <div className="space-y-1.5">
                      {(meta?.homonymProfiles || []).slice(0, 5).map((profile) => {
                        const active = filters.profileIds.includes(profile.profileId);
                        return (
                          <button key={profile.profileId} onClick={() => { const next = active ? filters.profileIds.filter((x) => x !== profile.profileId) : [profile.profileId]; setFilters((prev) => ({ ...prev, profileIds: next })); }} className={`w-full rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${active ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]' : 'border-[#D8DEE6] dark:border-slate-700 text-[#263238]/60 dark:text-slate-400 hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100'}`}>
                            <div className="font-semibold">{profile.matchedAuthor} · {profile.topicBucket}</div>
                            <div className="mt-0.5 text-[10px] opacity-70">score {profile.recommendationScore} · {profile.count} papers · {profile.yearMin}–{profile.yearMax}</div>
                            {(profile.topAffiliations || []).length > 0 && <div className="mt-0.5 line-clamp-1 text-[10px] opacity-60">{profile.topAffiliations?.slice(0, 2).join(' | ')}</div>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => { const top = (meta?.homonymProfiles || [])[0]; if (!top) return; setFilters((prev) => ({ ...prev, profileIds: [top.profileId] })); }} className="rounded-lg border border-emerald-400 px-2.5 py-1 text-[11px] text-emerald-700 transition hover:bg-emerald-50">Best profile</button>
                      <button type="button" onClick={() => void searchPapers()} className="rounded-lg border border-[#2A9D8F]/50 px-2.5 py-1 text-[11px] text-[#2A9D8F] transition hover:bg-[#2A9D8F]/5 dark:hover:bg-teal-900/20 dark:bg-teal-900/10">Apply filter</button>
                      {filters.profileIds.length > 0 && <button type="button" onClick={() => setFilters((prev) => ({ ...prev, profileIds: [] }))} className="rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2.5 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400">Clear</button>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#10243A] dark:text-slate-100">
                <Database className="h-4 w-4 text-[#263238]/40 dark:text-slate-600" /> Stats
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#F7F3EA] dark:bg-slate-900 px-3 py-3">
                  <p className="text-[11px] text-[#263238]/40 dark:text-slate-600">Total</p>
                  <p className="mt-0.5 text-2xl font-bold text-[#10243A] dark:text-slate-100">{papers.length}</p>
                </div>
                <div className="rounded-xl bg-[#F7F3EA] dark:bg-slate-900 px-3 py-3">
                  <p className="text-[11px] text-[#263238]/40 dark:text-slate-600">Latency</p>
                  <p className="mt-0.5 text-2xl font-bold text-[#10243A] dark:text-slate-100">{meta?.totalTime ? `${meta.totalTime}` : '—'}<span className="text-sm font-normal text-[#263238]/50 dark:text-slate-500">{meta?.totalTime ? 'ms' : ''}</span></p>
                </div>
                <div className="rounded-xl bg-[#F7F3EA] dark:bg-slate-900 px-3 py-3">
                  <p className="text-[11px] text-[#263238]/40 dark:text-slate-600">PubMed</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-600">{sourceCounts.pubmed}</p>
                </div>
                <div className="rounded-xl bg-[#F7F3EA] dark:bg-slate-900 px-3 py-3">
                  <p className="text-[11px] text-[#263238]/40 dark:text-slate-600">arXiv</p>
                  <p className="mt-0.5 text-xl font-bold text-rose-500">{sourceCounts.arxiv}</p>
                </div>
              </div>
              <div className="mt-2 rounded-xl bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5 text-[11px] text-[#263238]/50 dark:text-slate-500">
                <span className="text-indigo-600">{sourceCounts.semantic}</span> Semantic · <span className="text-cyan-600">{sourceCounts.openalex}</span> OpenAlex
                <br /><span className="text-teal-600">{sourceCounts.europepmc}</span> EuropePMC · <span className="text-purple-600">{sourceCounts.biorxiv}</span> bioRxiv
                <br /><span className="text-[#263238]/70 dark:text-slate-400 font-medium">{meta?.trackResults?.final ?? papers.length}</span> integrated
              </div>
            </div>

            {/* Suggested Topics */}
            {(meta?.suggestedTopics || []).length > 0 && (
              <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#10243A] dark:text-slate-100">
                  Suggested Topics
                  <span className="ml-1.5 text-[11px] font-normal text-[#263238]/40 dark:text-slate-600">— 클릭하면 해당 주제로 검색</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(meta?.suggestedTopics || []).slice(0, 8).map((topic) => (
                    <div key={topic.label} className="group relative">
                      <button
                        type="button"
                        onClick={() => { setChips([]); setQuery(topic.query); if (topic.filter?.yearFrom) setFilters((f) => ({ ...f, yearFrom: topic.filter!.yearFrom! })); if (topic.filter?.yearTo) setFilters((f) => ({ ...f, yearTo: topic.filter!.yearTo! })); }}
                        className="rounded-full border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-800 px-2.5 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400 transition hover:border-[#2A9D8F] hover:text-[#2A9D8F]"
                      >
                        {topic.label} <span className="font-semibold text-[#2A9D8F]">{topic.count}</span>
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-max max-w-[200px] rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] shadow-md group-hover:block">
                        <p className="font-semibold text-[#10243A] dark:text-slate-100">{topic.label}</p>
                        <p className="text-[#263238]/60 dark:text-slate-400">유형: {topic.type}</p>
                        <p className="text-[#2A9D8F]">검색 결과 {topic.count}건</p>
                        {topic.filter?.yearFrom && <p className="text-[#263238]/50 dark:text-slate-500">{topic.filter.yearFrom}년~ 필터 적용</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Signals */}
            <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#10243A] dark:text-slate-100">Top Signals</h3>
              {topSignals.length === 0 ? (
                <p className="text-xs text-[#263238]/40 dark:text-slate-600">검색 후 상위 점수 논문이 표시됩니다.</p>
              ) : (
                <ul className="space-y-2">
                  {topSignals.map((paper, idx) => (
                    <li key={paper.id} className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 p-3">
                      <p className="line-clamp-2 text-xs font-semibold text-[#10243A] dark:text-slate-100">{idx + 1}. {paper.title}</p>
                      <p className="mt-1 text-[11px] text-[#263238]/40 dark:text-slate-600">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${sourceBadge[paper.source]}`}>{sourceLabel[paper.source]}</span>
                        <span className="ml-1.5">{paper.year}{paper.rankScore !== undefined ? ` · ${paper.rankScore}pt` : ''}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
