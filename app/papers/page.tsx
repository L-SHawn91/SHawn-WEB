'use client';
// Core search UI copy is switched by the global KOR/ENG language control.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/data-source/client';
import { useLanguage } from '@/components/providers/language-provider';
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
  source: 'pubmed' | 'arxiv' | 'semantic' | 'crossref' | 'openalex' | 'europepmc' | 'biorxiv';
  url: string;
  pdfUrl?: string;
  citations?: number;
  keywords?: string[];
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
  journalField?: string;
  journalSubfield?: string;
  journalDomain?: string;
  journalTopic?: string;
  journalRecentYears?: Array<{ year: number; works: number; citations: number }>;
  journalIfSource?: string;
  journalIfMetric?: string;
  journalIfYear?: string;
  journalIfIsOfficial?: boolean;
  journalIfMatchMode?: string;
  jcrJci?: number;
  jcrCategory?: string;
  jcrEdition?: string;
  jcrRank?: string;
  jcrPercentile?: number;
}

const PAPER_SOURCES = ['pubmed', 'arxiv', 'semantic', 'crossref', 'openalex', 'europepmc', 'biorxiv'] as const;
const HERO_SOURCE_ORDER = ['pubmed', 'europepmc', 'arxiv', 'crossref', 'semantic', 'openalex', 'biorxiv'] as const;

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
    t6?: number;
    t7?: number;
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

type RelatedItem = { id: string; title: string; year?: number; source: string; url: string };
type RelatedDatasetItem = { id: string; title: string; source: string; url: string; accessionIds?: string[]; reason?: string };

type MergeSuggestion = { left: string; right: string; merged: string };

const T_MERGE = 350;

const SEARCH_GUIDE = {
  quick: [],
  keyboard: ['Space/Tab: 블록(chip) 확정', 'Enter: 현재 입력 확정 후 검색', 'Backspace(빈 입력): 마지막 chip 제거'],
  tips: ['따옴표(" ")를 쓰면 저자/구문 exact 매칭이 강화됩니다.', '두 단어 이상으로 구체화할수록 결과 품질이 좋아집니다.', '추천어는 입력값/검색결과/최근 검색어를 기반으로 실시간 생성됩니다.'],
};

const papersCopy = {
  ko: {
    loadingTitle: "검색중입니다",
    loadingDesc: "여러 논문 소스를 동시에 확인하는 중입니다.",
    heroDesc: "7개 공개 소스 · 티어드 병렬 검색 · Evidence 분류 · 가설 검증",
    searchPlaceholder: "논문 검색: quantum error correction, climate adaptation, single-cell atlas...",
    searchButton: "검색 실행",
    searching: "검색 중...",
    recent: "최근:",
    advancedTitle: "Advanced Query Builder",
    advancedDesc: "chip 기반 쿼리 조합",
    collapse: "접기",
    open: "열기",
    removeChip: "블록 제거",
    nextBlockPlaceholder: "다음 블록 입력...",
    chipPlaceholder: "질환, 기술, 저자, 키워드 입력",
    addChip: "Add chip",
    clear: "Clear",
    guideClose: "Guide 닫기",
    guideOpen: "Guide",
    imeHold: "IME 조합 중 자동 분할 보류",
    mergeSuggestion: "병합 제안",
    keepSplit: "Keep split",
    merge: "Merge",
    guideTitle: "검색 가이드",
    hintLabel: "힌트",
    quickExamples: "빠른 예시",
    quickEmpty: "최근 검색어가 자동으로 표시됩니다.",
    keyboardTitle: "키보드 조작",
    accuracyTitle: "정확도 팁",
    expandSuggestions: "추천 확장:",
    applySuggestion: "클릭해 반영",
    noResults: "검색 결과가 없습니다",
    enterQuery: "검색어를 입력해 주세요",
    noResultsDesc: "필터를 조정하거나 다른 키워드로 시도해보세요.",
    enterQueryDesc: "상단 검색창에 키워드를 입력하면 7개 소스에서 동시에 검색합니다.",
    papersCount: "papers",
    savedOnly: "Saved only",
    all: "All",
    rankScoreTitle: "통합 랭킹 점수 (0~100)",
    rankRecency: "최신성: 최대 30점 (최근 논문 우대)",
    rankRelevance: "주제 연관도: 최대 25점",
    rankImpact: "영향도: 최대 20점",
    rankMeta: "메타정보 보너스: 최대 10점",
    rankCitationNote: "인용수는 Citations 탭 정렬에 사용",
    citationsTitle: "피인용 횟수",
    citationsDesc: "이 논문을 인용한 다른 논문 수",
    relatedTitle: "연관 논문",
    relatedLoading: "불러오는 중이거나 결과가 없습니다.",
    relatedDatasets: "연관 데이터셋",
    noDatasetResults: "데이터셋 결과가 없습니다.",
    openTitle: "원문/초록 페이지",
    pdfTitle: "PDF 원문",
    relatedDatasetsTitle: "연관 데이터셋 검색",
    loginSave: "저장은 로그인 후 사용 가능",
    loadMore: "더 보기",
    remaining: "개 남음",
    filters: "Filters",
    queryDriven: "Query-driven search",
    queryDrivenDesc: "검색 모드는 입력문에서 자동 추론합니다. 예: author: Lee S keyword: climate adaptation, quantum computing error correction, 또는 공개 연구 분야의 일반 주제어.",
    yearFrom: "Year From",
    yearTo: "Year To",
    sources: "Sources",
    recommendedProfiles: "Recommended Author Profiles",
    bestProfile: "Best profile",
    applyFilter: "Apply filter",
    stats: "Stats",
    total: "Total",
    latency: "Latency",
    integrated: "integrated",
    suggestedTopics: "Suggested Topics",
    suggestedHint: "— 클릭하면 해당 주제로 검색",
    topicType: "유형",
    topicResults: "검색 결과",
    yearFilterApplied: "년~ 필터 적용",
    topSignals: "Top Signals",
    topSignalsEmpty: "검색 후 상위 점수 논문이 표시됩니다.",
    liveHintEmpty: "키워드를 입력하면 실시간 추천어가 나타납니다.",
    liveHintOne: "단일 토큰은 범위가 넓을 수 있습니다. 두 단어 이상 조합을 권장합니다.",
    liveHintPhrase: "따옴표 기반 phrase 검색이 적용됩니다.",
    liveHintMulti: "현재 입력은 다중 토큰 검색으로 실행됩니다.",
    guideKeyboard: SEARCH_GUIDE.keyboard,
    guideTips: SEARCH_GUIDE.tips,
  },
  en: {
    loadingTitle: "Searching",
    loadingDesc: "Checking multiple public paper sources at the same time.",
    heroDesc: "7 public sources · tiered parallel search · evidence labels · hypothesis check",
    searchPlaceholder: "Paper search: quantum error correction, climate adaptation, single-cell atlas...",
    searchButton: "Search papers",
    searching: "Searching...",
    recent: "Recent:",
    advancedTitle: "Advanced Query Builder",
    advancedDesc: "Build a query with chips",
    collapse: "Collapse",
    open: "Open",
    removeChip: "Remove chip",
    nextBlockPlaceholder: "Next block...",
    chipPlaceholder: "Disease, technique, author, or keyword",
    addChip: "Add chip",
    clear: "Clear",
    guideClose: "Close guide",
    guideOpen: "Guide",
    imeHold: "Auto-splitting is paused during IME composition",
    mergeSuggestion: "Merge suggestion",
    keepSplit: "Keep split",
    merge: "Merge",
    guideTitle: "Search guide",
    hintLabel: "Hint",
    quickExamples: "Quick examples",
    quickEmpty: "Recent searches will appear automatically.",
    keyboardTitle: "Keyboard controls",
    accuracyTitle: "Accuracy tips",
    expandSuggestions: "Suggested expansions:",
    applySuggestion: "Click to apply",
    noResults: "No results found",
    enterQuery: "Enter a search term",
    noResultsDesc: "Adjust filters or try another keyword.",
    enterQueryDesc: "Enter a keyword above to search seven sources at once.",
    papersCount: "papers",
    savedOnly: "Saved only",
    all: "All",
    rankScoreTitle: "Integrated ranking score (0–100)",
    rankRecency: "Recency: up to 30 points",
    rankRelevance: "Topic relevance: up to 25 points",
    rankImpact: "Impact: up to 20 points",
    rankMeta: "Metadata bonus: up to 10 points",
    rankCitationNote: "Citations are used in the Citations sort tab",
    citationsTitle: "Citation count",
    citationsDesc: "Number of other papers citing this paper",
    relatedTitle: "Related papers",
    relatedLoading: "Loading or no related papers found.",
    relatedDatasets: "Related datasets",
    noDatasetResults: "No dataset results.",
    openTitle: "Original abstract/source page",
    pdfTitle: "PDF source",
    relatedDatasetsTitle: "Search related datasets",
    loginSave: "Log in to save",
    loadMore: "Load more",
    remaining: "remaining",
    filters: "Filters",
    queryDriven: "Query-driven search",
    queryDrivenDesc: "Search mode is inferred from the search box. Use patterns like author: Lee S keyword: climate adaptation, quantum computing error correction, or plain topic terms from any public research field.",
    yearFrom: "Year From",
    yearTo: "Year To",
    sources: "Sources",
    recommendedProfiles: "Recommended Author Profiles",
    bestProfile: "Best profile",
    applyFilter: "Apply filter",
    stats: "Stats",
    total: "Total",
    latency: "Latency",
    integrated: "integrated",
    suggestedTopics: "Suggested Topics",
    suggestedHint: "— click to search this topic",
    topicType: "Type",
    topicResults: "Search results",
    yearFilterApplied: "year filter applied",
    topSignals: "Top Signals",
    topSignalsEmpty: "Top-ranked papers will appear after a search.",
    liveHintEmpty: "Type keywords to see live suggestions.",
    liveHintOne: "A single token can be broad. Try combining two or more terms.",
    liveHintPhrase: "Phrase search is applied for quoted text.",
    liveHintMulti: "The current input will run as a multi-token search.",
    guideKeyboard: ["Space/Tab: commit a chip", "Enter: submit current input and search", "Backspace on empty input: remove last chip"],
    guideTips: ["Use quotes for stronger author or phrase matching.", "Use two or more specific terms for better result quality.", "Suggestions are generated from your input, results, and recent searches."],
  },
} as const;

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
  const parsed = tokenizeInput(buffer);
  if (chips.length === 0) {
    return buffer.trim();
  }
  const tokens = [...chips, ...parsed].filter(Boolean);
  const hasOperator = tokens.some((t) => /^(AND|OR)$/i.test(t));
  const quoted = tokens.map((t) => {
    if (/^(AND|OR)$/i.test(t)) return t.toUpperCase();
    return t.includes(' ') ? `"${t}"` : t;
  });
  return quoted.join(hasOperator ? ' ' : ' AND ').trim();
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
  arxiv: 'arXiv',
  semantic: 'Semantic',
  crossref: 'Crossref',
  openalex: 'OpenAlex',
  europepmc: 'EuropePMC',
  biorxiv: 'bioRxiv',
};

const sourceBadge: Record<Paper['source'], string> = {
  pubmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  arxiv: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  semantic: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  crossref: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  openalex: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  europepmc: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  biorxiv: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
};

const paperUiTooltip = {
  ko: {
    year: '발행 연도입니다. 최신 논문일수록 랭킹 점수에서 유리합니다.',
    source: {
      pubmed: 'PubMed: 의생명/임상 중심의 NCBI 논문 데이터베이스',
      arxiv: 'arXiv: 물리/수학/컴퓨터과학 등 전 분야 프리프린트 서버',
      semantic: 'Semantic Scholar: 인용/영향도 메타데이터 제공',
      crossref: 'Crossref: DOI/publisher metadata 중심 공개 학술 인덱스',
      openalex: 'OpenAlex: 글로벌 오픈 학술 그래프 메타데이터',
      europepmc: 'EuropePMC: PubMed + 유럽 연구 + bioRxiv/medRxiv 통합 인덱스',
      biorxiv: 'bioRxiv: 생명과학 분야 프리프린트 서버 (동료심사 전)',
    },
  },
  en: {
    year: 'Publication year. Recent papers receive a recency boost in ranking.',
    source: {
      pubmed: 'PubMed: NCBI biomedical and clinical literature database',
      arxiv: 'arXiv: preprint server spanning physics, mathematics, computer science, and other fields',
      semantic: 'Semantic Scholar: citation and influence metadata',
      crossref: 'Crossref: public scholarly index centered on DOI and publisher metadata',
      openalex: 'OpenAlex: global open scholarly graph metadata',
      europepmc: 'EuropePMC: PubMed, European research, and bioRxiv/medRxiv aggregation',
      biorxiv: 'bioRxiv: life-science preprint server before peer review',
    },
  },
} as const satisfies Record<'ko' | 'en', { year: string; source: Record<Paper['source'], string> }>;

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
  'mention-only': '키워드 일치',
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
  const { language } = useLanguage();
  const t = papersCopy[language];
  const paperTooltip = paperUiTooltip[language];
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const lastChipCommitAtRef = useRef<number | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
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
  const [relatedDatasetsByPaper, setRelatedDatasetsByPaper] = useState<Record<string, RelatedDatasetItem[]>>({});
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    sources: [...PAPER_SOURCES] as string[],
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
      Object.fromEntries(PAPER_SOURCES.map((source) => [source, 0])) as Record<string, number>,
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
      // The All tab must use the integrated/reranked result set. Raw per-source
      // rows are useful for source tabs, but unioning them here can hide the
      // cross-source scorer and surface weak source-local matches first.
      base = showSavedOnly ? papers.filter((p) => savedIds.has(p.id)) : papers;
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
        body: JSON.stringify({ kind: 'paper', title: paper.title, excludeId: paper.id, excludeTitle: paper.title, excludeUrl: paper.url }),
      });
      const data = await res.json();
      setRelatedByPaper((prev) => ({ ...prev, [paper.id]: data.items || [] }));
      setRelatedDatasetsByPaper((prev) => ({ ...prev, [paper.id]: data.datasets || [] }));
    } catch {
      setRelatedByPaper((prev) => ({ ...prev, [paper.id]: [] }));
      setRelatedDatasetsByPaper((prev) => ({ ...prev, [paper.id]: [] }));
    }
  };

  const effectiveInputQuery = useMemo(() => buildQueryFromChips(chips, query), [chips, query]);
  const suggestionTerms = useMemo(
    () => collectSuggestionTerms(papers, chips, queryHistory),
    [papers, chips, queryHistory],
  );
  const liveHint = useMemo(() => {
    const tokenCount = effectiveInputQuery.split(/\s+/).filter(Boolean).length;
    if (!effectiveInputQuery) return t.liveHintEmpty;
    if (tokenCount === 1) return t.liveHintOne;
    if (effectiveInputQuery.includes('"')) return t.liveHintPhrase;
    return t.liveHintMulti;
  }, [effectiveInputQuery, t]);

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

  const searchPapers = async (forcedQuery?: string, forcedBuilderTerms?: string[], forcedFilters = filters) => {
    const userQuery = (forcedQuery ?? effectiveInputQuery).trim();
    if (!userQuery.trim()) return;

    setLoading(true);
    setTrackStatus({ t1: 'loading', t2: 'loading', t3: 'loading', t4: 'idle' });
    setMeta(null);
    setActiveSourceTab('all');

    const parsedAuthorNames = forcedFilters.authorNames
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const activeBuilderTerms = (forcedBuilderTerms || (chips.length ? [...chips, ...tokenizeInput(query)] : []))
      .map((term) => term.trim())
      .filter((term) => term && !/^(AND|OR)$/i.test(term));
    const requestFilters: Record<string, unknown> = {
      sources: forcedFilters.sources,
      yearFrom: forcedFilters.yearFrom,
      yearTo: forcedFilters.yearTo,
      claim: forcedFilters.claim,
      hypothesis: forcedFilters.hypothesis,
      firstAuthorOnly: forcedFilters.firstAuthorOnly,
      profileMergeThreshold: forcedFilters.profileMergeThreshold,
    };
    if (parsedAuthorNames.length) requestFilters.authorNames = parsedAuthorNames;
    if (forcedFilters.profileIds.length) requestFilters.profileIds = forcedFilters.profileIds;
    if (activeBuilderTerms.length > 1) {
      requestFilters.queryBuilderTerms = activeBuilderTerms;
      requestFilters.queryBuilderOperator = 'auto';
    }

    try {
      setTimeout(() => setTrackStatus((s) => ({ ...s, t1: 'done' })), 700);
      setTimeout(() => setTrackStatus((s) => ({ ...s, t2: 'done' })), 1100);
      setTimeout(() => setTrackStatus((s) => ({ ...s, t3: 'done' })), 1400);

      const response = await apiFetch('/api/papers/search-parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, filters: requestFilters, claim: forcedFilters.claim }),
      });
      const data = await response.json();

      setPapers(data.papers || []);
      setBySource(data.bySource || {});
      setVisibleCount(25);
      setMeta(data.meta || null);
      // Normalize the builder after each search. Chips are composition helpers,
      // not sticky filters; keeping them made the next search unintentionally accumulate old terms.
      setChips([]);
      setQuery(userQuery);
      setMergeSuggestion(null);
      setQueryHistory((prev) => [userQuery, ...prev.filter((item) => item !== userQuery)].slice(0, 10));
      setTrackStatus({ t1: 'done', t2: 'done', t3: 'done', t4: 'done' });
      window.setTimeout(() => resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
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
    const params = new URLSearchParams(window.location.search);
    const q = params.get('query') || params.get('q');
    if (!q) return;
    const sourceParam = params.get('sources');
    const selectedSources = sourceParam
      ? sourceParam.split(',').map((source) => source.trim()).filter((source) => PAPER_SOURCES.includes(source as (typeof PAPER_SOURCES)[number]))
      : [];
    const nextFilters = selectedSources.length ? { ...filters, sources: selectedSources } : filters;
    setFilters(nextFilters);
    setChips([]);
    setQuery(q);
    setQueryHistory((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 10));
    void searchPapers(q, [], nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="min-h-screen bg-[#F7F3EA] dark:bg-slate-950 text-[#263238] dark:text-slate-200 paper-ruled">
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10243A]/25 backdrop-blur-md" aria-live="polite" aria-busy="true">
          <div className="sketch-card border border-white/40 bg-white/90 px-8 py-7 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900/90">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2A9D8F]/20 border-t-[#2A9D8F]" />
            <p className="text-lg font-bold text-[#10243A] dark:text-slate-100">{t.loadingTitle}</p>
            <p className="mt-1 text-sm text-[#263238]/60 dark:text-slate-400">{t.loadingDesc}</p>
          </div>
        </div>
      )}
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
                {t.heroDesc}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {HERO_SOURCE_ORDER.map((src) => (
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
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 px-10 py-3 text-sm text-[#263238] dark:text-slate-200 placeholder:text-[#263238]/40 dark:placeholder:text-slate-500 outline-none ring-[#2A9D8F] transition focus:border-[#2A9D8F] focus:ring-2"
              />
            </div>
            <button
              onClick={() => { void searchPapers(); }}
              disabled={loading}
              className="sketch-btn rounded-xl bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#2A9D8F]/20 dark:shadow-black/20 transition hover:bg-[#238a7e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />{t.searching}</span>
              ) : t.searchButton}
            </button>
          </div>
          {quickQueries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[11px] text-[#263238]/40 dark:text-slate-600 self-center">{t.recent}</span>
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

            {/* {t.advancedTitle} */}
            <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#10243A] dark:text-slate-100">{t.advancedTitle}</span>
                  <span className="text-[11px] text-[#263238]/50 dark:text-slate-500">{t.advancedDesc}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen((v) => !v)}
                  className="rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2.5 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400 transition hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100"
                >
                  {isAdvancedOpen ? t.collapse : t.open}
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
                          <button type="button" onClick={() => setChips((prev) => prev.filter((_, i) => i !== idx)) } className="text-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100" title={t.removeChip}>×</button>
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
                            const submittedTerms = query.trim() ? [...chips, ...tokenizeInput(query)] : chips;
                            const submittedQuery = buildQueryFromChips(submittedTerms, '');
                            if (query.trim()) { commitBufferToChip(query); setQuery(''); }
                            void searchPapers(submittedQuery, submittedTerms); return;
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
                        placeholder={chips.length ? t.nextBlockPlaceholder : t.chipPlaceholder}
                        className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-[#263238] dark:text-slate-200 outline-none placeholder:text-[#263238]/40 dark:placeholder:text-slate-500 sm:min-w-[180px]"
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
                    <button type="button" onClick={() => { if (!query.trim()) return; commitBufferToChip(query); setQuery(''); }} className="rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100 transition">{t.addChip}</button>
                    <button type="button" onClick={() => { setChips([]); setQuery(''); setMergeSuggestion(null); }} className="rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100 transition">{t.clear}</button>
                    <button type="button" onClick={() => setIsGuideOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] hover:text-[#10243A] dark:text-slate-100 transition"><Info className="h-3 w-3" />{isGuideOpen ? t.guideClose : t.guideOpen}</button>
                    <span className="text-[#263238]/30 dark:text-slate-700">{t.imeHold}</span>
                  </div>

                  {/* Merge suggestion */}
                  {mergeSuggestion && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-[#263238] dark:text-slate-200">
                      <span className="text-[#263238]/70 dark:text-slate-400">{t.mergeSuggestion}: [{mergeSuggestion.left}] + [{mergeSuggestion.right}]</span>
                      <button type="button" onClick={() => { setChips((prev) => { if (prev.length < 2) return prev; return [...prev.slice(0, -2), mergeSuggestion.merged]; }); setMergeSuggestion(null); }} className="rounded-md border border-emerald-500 px-2 py-0.5 text-emerald-700 hover:bg-emerald-100 transition">{t.merge}</button>
                      <button type="button" onClick={() => setMergeSuggestion(null)} className="rounded-md border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 hover:border-[#2A9D8F] transition">{t.keepSplit}</button>
                    </div>
                  )}

                  {/* Guide */}
                  {isGuideOpen && (
                    <div className="rounded-xl border border-[#2A9D8F]/20 bg-[#2A9D8F]/5 dark:bg-teal-900/10 p-3 text-xs text-[#263238] dark:text-slate-200">
                      <p className="mb-2 font-semibold text-[#2A9D8F]">{t.guideTitle}</p>
                      <p className="mb-2 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400">{t.hintLabel}: {liveHint}</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div><p className="mb-1 font-medium text-[#10243A] dark:text-slate-100">{t.quickExamples}</p><ul className="space-y-1 text-[11px] text-[#263238]/50 dark:text-slate-500">{SEARCH_GUIDE.quick.length === 0 ? <li>• {t.quickEmpty}</li> : SEARCH_GUIDE.quick.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                        <div><p className="mb-1 font-medium text-[#10243A] dark:text-slate-100">{t.keyboardTitle}</p><ul className="space-y-1 text-[11px] text-[#263238]/50 dark:text-slate-500">{t.guideKeyboard.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                        <div><p className="mb-1 font-medium text-[#10243A] dark:text-slate-100">{t.accuracyTitle}</p><ul className="space-y-1 text-[11px] text-[#263238]/50 dark:text-slate-500">{t.guideTips.map((line) => <li key={line}>• {line}</li>)}</ul></div>
                      </div>
                    </div>
                  )}

                  {/* Contextual suggestions */}
                  {contextualSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] text-[#263238]/40 dark:text-slate-600">{t.expandSuggestions}</span>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {contextualSuggestions.map((s) => (
                          <button key={s.value} type="button" onClick={() => { setChips([]); setQuery(s.value); }} className="rounded-xl border border-[#7B6BA8]/40 bg-[#7B6BA8]/5 dark:bg-purple-900/10 px-3 py-2 text-left text-[11px] text-[#7B6BA8] transition hover:border-[#7B6BA8] hover:bg-[#7B6BA8]/10 dark:bg-purple-900/20">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${intentBadgeClass[s.intent]}`}>{s.intent}</span>
                              <span className="text-[10px] text-[#263238]/40 dark:text-slate-600">{t.applySuggestion}</span>
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

            <div ref={resultsTopRef} className="scroll-mt-28" />
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
                <span className="text-sm text-[#263238]/50 dark:text-slate-500">{displayedPapers.length} {t.papersCount}</span>
                <button onClick={() => setShowSavedOnly((v) => !v)} className={`rounded-lg border px-3 py-1.5 text-xs transition ${showSavedOnly ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]' : 'border-[#D8DEE6] dark:border-slate-700 text-[#263238]/60 dark:text-slate-400 hover:border-[#2A9D8F] hover:text-[#2A9D8F]'}`}>{showSavedOnly ? t.savedOnly : t.all}</button>
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
                  for (const src of PAPER_SOURCES) {
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
                {PAPER_SOURCES.map((src) => {
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
                  {effectiveInputQuery ? t.noResults : t.enterQuery}
                </p>
                <p className="mt-1 text-sm text-[#263238]/40 dark:text-slate-600">
                  {effectiveInputQuery ? t.noResultsDesc : t.enterQueryDesc}
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
                    <article key={paper.id} className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200 hover:border-[#2A9D8F]/40">
                      {/* Top accent bar */}
                      <div className={`h-0.5 w-full ${evAccent}`} />
                      <div className="p-5">
                        {/* Badges row */}
                        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${sourceBadge[paper.source]}`} title={paperTooltip.source[paper.source]}>{sourceLabel[paper.source]}</span>
                          {paper.matchType && <span className="rounded-full bg-[#7B6BA8]/15 dark:bg-purple-900/20 px-2.5 py-0.5 text-[#7B6BA8]">{paper.matchType}</span>}
                          <span className="rounded-full bg-[#D8DEE6]/60 dark:bg-slate-700/40 px-2.5 py-0.5 text-[#263238]/70 dark:text-slate-400" title={paperTooltip.year}>{paper.year}</span>
                          {paper.rankScore !== undefined && (
                            <span className="group relative inline-block">
                              <span className="cursor-help rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-amber-700 dark:text-amber-400">Score {paper.rankScore}</span>
                              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-64 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[11px] shadow-lg group-hover:block">
                                <p className="font-semibold text-[#10243A] dark:text-slate-100 mb-1">{t.rankScoreTitle}</p>
                                <ul className="space-y-0.5 text-[#263238]/70 dark:text-slate-400">
                                  <li>{t.rankRecency}</li>
                                  <li>{t.rankRelevance}</li>
                                  <li>{t.rankImpact}</li>
                                  <li>{t.rankMeta}</li>
                                </ul>
                                <p className="mt-1.5 text-[#263238]/40 dark:text-slate-600 text-[10px]">{t.rankCitationNote}</p>
                              </div>
                            </span>
                          )}
                          {paper.citations !== undefined && (
                            <span className="group relative inline-block">
                              <span className="cursor-help rounded-full bg-sky-100 dark:bg-sky-900/30 px-2.5 py-0.5 text-sky-700 dark:text-sky-400">⬆ {paper.citations}</span>
                              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-40 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] shadow-lg group-hover:block">
                                <p className="font-semibold text-[#10243A] dark:text-slate-100">{t.citationsTitle}</p>
                                <p className="text-[#263238]/60 dark:text-slate-400">{t.citationsDesc}</p>
                              </div>
                            </span>
                          )}
                          {paper.evidenceLabel && (
                            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${evidenceLabelBadge[paper.evidenceLabel] || 'bg-[#D8DEE6]/50 text-[#263238]/60 dark:text-slate-400'}`} title={paper.evidenceLabel === 'mention-only' ? '검색어가 포함된 결과입니다. 주장 지지/반박 판정은 아닙니다.' : (paper.evidenceScore !== undefined ? `Evidence score: ${paper.evidenceScore.toFixed(3)}` : '')}>{evidenceLabelText[paper.evidenceLabel] || paper.evidenceLabel}</span>
                          )}
                          {paper.evidenceScore !== undefined && paper.evidenceScore > 0 && (
                            <span className="text-[11px] text-[#263238]/40 dark:text-slate-600">ev {paper.evidenceScore.toFixed(2)}</span>
                          )}
                          {paper.journal && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F3EA] dark:bg-slate-900 border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 text-[11px] text-[#10243A] dark:text-slate-100/70" title={`${paper.journal}${paper.journalHIndex ? ` · h-index ${paper.journalHIndex}` : ''}`}>
                              <span>📖</span>
                              <span className="max-w-[180px] truncate">{paper.journal}</span>
                              {paper.impactFactor ? (
                                <span
                                  tabIndex={0}
                                  className={`group/if relative ml-1 cursor-help font-semibold outline-none ${paper.journalIfIsOfficial ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#2A9D8F]'}`}
                                  title={paper.journalIfIsOfficial ? 'Clarivate JCR 공식 JIF' : 'OpenAlex 2-year mean citedness 기반 프록시'}
                                >
                                  IF {paper.impactFactor.toFixed(1)}{paper.journalIfIsOfficial ? <span className="ml-0.5 text-[9px]">JCR</span> : null}
                                  <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-72 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-normal text-[#263238]/70 dark:text-slate-300 shadow-lg group-hover/if:block group-focus/if:block">
                                    <span className="block font-semibold text-[#10243A] dark:text-slate-100">
                                      {paper.journalIfIsOfficial ? 'Clarivate JCR 공식 JIF' : 'OpenAlex IF 프록시'}
                                    </span>
                                    <span className="block">
                                      {paper.journalIfIsOfficial ? `${paper.journalIfYear || '2024'} JIF: ${paper.impactFactor.toFixed(1)}` : `2-year mean citedness: ${paper.impactFactor.toFixed(1)}`}
                                    </span>
                                    {paper.journalIfSource ? <span className="block">출처: {paper.journalIfSource}</span> : null}
                                    {paper.journalIfMatchMode ? <span className="block">매칭: {paper.journalIfMatchMode}</span> : null}
                                    {paper.jcrJci ? <span className="block">JCI: {paper.jcrJci.toFixed(2)}</span> : null}
                                    {paper.journalRecentYears?.length && !paper.journalIfIsOfficial ? (
                                      <span className="mt-1 block">
                                        최근 3년: {paper.journalRecentYears.map((r) => `${r.year} 논문 ${r.works} / 인용 ${r.citations}`).join(' · ')}
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                              ) : null}
                              {paper.journalQuartile ? (
                                <span className={`group/q relative ml-0.5 font-bold text-[10px] px-1 py-0.5 rounded ${
                                  paper.journalQuartile === 'Q1' ? 'bg-emerald-100 text-emerald-700' :
                                  paper.journalQuartile === 'Q2' ? 'bg-blue-100 text-blue-700' :
                                  paper.journalQuartile === 'Q3' ? 'bg-amber-100 text-amber-700' :
                                  'bg-[#D8DEE6] text-[#263238]/60 dark:text-slate-400'
                                } cursor-help outline-none`} title={paper.journalIfIsOfficial ? 'JCR category별 공식 JIF quartile' : '프록시 IF 기반 분위 추정'} tabIndex={0}>
                                  {paper.journalQuartile}
                                  <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-72 rounded-lg border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-normal text-[#263238]/70 dark:text-slate-300 shadow-lg group-hover/q:block group-focus/q:block">
                                    <span className="block font-semibold text-[#10243A] dark:text-slate-100">
                                      {paper.journalIfIsOfficial ? 'JCR 공식 Q score' : '프록시 Q score'}
                                    </span>
                                    {paper.journalIfIsOfficial ? (
                                      <>
                                        <span className="block">연도: {paper.journalIfYear || '2024'}</span>
                                        {paper.jcrCategory ? <span className="block">분야: {paper.jcrCategory}</span> : null}
                                        {paper.jcrEdition ? <span className="block">Edition: {paper.jcrEdition}</span> : null}
                                        {paper.jcrRank ? <span className="block">Rank: {paper.jcrRank}</span> : null}
                                        {paper.jcrPercentile ? <span className="block">JIF percentile: {paper.jcrPercentile.toFixed(1)}</span> : null}
                                      </>
                                    ) : (
                                      <>
                                        <span className="block">분야: {paper.journalField || 'OpenAlex field 미확인'}</span>
                                        {paper.journalSubfield ? <span className="block">세부분야: {paper.journalSubfield}</span> : null}
                                        {paper.journalTopic ? <span className="block">대표 topic: {paper.journalTopic}</span> : null}
                                        {paper.journalDomain ? <span className="block">domain: {paper.journalDomain}</span> : null}
                                      </>
                                    )}
                                  </span>
                                </span>
                              ) : null}
                            </span>
                          )}
                          {/* Related hover button — right-aligned via ml-auto */}
                          <div className="relative ml-auto">
                            <button onMouseEnter={() => { setHoverPaperId(paper.id); void loadRelatedPapers(paper); }} onMouseLeave={() => setHoverPaperId((id) => (id === paper.id ? null : id))} className="inline-flex items-center gap-1 rounded-full border border-[#D8DEE6] dark:border-slate-700 px-2 py-0.5 text-[11px] text-[#263238]/40 dark:text-slate-600 transition hover:border-[#7B6BA8] hover:text-[#7B6BA8]" title={t.relatedTitle}><Sparkles className="h-3 w-3" /> Related</button>
                            {hoverPaperId === paper.id && (
                              <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs shadow-xl sm:w-80">
                                <p className="mb-2 font-semibold text-[#10243A] dark:text-slate-100">{t.relatedTitle}</p>
                                {(relatedByPaper[paper.id] || []).length === 0 ? <p className="text-[#263238]/40 dark:text-slate-600">{t.relatedLoading}</p> : (
                                  <ul className="max-h-44 space-y-2 overflow-y-auto pr-1">
                                    {(relatedByPaper[paper.id] || []).map((r) => (
                                      <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[#2A9D8F] hover:underline">{r.title}</a><p className="text-[11px] text-[#263238]/40 dark:text-slate-600">{r.source}{r.year ? ` · ${r.year}` : ''}</p></li>
                                    ))}
                                  </ul>
                                )}
                                <div className="mt-3 border-t border-[#D8DEE6] dark:border-slate-700 pt-2">
                                  <p className="mb-2 font-semibold text-[#10243A] dark:text-slate-100">{t.relatedDatasets}</p>
                                  {(relatedDatasetsByPaper[paper.id] || []).length === 0 ? <p className="text-[#263238]/40 dark:text-slate-600">{t.noDatasetResults}</p> : (
                                    <ul className="max-h-36 space-y-2 overflow-y-auto pr-1">
                                      {(relatedDatasetsByPaper[paper.id] || []).map((r) => (
                                        <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[#7B6BA8] hover:underline">{r.title}</a><p className="text-[11px] text-[#263238]/40 dark:text-slate-600">{r.source}{r.accessionIds?.length ? ` · ${r.accessionIds.slice(0, 2).join(', ')}` : ''}</p></li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
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

                        {/* Author keywords / MeSH / technique tags */}
                        {(paper.keywords?.length || paper.meshTerms?.length || paper.techniques?.length) ? (
                          <div className="mt-3 rounded-xl border border-[#D8DEE6]/70 dark:border-slate-700/70 bg-[#F7F3EA]/55 dark:bg-slate-900/45 px-3 py-2">
                            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#10243A]/55 dark:text-slate-400">
                              <Sparkles className="h-3 w-3 text-[#2A9D8F]" />
                              <span>Author keywords · MeSH · Concepts</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {paper.keywords?.slice(0, 5).map((term) => <span key={`kw-${term}`} className="rounded-full bg-[#2A9D8F]/12 dark:bg-teal-900/25 px-2 py-0.5 text-[10px] font-medium text-[#1f7f75] dark:text-teal-300" title="Author keyword / source concept">{term}</span>)}
                              {paper.meshTerms?.slice(0, 4).map((term) => <span key={`mesh-${term}`} className="rounded-full bg-[#D8DEE6]/55 dark:bg-slate-700/35 px-2 py-0.5 text-[10px] text-[#263238]/70 dark:text-slate-400" title="MeSH term">{term}</span>)}
                              {paper.techniques?.slice(0, 3).map((tech) => <span key={`tech-${tech}`} className="rounded-full bg-[#7B6BA8]/12 dark:bg-purple-900/25 px-2 py-0.5 text-[10px] text-[#7B6BA8]" title="Publication / technique tag">{tech}</span>)}
                            </div>
                          </div>
                        ) : null}

                        {/* Footer actions */}
                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#D8DEE6] dark:border-slate-700 pt-3 text-xs">
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" title={t.openTitle} className="inline-flex items-center gap-1 text-[#2A9D8F] transition hover:text-[#238a7e]">Open <ExternalLink className="h-3.5 w-3.5" /></a>
                          {paper.pdfUrl && <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" title={t.pdfTitle} className="inline-flex items-center gap-1 text-emerald-600 transition hover:text-emerald-700">PDF <Download className="h-3.5 w-3.5" /></a>}
                          <Link href={`/datasets?query=${encodeURIComponent(paper.title)}`} className="inline-flex items-center gap-1 rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2 py-1 text-[#263238]/60 dark:text-slate-400 transition hover:border-[#7B6BA8] hover:text-[#7B6BA8]" title={t.relatedDatasetsTitle}><Database className="h-3 w-3" /> Datasets</Link>
                          {authUserId ? (
                            <button onClick={() => toggleSave(paper)} disabled={saveLoadingId === paper.id} className="inline-flex items-center gap-1 rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2 py-1 text-[#263238]/60 dark:text-slate-400 transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-50" title="보관함에 저장/해제">
                              {savedIds.has(paper.id) ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" /> : <Bookmark className="h-3.5 w-3.5" />}
                              {savedIds.has(paper.id) ? 'Saved' : 'Save'}
                            </button>
                          ) : (
                            <span className="text-[#263238]/30 dark:text-slate-700" title={t.loginSave}>{t.loginSave}</span>
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
                      {t.loadMore} ({displayedPapers.length - visibleCount} {t.remaining})
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
                <Filter className="h-4 w-4 text-[#263238]/40 dark:text-slate-600" /> {t.filters}
              </h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                  <span className="mb-1 block text-[11px] text-[#263238]/50 dark:text-slate-500">{t.queryDriven}</span>
                  <p className="text-[11px] leading-relaxed text-[#263238]/60 dark:text-slate-400">
                    {t.queryDrivenDesc}
                  </p>
                </div>

                {/* Year */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-1 block text-[11px] text-[#263238]/50 dark:text-slate-500">{t.yearFrom}</span>
                    <input type="number" value={filters.yearFrom} onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })} className="w-full bg-transparent text-xs text-[#263238] dark:text-slate-200 outline-none" />
                  </div>
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-1 block text-[11px] text-[#263238]/50 dark:text-slate-500">{t.yearTo}</span>
                    <input type="number" value={filters.yearTo} onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })} className="w-full bg-transparent text-xs text-[#263238] dark:text-slate-200 outline-none" />
                  </div>
                </div>

                {/* Source toggles */}
                <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                  <span className="mb-2 block text-[11px] text-[#263238]/50 dark:text-slate-500">{t.sources}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {HERO_SOURCE_ORDER.map((source) => {
                      const active = filters.sources.includes(source);
                      return (
                        <button key={source} title={paperTooltip.source[source]} onClick={() => { const next = active ? filters.sources.filter((s) => s !== source) : [...filters.sources, source]; setFilters({ ...filters, sources: next }); }} className={`rounded-full border px-2 py-0.5 text-[11px] transition ${active ? 'border-[#2A9D8F] bg-[#2A9D8F] text-white' : 'border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#263238]/60 dark:text-slate-400 hover:border-[#2A9D8F] hover:text-[#2A9D8F]'}`}>
                          {sourceLabel[source]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Author profiles */}
                {(meta?.mode === 'author') && (meta?.homonymProfiles?.length || 0) > 0 && (
                  <div className="rounded-xl border border-[#D8DEE6] dark:border-slate-700 bg-[#F7F3EA] dark:bg-slate-900 px-3 py-2.5">
                    <span className="mb-2 block text-[11px] text-[#263238]/50 dark:text-slate-500">{t.recommendedProfiles}</span>
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
                      <button type="button" onClick={() => { const top = (meta?.homonymProfiles || [])[0]; if (!top) return; setFilters((prev) => ({ ...prev, profileIds: [top.profileId] })); }} className="rounded-lg border border-emerald-400 px-2.5 py-1 text-[11px] text-emerald-700 transition hover:bg-emerald-50">{t.bestProfile}</button>
                      <button type="button" onClick={() => void searchPapers()} className="rounded-lg border border-[#2A9D8F]/50 px-2.5 py-1 text-[11px] text-[#2A9D8F] transition hover:bg-[#2A9D8F]/5 dark:hover:bg-teal-900/20 dark:bg-teal-900/10">{t.applyFilter}</button>
                      {filters.profileIds.length > 0 && <button type="button" onClick={() => setFilters((prev) => ({ ...prev, profileIds: [] }))} className="rounded-lg border border-[#D8DEE6] dark:border-slate-700 px-2.5 py-1 text-[11px] text-[#263238]/60 dark:text-slate-400">{t.clear}</button>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#10243A] dark:text-slate-100">
                <Database className="h-4 w-4 text-[#263238]/40 dark:text-slate-600" /> {t.stats}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#F7F3EA] dark:bg-slate-900 px-3 py-3">
                  <p className="text-[11px] text-[#263238]/40 dark:text-slate-600">{t.total}</p>
                  <p className="mt-0.5 text-2xl font-bold text-[#10243A] dark:text-slate-100">{papers.length}</p>
                </div>
                <div className="rounded-xl bg-[#F7F3EA] dark:bg-slate-900 px-3 py-3">
                  <p className="text-[11px] text-[#263238]/40 dark:text-slate-600">{t.latency}</p>
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
                <span className="text-indigo-600">{sourceCounts.semantic}</span> Semantic · <span className="text-orange-600">{sourceCounts.crossref}</span> Crossref
                <br /><span className="text-cyan-600">{sourceCounts.openalex}</span> OpenAlex · <span className="text-teal-600">{sourceCounts.europepmc}</span> EuropePMC · <span className="text-purple-600">{sourceCounts.biorxiv}</span> bioRxiv
                <br /><span className="text-[#263238]/70 dark:text-slate-400 font-medium">{meta?.trackResults?.final ?? papers.length}</span> {t.integrated}
              </div>
            </div>

            {/* {t.suggestedTopics} */}
            {(meta?.suggestedTopics || []).length > 0 && (
              <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#10243A] dark:text-slate-100">
                  {t.suggestedTopics}
                  <span className="ml-1.5 text-[11px] font-normal text-[#263238]/40 dark:text-slate-600">{t.suggestedHint}</span>
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
                        <p className="text-[#263238]/60 dark:text-slate-400">{t.topicType}: {topic.type}</p>
                        <p className="text-[#2A9D8F]">{t.topicResults} {topic.count}</p>
                        {topic.filter?.yearFrom && <p className="text-[#263238]/50 dark:text-slate-500">{topic.filter.yearFrom} {t.yearFilterApplied}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* {t.topSignals} */}
            <div className="sketch-card border border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#10243A] dark:text-slate-100">{t.topSignals}</h3>
              {topSignals.length === 0 ? (
                <p className="text-xs text-[#263238]/40 dark:text-slate-600">{t.topSignalsEmpty}</p>
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
