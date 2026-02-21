'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  source: 'pubmed' | 'arxiv' | 'semantic' | 'crossref' | 'openalex';
  url: string;
  pdfUrl?: string;
  citations?: number;
  meshTerms?: string[];
  techniques?: string[];
  influenceScore?: number;
  rankScore?: number;
  matchType?: 'author-exact' | 'author-weak' | 'topic';
}

interface TrackStatus {
  t1: 'idle' | 'loading' | 'done' | 'error';
  t2: 'idle' | 'loading' | 'done' | 'error';
  t3: 'idle' | 'loading' | 'done' | 'error';
  t4: 'idle' | 'loading' | 'done' | 'error';
}

interface SearchMeta {
  totalTime?: number;
  intent?: 'AUTHOR_STRONG' | 'AUTHOR_WEAK' | 'TOPIC';
  authorCandidates?: string[];
  trackResults?: {
    t1?: number;
    t2?: number;
    t3?: number;
    final?: number;
  };
}

type SortMode = 'score' | 'recent' | 'citations' | 'source';

type RelatedItem = { id: string; title: string; year?: number; source: string; url: string };

type MergeSuggestion = { left: string; right: string; merged: string };

const T_MERGE = 350;

const SEARCH_GUIDE = {
  quick: ['"Soohyung Lee" (정확 저자)', 'soohyung autophagy endometrium (주제+이름)', 'single-cell RNA-seq endometrium (토픽 검색)'],
  keyboard: ['Space/Tab: 블록(chip) 확정', 'Enter: 현재 입력 확정 후 검색', 'Backspace(빈 입력): 마지막 chip 제거'],
  tips: ['따옴표(" ")를 쓰면 저자/구문 exact 매칭이 강화됩니다.', '이름 1단어만 입력하면 TOPIC으로 분류되어 노이즈가 늘 수 있습니다.', 'Bio Focus ON은 생물학 키워드를 자동 확장합니다.'],
};

const SMART_SUGGESTIONS: Array<{ trigger: string; expansions: string[] }> = [
  { trigger: 'soohyung', expansions: ['"Soohyung Lee" autophagy endometrium', '"Soohyung Lee" single-cell RNA-seq endometrium'] },
  { trigger: 'autophagy', expansions: ['autophagy LC3 lysosome endometrium', 'autophagy flux organoid hormone signaling'] },
  { trigger: 'endometrium', expansions: ['endometrium fibrosis single-cell RNA-seq', 'endometrium organoid hormone signaling'] },
  { trigger: 'single-cell', expansions: ['single-cell RNA-seq endometrium atlas', 'single-cell transcriptomics uterus regeneration'] },
  { trigger: 'organoid', expansions: ['endometrial organoid hormone signaling', 'organoid autophagy transcriptomics'] },
];

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

const trackNames: Record<keyof TrackStatus, string> = {
  t1: 'PubMed Track',
  t2: 'arXiv Track',
  t3: 'Semantic Track',
  t4: 'Ranker Track',
};

const sourceLabel: Record<Paper['source'], string> = {
  pubmed: 'PubMed',
  arxiv: 'arXiv',
  semantic: 'Semantic',
  crossref: 'Crossref',
  openalex: 'OpenAlex',
};

const sourceBadge: Record<Paper['source'], string> = {
  pubmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  arxiv: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  semantic: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  crossref: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  openalex: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
};

const scoreTooltip =
  'Score는 통합 랭킹 점수입니다. 최신성(최대 30) + 인용수(최대 40) + 영향도(최대 20) + 메타정보 보너스(최대 10)로 계산됩니다.';
const citationTooltip = 'Citations는 원본 소스가 제공한 누적 인용 횟수입니다.';
const yearTooltip = '발행 연도입니다. 최신 논문일수록 랭킹 점수에서 유리합니다.';
const sourceTooltip: Record<Paper['source'], string> = {
  pubmed: 'PubMed: 의생명/임상 중심의 NCBI 논문 데이터베이스',
  arxiv: 'arXiv: 프리프린트 중심의 공개 연구 저장소',
  semantic: 'Semantic Scholar: 인용/영향도 메타데이터 제공',
  crossref: 'Crossref: DOI/서지 메타데이터 중심 학술 인덱스',
  openalex: 'OpenAlex: 글로벌 오픈 학술 그래프 메타데이터',
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
  const [showSearchGuide, setShowSearchGuide] = useState(false);
  const [pinSearchGuide, setPinSearchGuide] = useState(false);
  const lastChipCommitAtRef = useRef<number | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
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
  const [saveLoadingId, setSaveLoadingId] = useState<string | null>(null);
  const [hoverPaperId, setHoverPaperId] = useState<string | null>(null);
  const [relatedByPaper, setRelatedByPaper] = useState<Record<string, RelatedItem[]>>({});
  const [bioFocus, setBioFocus] = useState(true);
  const [filters, setFilters] = useState({
    sources: ['pubmed', 'semantic', 'crossref', 'openalex', 'arxiv'] as string[],
    yearFrom: '',
    yearTo: '',
  });

  const sourceCounts = useMemo(() => {
    return papers.reduce(
      (acc, paper) => {
        acc[paper.source] += 1;
        return acc;
      },
      { pubmed: 0, arxiv: 0, semantic: 0, crossref: 0, openalex: 0 },
    );
  }, [papers]);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) return;
        const authData = await authRes.json();
        setAuthUserId(authData.userId || null);

        const savedRes = await fetch('/api/saved-items?type=paper');
        if (!savedRes.ok) return;
        const savedData = await savedRes.json();
        const ids = new Set<string>((savedData.items || []).map((x: any) => x.itemId));
        setSavedIds(ids);
      } catch {
        // no-op
      }
    })();
  }, []);

  const displayedPapers = useMemo(() => {
    const filtered = showSavedOnly ? papers.filter((p) => savedIds.has(p.id)) : papers;
    const sorted = [...filtered];
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
  }, [papers, savedIds, showSavedOnly, sortMode]);

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
        await fetch('/api/saved-items', {
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
        await fetch('/api/saved-items', {
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
      const res = await fetch('/api/related', {
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
  const liveHint = useMemo(() => {
    const tokenCount = effectiveInputQuery.split(/\s+/).filter(Boolean).length;
    if (!effectiveInputQuery) return '예: "Soohyung Lee" autophagy';
    if (tokenCount === 1) return '단일 토큰은 TOPIC으로 해석될 수 있습니다. 저자 검색이면 따옴표/성+이름을 권장합니다.';
    if (effectiveInputQuery.includes('"')) return '따옴표 기반 phrase 검색이 적용됩니다.';
    return '현재 입력은 다중 토큰 검색으로 실행됩니다.';
  }, [effectiveInputQuery]);

  const contextualSuggestions = useMemo(() => {
    const q = effectiveInputQuery.toLowerCase();
    let values: string[];

    if (!q.trim()) {
      values = SEARCH_GUIDE.quick.map((x) => x.replace(/\s*\(.+\)$/, ''));
    } else {
      const matched = SMART_SUGGESTIONS
        .filter((item) => q.includes(item.trigger))
        .flatMap((item) => item.expansions);

      values = matched.length > 0
        ? Array.from(new Set(matched)).slice(0, 4)
        : [
            `${effectiveInputQuery} endometrium`,
            `${effectiveInputQuery} autophagy`,
            `${effectiveInputQuery} single-cell RNA-seq`,
          ].slice(0, 3);
    }

    return values.map((value) => ({
      value,
      intent: detectSuggestionIntent(value),
    }));
  }, [effectiveInputQuery]);

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

  const commitBufferToChip = (text: string) => {
    const tokens = tokenizeInput(text);
    if (!tokens.length) return;
    setChips((prev) => [...prev, ...tokens]);
    lastChipCommitAtRef.current = Date.now();
  };

  const searchPapers = async () => {
    const userQuery = effectiveInputQuery;
    if (!userQuery.trim()) return;

    setLoading(true);
    setTrackStatus({ t1: 'loading', t2: 'loading', t3: 'loading', t4: 'idle' });
    setMeta(null);

    try {
      setTimeout(() => setTrackStatus((s) => ({ ...s, t1: 'done' })), 700);
      setTimeout(() => setTrackStatus((s) => ({ ...s, t2: 'done' })), 1100);
      setTimeout(() => setTrackStatus((s) => ({ ...s, t3: 'done' })), 1400);

      const effectiveQuery = bioFocus
        ? `${userQuery} AND (endometrium OR uterus OR ovarian OR embryo OR organoid OR autophagy OR transcriptomics)`
        : userQuery;

      const response = await fetch('/api/papers/search-parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: effectiveQuery, filters }),
      });
      const data = await response.json();

      setPapers(data.papers || []);
      setMeta(data.meta || null);
      setTrackStatus({ t1: 'done', t2: 'done', t3: 'done', t4: 'done' });
    } catch (error) {
      console.error('Search failed:', error);
      setTrackStatus({ t1: 'error', t2: 'error', t3: 'error', t4: 'error' });
    }

    setLoading(false);
  };

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
                <span title="논문 통합 검색 대시보드"><BookOpen className="h-7 w-7 text-blue-600" /></span>
                Research Search Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                PubMed, arXiv, Semantic Scholar를 병렬로 검색하는 분석형 워크보드
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span title="검색 전체 소요시간(밀리초)"><Activity className="h-4 w-4" /></span>
              Last Query Time: {meta?.totalTime ? `${meta.totalTime}ms` : 'N/A'}
              {meta?.intent ? <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">Intent {meta.intent}</span> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <div className="min-h-[46px] w-full rounded-xl border border-slate-300 bg-slate-50 px-10 py-2 text-sm text-slate-900 outline-none ring-blue-500 transition focus-within:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {chips.map((chip, idx) => (
                          <span key={`${chip}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                            {chip}
                            <button
                              type="button"
                              onClick={() => setChips((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-blue-700 hover:text-blue-900 dark:text-blue-300"
                              title="블록 제거"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={query}
                          onFocus={() => setShowSearchGuide(true)}
                          onBlur={() => {
                            if (!pinSearchGuide) setShowSearchGuide(false);
                          }}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setMergeSuggestion(null);
                          }}
                          onCompositionStart={() => setIsComposing(true)}
                          onCompositionEnd={() => setIsComposing(false)}
                          onKeyDown={(e) => {
                            if (isComposing || (e.nativeEvent as any)?.isComposing) return;
                            const now = Date.now();
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (query.trim()) {
                                commitBufferToChip(query);
                                setQuery('');
                              }
                              void searchPapers();
                              return;
                            }
                            if (e.key === 'Backspace' && !query && chips.length > 0) {
                              e.preventDefault();
                              setChips((prev) => prev.slice(0, -1));
                              setMergeSuggestion(null);
                              return;
                            }
                            if (e.key === ' ' || e.key === 'Tab' || e.key === ',' || e.key === ';' || e.key === '/') {
                              if (!query.trim()) return;
                              e.preventDefault();
                              const newToken = tokenizeInput(query).join(' ').trim();
                              if (!newToken) {
                                setQuery('');
                                return;
                              }
                              setChips((prev) => {
                                const next = [...prev, newToken];
                                const prevToken = prev[prev.length - 1];
                                const last = lastChipCommitAtRef.current;
                                if (prevToken && last && now - last <= T_MERGE && canSuggestMerge(prevToken, newToken)) {
                                  setMergeSuggestion({ left: prevToken, right: newToken, merged: `${prevToken} ${newToken}` });
                                } else {
                                  setMergeSuggestion(null);
                                }
                                return next;
                              });
                              lastChipCommitAtRef.current = now;
                              setQuery('');
                            }
                          }}
                          placeholder={chips.length ? '다음 블록 입력...' : '질환, 기술, 저자, 키워드 입력'}
                          className="min-w-[180px] flex-1 bg-transparent py-1 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={searchPapers}
                    disabled={loading}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? '검색 중...' : '검색 실행'}
                  </button>
                </div>
                {effectiveInputQuery && ghostTail && (
                  <p className="-mt-1 text-xs text-slate-400 dark:text-slate-500">
                    <span className="opacity-70">{effectiveInputQuery}</span>
                    <span className="opacity-40">{ghostTail}</span>
                  </p>
                )}
                {contextualSuggestions.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">추천 확장:</span>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {contextualSuggestions.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => {
                            setChips([]);
                            setQuery(s.value);
                            setShowSearchGuide(true);
                          }}
                          className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-left text-[11px] text-indigo-900 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-200"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${intentBadgeClass[s.intent]}`}>
                              {s.intent}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">클릭해 반영</span>
                          </div>
                          <p className="line-clamp-2">{s.value}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(showSearchGuide || pinSearchGuide) && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-slate-700 shadow-sm dark:border-blue-900/60 dark:bg-slate-800/80 dark:text-slate-200">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-semibold text-blue-700 dark:text-blue-300">검색 가이드 (입력/호버 도움말)</p>
                      <button
                        type="button"
                        onClick={() => {
                          setPinSearchGuide((v) => !v);
                          setShowSearchGuide(true);
                        }}
                        className="rounded-md border border-blue-300 px-2 py-0.5 text-[11px] text-blue-700 dark:border-blue-700 dark:text-blue-300"
                      >
                        {pinSearchGuide ? '고정 해제' : '고정'}
                      </button>
                    </div>
                    <p className="mb-2 rounded-md bg-white/80 px-2 py-1 text-[11px] dark:bg-slate-900/60">실시간 힌트: {liveHint}</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <p className="mb-1 font-medium">빠른 예시</p>
                        <ul className="space-y-1">
                          {SEARCH_GUIDE.quick.map((line) => (
                            <li key={line} className="text-[11px]">• {line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1 font-medium">키보드 조작</p>
                        <ul className="space-y-1">
                          {SEARCH_GUIDE.keyboard.map((line) => (
                            <li key={line} className="text-[11px]">• {line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1 font-medium">정확도 팁</p>
                        <ul className="space-y-1">
                          {SEARCH_GUIDE.tips.map((line) => (
                            <li key={line} className="text-[11px]">• {line}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      if (!query.trim()) return;
                      commitBufferToChip(query);
                      setQuery('');
                    }}
                    className="rounded-md border border-slate-300 px-2 py-0.5"
                  >
                    Add chip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChips([]);
                      setQuery('');
                      setMergeSuggestion(null);
                    }}
                    className="rounded-md border border-slate-300 px-2 py-0.5"
                  >
                    Clear chips
                  </button>
                  <span className="text-[11px]">IME 입력 중(한글 조합)에는 자동 분할을 보류합니다.</span>
                </div>
                {mergeSuggestion && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>병합 제안: [{mergeSuggestion.left}] + [{mergeSuggestion.right}]</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChips((prev) => {
                          if (prev.length < 2) return prev;
                          const next = [...prev.slice(0, -2), mergeSuggestion.merged];
                          return next;
                        });
                        setMergeSuggestion(null);
                      }}
                      className="rounded-md border border-emerald-400 px-2 py-0.5 text-emerald-700"
                    >
                      Merge
                    </button>
                    <button
                      type="button"
                      onClick={() => setMergeSuggestion(null)}
                      className="rounded-md border border-slate-300 px-2 py-0.5"
                    >
                      Keep split
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <button
                    onClick={() => setBioFocus((v) => !v)}
                    className={`rounded-md border px-2 py-1 ${bioFocus ? 'border-emerald-500 text-emerald-600' : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
                    title="Bio Focus를 켜면 생물학/의생명 키워드를 자동 확장합니다"
                  >
                    {bioFocus ? 'Bio Focus ON' : 'Bio Focus OFF'}
                  </button>
                  <span>바이오 논문 우선 검색</span>
                  <button
                    type="button"
                    onMouseEnter={() => setShowSearchGuide(true)}
                    onMouseLeave={() => { if (!pinSearchGuide) setShowSearchGuide(false); }}
                    onClick={() => {
                      setPinSearchGuide((v) => !v);
                      setShowSearchGuide(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-0.5 text-[11px] dark:border-slate-700"
                    title="검색 사용법 보기"
                  >
                    <Info className="h-3.5 w-3.5" /> Guide
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {(Object.keys(trackStatus) as Array<keyof TrackStatus>).map((track) => (
                    <div
                      key={track}
                      title={`${trackNames[track]}: ${track === 't1' ? 'PubMed 검색' : track === 't2' ? 'arXiv 검색' : track === 't3' ? 'Semantic Scholar 검색' : '중복제거 + 점수통합 랭킹'}`}
                      className={`rounded-xl border p-3 ${trackCardClass(trackStatus[track])}`}
                    >
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {trackNames[track]}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {trackStatusText(trackStatus[track])}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 md:grid-cols-3 dark:border-slate-700">
                  <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Year From</span>
                    <input
                      type="number"
                      value={filters.yearFrom}
                      onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })}
                      className="w-full bg-transparent text-slate-900 outline-none dark:text-slate-100"
                    />
                  </label>
                  <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Year To</span>
                    <input
                      type="number"
                      value={filters.yearTo}
                      onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })}
                      className="w-full bg-transparent text-slate-900 outline-none dark:text-slate-100"
                    />
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <span title="검색할 데이터 소스 선택"><Filter className="h-3.5 w-3.5" /></span> Source Filters
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(['pubmed', 'arxiv', 'semantic', 'crossref', 'openalex'] as const).map((source) => {
                        const active = filters.sources.includes(source);
                        return (
                          <button
                            key={source}
                            onClick={() => {
                              const next = active
                                ? filters.sources.filter((s) => s !== source)
                                : [...filters.sources, source];
                              setFilters({ ...filters, sources: next });
                            }}
                            className={`rounded-full border px-2 py-1 capitalize transition ${
                              active
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                            }`}
                          >
                            {sourceLabel[source]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Search Results
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" title={scoreTooltip}>
                    Score = 최신성 + 인용수 + 영향도 + 메타정보 보너스
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    title="결과 정렬"
                  >
                    <option value="score">Sort: Score</option>
                    <option value="recent">Sort: Recent</option>
                    <option value="citations">Sort: Citations</option>
                    <option value="source">Sort: Source</option>
                  </select>
                  <button
                    onClick={() => setShowSavedOnly((v) => !v)}
                    className={`rounded-md border px-2 py-1 text-xs ${showSavedOnly ? 'border-amber-500 text-amber-600' : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
                    title="저장한 논문만 보기"
                  >
                    {showSavedOnly ? 'Saved only' : 'All results'}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {displayedPapers.length} papers
                  </span>
                  {papers.length > 0 && (
                    <button
                      onClick={exportBibTeX}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5" /> BibTeX
                    </button>
                  )}
                </div>
              </div>

              {displayedPapers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {effectiveInputQuery ? '검색 결과가 없습니다. 필터를 조정해보세요.' : '검색어를 입력하면 결과가 대시보드에 표시됩니다.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedPapers.map((paper) => (
                    <article
                      key={paper.id}
                      className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-1 font-semibold ${sourceBadge[paper.source]}`}
                          title={sourceTooltip[paper.source]}
                        >
                          {sourceLabel[paper.source]}
                        </span>
                        {paper.matchType && (
                          <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                            {paper.matchType}
                          </span>
                        )}
                        <span
                          className="rounded-full bg-slate-200 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          title={yearTooltip}
                        >
                          {paper.year}
                        </span>
                        {paper.rankScore !== undefined && (
                          <span
                            className="rounded-full bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            title={scoreTooltip}
                          >
                            Score {paper.rankScore}
                          </span>
                        )}
                        {paper.citations !== undefined && (
                          <span
                            className="rounded-full bg-sky-100 px-2 py-1 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                            title={citationTooltip}
                          >
                            Citations {paper.citations}
                          </span>
                        )}
                      </div>

                      <div className="absolute right-3 top-3">
                        <button
                          onMouseEnter={() => {
                            setHoverPaperId(paper.id);
                            void loadRelatedPapers(paper);
                          }}
                          onMouseLeave={() => setHoverPaperId((id) => (id === paper.id ? null : id))}
                          className="rounded-full border border-violet-300 px-2 py-1 text-[11px] text-violet-700 dark:border-violet-700 dark:text-violet-300"
                          title="연관 논문 미리보기"
                        >
                          <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Related</span>
                        </button>
                        {hoverPaperId === paper.id && (
                          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">연관 논문</p>
                            {(relatedByPaper[paper.id] || []).length === 0 ? (
                              <p className="text-slate-500">불러오는 중이거나 결과가 없습니다.</p>
                            ) : (
                              <ul className="space-y-2">
                                {(relatedByPaper[paper.id] || []).slice(0, 5).map((r) => (
                                  <li key={r.id}>
                                    <a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-blue-600 hover:underline dark:text-blue-300">
                                      {r.title}
                                    </a>
                                    <p className="text-[11px] text-slate-500">{r.source}{r.year ? ` · ${r.year}` : ''}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {paper.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {paper.authors.join(', ')}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-700 dark:text-slate-200">
                        {paper.abstract}
                      </p>

                      {(paper.meshTerms?.length || paper.techniques?.length) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {paper.meshTerms?.slice(0, 3).map((term) => (
                            <span
                              key={term}
                              className="rounded bg-blue-100 px-2 py-0.5 text-[11px] text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                            >
                              {term}
                            </span>
                          ))}
                          {paper.techniques?.slice(0, 3).map((tech) => (
                            <span
                              key={tech}
                              className="rounded bg-purple-100 px-2 py-0.5 text-[11px] text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="원문/초록 페이지를 새 탭에서 엽니다"
                          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-300"
                        >
                          Open <span title="외부 링크"><ExternalLink className="h-3.5 w-3.5" /></span>
                        </a>
                        {paper.pdfUrl && (
                          <a
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="PDF 원문을 새 탭에서 엽니다"
                            className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline dark:text-emerald-300"
                          >
                            PDF <span title="PDF 다운로드/열기"><Download className="h-3.5 w-3.5" /></span>
                          </a>
                        )}
                        {authUserId ? (
                          <button
                            onClick={() => toggleSave(paper)}
                            disabled={saveLoadingId === paper.id}
                            className="inline-flex items-center gap-1 rounded border border-amber-400 px-2 py-1 text-amber-600 disabled:opacity-50"
                            title="로그인 사용자 보관함에 저장/해제"
                          >
                            {savedIds.has(paper.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                            {savedIds.has(paper.id) ? 'Saved' : 'Save'}
                          </button>
                        ) : (
                          <span className="text-slate-400" title="저장 기능은 로그인 후 사용 가능합니다">Login to save</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Database className="h-4 w-4" /> Dashboard Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{papers.length}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Track Latency</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    {meta?.totalTime ? `${meta.totalTime}ms` : '-'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">PubMed</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{sourceCounts.pubmed}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">arXiv</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{sourceCounts.arxiv}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Semantic: <span className="font-semibold">{sourceCounts.semantic}</span> · Crossref: <span className="font-semibold">{sourceCounts.crossref}</span> · OpenAlex: <span className="font-semibold">{sourceCounts.openalex}</span>
                <br />
                Final integrated: <span className="font-semibold">{meta?.trackResults?.final ?? papers.length}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Top Signals</h3>
              {topSignals.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  검색 후 상위 점수 논문이 여기에 표시됩니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topSignals.map((paper, idx) => (
                    <li
                      key={paper.id}
                      className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <p className="line-clamp-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {idx + 1}. {paper.title}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {sourceLabel[paper.source]} · {paper.year}
                        {paper.rankScore !== undefined ? ` · Score ${paper.rankScore}` : ''}
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
