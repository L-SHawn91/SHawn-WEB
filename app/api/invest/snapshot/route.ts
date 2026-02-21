import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type SignalTrend = "up" | "down" | "flat";
type RiskLevel = "Low" | "Medium" | "High";
type StrategyMode = "balanced" | "alpha" | "defensive";
type SignalAction = "Buy" | "Hold" | "Trim";

type Provenance = {
  sources: string[];
  generatedAt: string;
  refreshRule: string;
  upstreamFailure?: string;
};

type UpstreamSyncStatus = {
  configured: boolean;
  attempted: boolean;
  status: "success" | "failed" | "disabled";
  origin?: string;
  message?: string;
  httpStatus?: number;
};

type WeightProfile = {
  technical: number;
  flow: number;
  macro: number;
  news: number;
};

type DecisionThresholds = {
  buy: number;
  hold: { min: number; max: number };
  trim: number;
};

type SnapshotReason = {
  module: string;
  metric: string;
  value: number | string;
  impact: "up" | "down" | "neutral";
  rationale: string;
};

type RelativeMetric = {
  symbol: string;
  alphaVsBenchmark: number;
  beta: number;
  drawdown60d: number;
  momentumScore: number;
};


type SignalModule = {
  key: string;
  title: string;
  icon: string;
  subtitle: string;
  weight: number;
  trend: SignalTrend;
  checks: string[];
  confidence: number;
  action: string;
  palette: {
    from: string;
    to: string;
    border: string;
    text: string;
    bar: string;
  };
};

type MarketCard = {
  region: string;
  flag: string;
  indexA: { label: string; value: string; change: string };
  indexB: { label: string; value: string; change: string };
  traits: string[];
  allocation: number;
  risk: RiskLevel;
  liquidity: "Low" | "Normal" | "High";
  palette: {
    from: string;
    to: string;
    border: string;
    text: string;
  };
};

type Holding = {
  symbol: string;
  allocation: number;
  pnl: number;
  beta: number;
  risk: RiskLevel;
};


type QuantReportMeta = {
  market?: string;
  date?: string;
  time?: string;
  timestamp?: string;
  avg_score?: number;
  strong_buy_count?: number;
  buy_count?: number;
  sell_count?: number;
  watch_count?: number;
  top_alpha_ticker?: string;
};

type QuantReportItem = {
  ticker?: string;
  name?: string;
  score?: number;
  rank?: number;
  synthesis_verdict?: string;
  scores?: {
    expert?: number;
    whale?: number;
    macro?: number;
    news?: number;
  };
  details?: {
    news?: string[];
  };
  price_info?: {
    change_pct?: number;
  };
  external_consensus?: string;
  whale_activity?: string;
};

type QuantReportPayload = {
  meta?: QuantReportMeta;
  reports?: QuantReportItem[];
};

type WatchItem = {
  symbol: string;
  signal: SignalAction;
  score: number;
  reason: string;
  catalyst: string;
  region: "k" | "us";
  rationale?: string;
};

type RebalanceSuggestion = {
  symbol: string;
  action: "up" | "down" | "hold";
  deltaPct: number;
  reason: string;
};


type SimulationChange = {
  symbol: string;
  prevAllocation: number;
  nextAllocation: number;
  direction: "up" | "down";
  deltaPct: number;
};

type RebalanceSimulation = {
  projectedHoldings: Holding[];
  changes: SimulationChange[];
  risk: {
    concentration: number;
    highRiskShare: number;
    weightedPnl: number;
  };
};

const BASE_SIGNAL_MODULES: SignalModule[] = [
  {
    key: "expert",
    title: "Expert Score",
    icon: "📊",
    subtitle: "기술 분석",
    weight: 40,
    trend: "up",
    checks: ["Moving Average", "RSI", "MACD", "지지/저항선"],
    confidence: 76,
    action: "관심종목 우선순위 조정",
    palette: {
      from: "from-orange-900/35",
      to: "to-amber-900/35",
      border: "border-orange-500/45",
      text: "text-orange-400",
      bar: "bg-orange-500",
    },
  },
  {
    key: "whale",
    title: "Whale Activity",
    icon: "🐋",
    subtitle: "기관/외국인 수급",
    weight: 30,
    trend: "flat",
    checks: ["기관 순매수", "대량 거래", "진입/청산 시그널", "외국인 유입"],
    confidence: 69,
    action: "외국인 유입 구간에서 비중 상향 검토",
    palette: {
      from: "from-blue-900/35",
      to: "to-cyan-900/35",
      border: "border-blue-500/45",
      text: "text-blue-400",
      bar: "bg-blue-500",
    },
  },
  {
    key: "macro",
    title: "Macro Matrix",
    icon: "🌍",
    subtitle: "거시 지표",
    weight: 20,
    trend: "down",
    checks: ["GDP", "금리 정책", "인플레이션", "환율"],
    confidence: 58,
    action: "금리 민감 산업 비중 축소 권고",
    palette: {
      from: "from-green-900/35",
      to: "to-emerald-900/35",
      border: "border-emerald-500/45",
      text: "text-emerald-400",
      bar: "bg-emerald-500",
    },
  },
  {
    key: "news",
    title: "News Sentiment",
    icon: "📰",
    subtitle: "이벤트 반응",
    weight: 10,
    trend: "down",
    checks: ["긍정 뉴스", "부정 뉴스", "중립 판정", "이벤트 임팩트"],
    confidence: 45,
    action: "단기 악재 반응 심할 때 헤지 유지",
    palette: {
      from: "from-rose-900/35",
      to: "to-pink-900/35",
      border: "border-rose-500/45",
      text: "text-rose-400",
      bar: "bg-rose-500",
    },
  },
];

const BASE_MARKETS: MarketCard[] = [
  {
    region: "Korea Market",
    flag: "🇰🇷",
    indexA: { label: "KOSPI", value: "N/A", change: "N/A" },
    indexB: { label: "KOSDAQ", value: "N/A", change: "N/A" },
    traits: ["반도체·자동차 편중", "기관 수급 증가", "내수 변동성", "고배당 제한"],
    allocation: 40,
    risk: "High",
    liquidity: "Normal",
    palette: {
      from: "from-red-900/35",
      to: "to-pink-900/35",
      border: "border-red-500/45",
      text: "text-red-400",
    },
  },
  {
    region: "US Market",
    flag: "🇺🇸",
    indexA: { label: "S&P 500", value: "N/A", change: "N/A" },
    indexB: { label: "NASDAQ 100", value: "N/A", change: "N/A" },
    traits: ["AI 테크 강세", "AI 인프라 투자", "금리 민감", "옵션 변동성 상승"],
    allocation: 60,
    risk: "Medium",
    liquidity: "High",
    palette: {
      from: "from-blue-900/35",
      to: "to-indigo-900/35",
      border: "border-blue-500/45",
      text: "text-blue-400",
    },
  },
];

const BASE_HOLDINGS: Holding[] = [
  { symbol: "AAPL", allocation: 12, pnl: 4.8, beta: 1.15, risk: "Medium" },
  { symbol: "NVDA", allocation: 8, pnl: 11.2, beta: 1.52, risk: "High" },
  { symbol: "MSFT", allocation: 7.5, pnl: 7.1, beta: 0.98, risk: "Medium" },
  { symbol: "TSMC", allocation: 7, pnl: 3.2, beta: 1.12, risk: "Medium" },
  { symbol: "005930.KS", allocation: 10, pnl: 2.6, beta: 1.38, risk: "High" },
  { symbol: "GOOGL", allocation: 6.5, pnl: -0.9, beta: 1.08, risk: "Medium" },
];



const REPORT_CACHE_TTL_MS = 60_000;
type ReportIndexItem = {
  path?: string;
  json_path?: string;
  type?: string;
  timestamp?: string;
};

let cachedIndex: { at: number; items: ReportIndexItem[] } | null = null;
let cachedMarketReport: { [key: string]: { at: number; data: QuantReportPayload } } = {};
const BASE_WATCH: WatchItem[] = [
  {
    symbol: "SMCI",
    signal: "Buy",
    score: 88,
    reason: "AI 데이터센터 실적 개선 기대",
    catalyst: "분기 실적 가이던스 상향",
    region: "us",
  },
  {
    symbol: "AMZN",
    signal: "Hold",
    score: 61,
    reason: "가격대비 모멘텀 완만",
    catalyst: "AWS 성장 둔화 완화 징후",
    region: "us",
  },
  {
    symbol: "TSLA",
    signal: "Trim",
    score: 46,
    reason: "고위험 구간 확대",
    catalyst: "마진 압박 + 자본지출 부담",
    region: "us",
  },
];

const MODE_WEIGHTS_PROFILES: Record<StrategyMode, WeightProfile> = {
  balanced: { technical: 0.40, flow: 0.25, macro: 0.20, news: 0.15 },
  alpha: { technical: 0.50, flow: 0.20, macro: 0.10, news: 0.20 },
  defensive: { technical: 0.25, flow: 0.20, macro: 0.35, news: 0.20 },
};

const MODE_WEIGHTS: Record<StrategyMode, number[]> = {
  balanced: [0.45, 0.3, 0.15, 0.1],
  alpha: [0.55, 0.25, 0.1, 0.1],
  defensive: [0.25, 0.2, 0.35, 0.2],
};

type QuoteHealth = "ok" | "degraded" | "fallback";

type YahooQuote = { regularMarketPrice?: number; regularMarketChangePercent?: number; regularMarketTime?: number; symbol?: string };

type MarketLiveSnapshot = {
  markets: MarketCard[];
  sourceName: string;
  providerPriority: number;
  freshnessSec: number;
  fetchedAt: string;
  fallbackLevel: number;
  quoteHealth: QuoteHealth;
  updatedAt: string;
};

type DriftDetector = {
  benchmark: {
    ks: number;
    us: number;
    score: number;
  };
  signals: {
    signalConfidence: number;
    signalVariance: number;
    driftScore: number;
  };
  driftScore: number;
  status: "stable" | "unstable";
};

function formatIndexValue(v?: number): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return 'N/A';
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatChangePct(v?: number): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return 'N/A';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

const QUOTE_HEALTH_OK_SEC = 3_600;
const QUOTE_HEALTH_DEGRADED_SEC = 14_400;

function parseFreshnessSec(value?: string | number | null, fallback = 3600): number {
  if (value === undefined || value === null || value === "") return fallback;
  const asNumber = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(asNumber)) return fallback;
  const sec = Math.floor((Date.now() - asNumber) / 1000);
  if (!Number.isFinite(sec)) return fallback;
  return Math.max(0, sec);
}

function classifyQuoteHealth(freshnessSec: number): QuoteHealth {
  if (freshnessSec <= QUOTE_HEALTH_OK_SEC) return "ok";
  if (freshnessSec <= QUOTE_HEALTH_DEGRADED_SEC) return "degraded";
  return "fallback";
}

async function fetchLiveMarkets(): Promise<MarketLiveSnapshot> {
  const markets = BASE_MARKETS.map((m) => ({ ...m, indexA: { ...m.indexA }, indexB: { ...m.indexB } }));
  const kr = markets[0];
  const us = markets[1];

  const apply = (payload: {
    ks11?: { price?: number; chg?: number };
    kq11?: { price?: number; chg?: number };
    gspc?: { price?: number; chg?: number };
    ndx?: { price?: number; chg?: number };
  }) => {
    if (kr) {
      kr.indexA.value = formatIndexValue(payload.ks11?.price);
      kr.indexA.change = formatChangePct(payload.ks11?.chg);
      kr.indexB.value = formatIndexValue(payload.kq11?.price);
      kr.indexB.change = formatChangePct(payload.kq11?.chg);
    }
    if (us) {
      us.indexA.value = formatIndexValue(payload.gspc?.price);
      us.indexA.change = formatChangePct(payload.gspc?.chg);
      us.indexB.value = formatIndexValue(payload.ndx?.price);
      us.indexB.change = formatChangePct(payload.ndx?.chg);
    }
  };

  const now = Date.now();

  try {
    const symbols = ['^KS11', '^KQ11', '^GSPC', '^NDX'];
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 SHawnbrain/1.0',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Yahoo quote failed: ${res.status}`);
    const data = await res.json();
    const rows = (data?.quoteResponse?.result || []) as YahooQuote[];
    const bySymbol = new Map<string, YahooQuote>(rows.map((r) => [String(r.symbol || ''), r]));
    const lastUpdateTimestamps = [
      bySymbol.get('^KS11')?.regularMarketTime,
      bySymbol.get('^KQ11')?.regularMarketTime,
      bySymbol.get('^GSPC')?.regularMarketTime,
      bySymbol.get('^NDX')?.regularMarketTime,
    ].filter((it): it is number => typeof it === 'number' && Number.isFinite(it));
    const freshnessSec = parseFreshnessSec(
      lastUpdateTimestamps.length ? Math.max(...lastUpdateTimestamps) * 1000 : null,
      120,
    );

    apply({
      ks11: { price: bySymbol.get('^KS11')?.regularMarketPrice, chg: bySymbol.get('^KS11')?.regularMarketChangePercent },
      kq11: { price: bySymbol.get('^KQ11')?.regularMarketPrice, chg: bySymbol.get('^KQ11')?.regularMarketChangePercent },
      gspc: { price: bySymbol.get('^GSPC')?.regularMarketPrice, chg: bySymbol.get('^GSPC')?.regularMarketChangePercent },
      ndx: { price: bySymbol.get('^NDX')?.regularMarketPrice, chg: bySymbol.get('^NDX')?.regularMarketChangePercent },
    });

    return {
      markets,
      sourceName: 'Yahoo Finance quote API',
      providerPriority: 0,
      freshnessSec,
      fetchedAt: new Date(now).toISOString(),
      fallbackLevel: 0,
      quoteHealth: classifyQuoteHealth(freshnessSec),
      updatedAt: new Date(now).toISOString(),
    };
  } catch {
    try {
      const stooq = await fetch('https://stooq.com/q/l/?s=spx,ndq,ks11,kq11&i=d', {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      const csv = await stooq.text();
      const lines = csv.trim().split(/\r?\n/);
      // stooq format: SYMBOL,DATE,TIME,OPEN,HIGH,LOW,CLOSE,VOLUME
      const closeBy = new Map<string, number>();
      const latestBy = new Map<string, string>();
      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (!cols[0] || cols.length < 7) continue;
        const symbol = cols[0].trim().toUpperCase();
        const close = Number.parseFloat(cols[6]);
        const date = cols[1]?.trim();
        const time = cols[2]?.trim();
        const timestamp = [date, time].filter(Boolean).join('T');

        if (Number.isFinite(close)) {
          closeBy.set(symbol, close);
          if (timestamp) latestBy.set(symbol, timestamp);
        }
      }

      const stooqTimestamp = latestBy.values().next().value;

      apply({
        ks11: { price: closeBy.get('KS11') },
        kq11: { price: closeBy.get('KQ11') },
        gspc: { price: closeBy.get('SPX') },
        ndx: { price: closeBy.get('NDQ') },
      });
      const stooqFreshnessSec = parseFreshnessSec(stooqTimestamp, 86_400);
      return {
        markets,
        sourceName: 'Stooq EOD fallback',
        providerPriority: 1,
        freshnessSec: stooqFreshnessSec,
        fetchedAt: new Date(now).toISOString(),
        fallbackLevel: 1,
        quoteHealth: classifyQuoteHealth(stooqFreshnessSec),
        updatedAt: new Date(now).toISOString(),
      };
    } catch {
      const fallbackFreshnessSec = 604_800;
      return {
        markets: BASE_MARKETS,
        sourceName: 'fallback/static',
        providerPriority: 2,
        freshnessSec: fallbackFreshnessSec,
        fetchedAt: new Date(now).toISOString(),
        fallbackLevel: 2,
        quoteHealth: classifyQuoteHealth(fallbackFreshnessSec),
        updatedAt: new Date(now).toISOString(),
      };
    }
  }
}

function applyModeWeight(modules: SignalModule[], mode: StrategyMode): SignalModule[] {
  const weights = MODE_WEIGHTS[mode];
  return modules.map((m, idx) => ({
    ...m,
    weight: Math.round((m.weight * (0.6 + weights[idx] * 2)) / 1.8),
  }));
}



function parseSignalFromVerdict(verdict = ""): SignalAction {
  const lower = String(verdict || "").toLowerCase();
  if (lower.includes("buy")) return "Buy";
  if (lower.includes("sell") || lower.includes("trim")) return "Trim";
  return "Hold";
}

function inferRiskLevel(item: QuantReportItem): RiskLevel {
  const text = `${item.synthesis_verdict || ""} ${item.whale_activity || ""} ${item.external_consensus || ""}`.toLowerCase();
  if (text.includes("sell") || text.includes("trim") || text.includes("high")) return "High";
  if (text.includes("neutral/watch") || text.includes("watch") || text.includes("neutral")) return "Medium";
  return "Low";
}

function riskToDecimal(score?: number): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 0.5;
  return Math.max(0.2, Math.min(1.8, 1 + (score - 50) / 100));
}

function normalizeAllocations(items: Holding[]): Holding[] {
  const total = items.reduce((acc, item) => acc + item.allocation, 0);
  if (total <= 0) return items;
  return items.map((item) => ({
    ...item,
    allocation: Number((item.allocation * (100 / total)).toFixed(2)),
  }));
}

async function loadReportIndex(): Promise<ReportIndexItem[]> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndex.at < REPORT_CACHE_TTL_MS) return cachedIndex.items;

  const filePath = path.join(process.cwd(), "public", "reports", "index.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as ReportIndexItem[];
  const items = Array.isArray(parsed) ? parsed : [];

  cachedIndex = {
    at: now,
    items: items.slice().sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || ""))),
  };
  return cachedIndex.items;
}

async function readLatestReportByMarket(type: "KR" | "US"): Promise<QuantReportPayload | null> {
  const now = Date.now();
  if (cachedMarketReport[type] && now - Number(cachedMarketReport[type].at) < REPORT_CACHE_TTL_MS) {
    return cachedMarketReport[type]?.data || null;
  }

  const items = await loadReportIndex();
  const latest = items.find((item) => String(item.type || "").toUpperCase() === type && item.json_path);
  if (!latest?.json_path) return null;

  try {
    const reportPath = path.join(process.cwd(), "public", latest.json_path.startsWith("/") ? latest.json_path.slice(1) : latest.json_path);
    const raw = await fs.readFile(reportPath, "utf-8");
    const parsed = JSON.parse(raw) as QuantReportPayload;
    cachedMarketReport[type] = { at: now, data: parsed };
    return parsed;
  } catch {
    return null;
  }
}

function toQuantHoldings(reports: QuantReportPayload | null): Holding[] {
  if (!reports?.reports?.length) return BASE_HOLDINGS;

  const rows = reports.reports
    .filter((item) => item && item.ticker)
    .slice(0, 8)
    .map((item) => ({
      symbol: String(item.ticker || "").trim(),
      allocation: Number((((Number(item.score) || 45) - 40) * 4).toFixed(2)),
      pnl: Number(((Number(item.price_info?.change_pct) || 0)).toFixed(2)),
      beta: riskToDecimal(item.score),
      risk: inferRiskLevel(item),
    }));

  const normalized = normalizeAllocations(rows);
  return normalized.length ? normalized : BASE_HOLDINGS;
}



function buildEvidenceFromItem(item: QuantReportItem): SnapshotReason[] {
  const reasons: SnapshotReason[] = [];
  const expert = Number(item.scores?.expert || 0);
  const whale = Number(item.scores?.whale || 0);
  const macro = Number(item.scores?.macro || 0);
  const news = Number(item.scores?.news || 0);
  const total = Math.round((expert + whale + macro + news) / 4);

  reasons.push({
    module: "technical",
    metric: "expert_score",
    value: expert,
    impact: expert >= 55 ? "up" : expert <= 35 ? "down" : "neutral",
    rationale: `기술점수 ${expert}/100 기반`,
  });
  reasons.push({
    module: "flow",
    metric: "flow_score",
    value: whale,
    impact: whale >= 55 ? "up" : whale <= 35 ? "down" : "neutral",
    rationale: item.whale_activity || "기관/거래량 지표 기반 분석",
  });
  reasons.push({
    module: "macro",
    metric: "macro_score",
    value: macro,
    impact: macro >= 55 ? "up" : macro <= 35 ? "down" : "neutral",
    rationale: item.external_consensus || "거시 요인 반영",
  });
  reasons.push({
    module: "news",
    metric: "news_score",
    value: news,
    impact: news >= 55 ? "up" : news <= 35 ? "down" : "neutral",
    rationale: `${(item.details?.news?.[0] || "뉴스 임팩트 분석")}`,
  });

  if (item.price_info?.change_pct !== undefined) {
    reasons.push({
      module: "momentum",
      metric: "price_change_1d",
      value: Number(item.price_info?.change_pct || 0),
      impact: Number(item.price_info?.change_pct || 0) >= 0 ? "up" : "down",
      rationale: "단기 수익률 모멘텀",
    });
  }

  return reasons.filter((r) => r.value !== null && r.value !== undefined);
}

function deriveRelativeScore(item: QuantReportItem): RelativeMetric {
  const score = Number(item.score || 50);
  const change = Number(item.price_info?.change_pct || 0);
  return {
    symbol: String(item.ticker || ""),
    alphaVsBenchmark: Number((score - 50 + Math.min(20, Math.max(-20, change))).toFixed(2)),
    beta: riskToDecimal(score),
    drawdown60d: Number((Math.abs(Math.min(0, change)) * 1.8).toFixed(2)),
    momentumScore: Number((Math.max(0, Math.min(100, score + change)).toFixed(2))),
  };
}

function parsePctValue(input?: string): number {
  if (typeof input !== "string") return NaN;
  const cleaned = input.trim().replace(/,/g, "").replace(/%/g, "").replace(/\+/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function buildDriftDetector(markets: MarketCard[], modules: SignalModule[], signalConfidence: number): DriftDetector {
  const firstMarket = markets[0];
  const secondMarket = markets[1];

  const krChanges = [parsePctValue(firstMarket?.indexA?.change), parsePctValue(firstMarket?.indexB?.change)]
    .filter((value): value is number => Number.isFinite(value));
  const usChanges = [parsePctValue(secondMarket?.indexA?.change), parsePctValue(secondMarket?.indexB?.change)]
    .filter((value): value is number => Number.isFinite(value));

  const benchmarkKs = krChanges.length
    ? krChanges.reduce((acc, value) => acc + Math.abs(value), 0) / krChanges.length
    : 0;
  const benchmarkUs = usChanges.length
    ? usChanges.reduce((acc, value) => acc + Math.abs(value), 0) / usChanges.length
    : 0;

  const benchmarkScore = Math.min(100, Number(((benchmarkKs + benchmarkUs) / 2) * 1.8));
  const signalVariance = modules.length
    ? Math.round(modules.reduce((acc, m) => acc + Math.abs(m.confidence - signalConfidence), 0) / modules.length)
    : 0;
  const signalsScore = Math.min(100, signalVariance * 2);
  const driftScore = Number(((benchmarkScore + signalsScore) / 2).toFixed(2));

  return {
    benchmark: {
      ks: benchmarkKs,
      us: benchmarkUs,
      score: benchmarkScore,
    },
    signals: {
      signalConfidence,
      signalVariance,
      driftScore: signalsScore,
    },
    driftScore,
    status: driftScore >= 40 ? "unstable" : "stable",
  };
}

function toQuantWatchlist(item: QuantReportPayload | null, region: "k" | "us"): WatchItem[] {
  if (!item?.reports?.length) return BASE_WATCH;

  return item.reports.slice(0, 5).map((entry) => collectWatchReason(entry, region));
}


function computeSignalConfidence(modules: SignalModule[]): number {
  const totalWeight = modules.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round(
    modules.reduce((acc, item) => acc + item.confidence * (item.weight / totalWeight), 0)
  );
}

function computeHoldingsRisk(holdings: Holding[]) {
  const total = holdings.reduce((acc, h) => acc + h.allocation, 0);
  const highRiskShare = holdings.filter((h) => h.risk === "High").reduce((acc, h) => acc + h.allocation, 0);
  const concentration = Math.max(...holdings.map((h) => h.allocation));
  const weightedPnl = holdings.reduce((acc, h) => acc + h.allocation * Math.max(-5, Math.min(15, h.pnl)), 0) / Math.max(1, total);

  return {
    highRiskShare,
    concentration,
    weightedPnl,
  };
}

function computeRebalanceSuggestions(holdings: Holding[], signalScore: number): RebalanceSuggestion[] {
  const maxRisk = 10;
  const suggestions: RebalanceSuggestion[] = [];

  const sorted = [...holdings].sort((a, b) => b.pnl - a.pnl);
  for (const item of sorted) {
    if (item.allocation > maxRisk && item.risk === "High") {
      suggestions.push({
        symbol: item.symbol,
        action: "down",
        deltaPct: 1.5,
        reason: "고위험+고농축 구간에서 완만 감축", 
      });
    }
  }

  if (signalScore >= 70) {
    const top = sorted.find((item) => item.risk !== "High" && item.allocation < 12);
    if (top) {
      suggestions.push({
        symbol: top.symbol,
        action: "up",
        deltaPct: 1.0,
        reason: "우호적 신호 구간에서 점진적 비중 확대",
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      symbol: holdings[0]?.symbol || "Portfolio",
      action: "hold",
      deltaPct: 0,
      reason: "현재 제약 내에서 즉시 조정 불필요",
    });
  }

  return suggestions.slice(0, 4);
}



function simulateRebalance(holdings: Holding[], suggestions: RebalanceSuggestion[]): RebalanceSimulation {
  const next = holdings.map((h) => ({ ...h }));
  const bySymbol = new Map<string, Holding>(next.map((h) => [h.symbol, h]));
  const changes: SimulationChange[] = [];

  for (const sugg of suggestions) {
    if (sugg.action === "hold" || sugg.deltaPct <= 0) continue;
    const target = bySymbol.get(sugg.symbol);
    if (!target) continue;

    const delta = Math.abs(sugg.deltaPct);
    const prevAllocation = target.allocation;

    if (sugg.action === "down") {
      target.allocation = Math.max(0, Number((target.allocation - delta).toFixed(2)));
    } else {
      target.allocation = Number((target.allocation + delta).toFixed(2));
    }

    if (target.allocation !== prevAllocation) {
      changes.push({
        symbol: target.symbol,
        prevAllocation,
        nextAllocation: target.allocation,
        direction: sugg.action,
        deltaPct: Number((Math.abs(target.allocation - prevAllocation)).toFixed(2)),
      });
    }
  }

  const total = next.reduce((acc, h) => acc + h.allocation, 0);
  const normalized = total > 0 ? next.map((h) => ({
    ...h,
    allocation: Number((h.allocation * (100 / total)).toFixed(2)),
  })) : next;

  const { highRiskShare, concentration, weightedPnl } = computeHoldingsRisk(normalized);
  return {
    projectedHoldings: normalized,
    changes,
    risk: {
      concentration,
      highRiskShare,
      weightedPnl,
    },
  };
}


function injectSignals(modules: SignalModule[], mode: StrategyMode) {
  const byMode = applyModeWeight(modules, mode);
  const confidence = computeSignalConfidence(byMode);
  const normalized = byMode.map((m) => ({ ...m, weight: m.weight }));
  return {
    modules: normalized,
    signalConfidence: confidence,
  };
}

export async function GET(request: NextRequest) {
  const mode = (new URL(request.url).searchParams.get("mode") || "balanced") as StrategyMode;
  const fallbackMode: StrategyMode = ["balanced", "alpha", "defensive"].includes(mode) ? mode : "balanced";

  const upstream = process.env.SHAWN_INV_SNAPSHOT_URL?.trim();
  let upstreamFailure: string | null = null;
  let upstreamSync: UpstreamSyncStatus = {
    configured: Boolean(upstream),
    attempted: false,
    status: upstream ? "failed" : "disabled",
  };

  if (upstream) {
    try {
      const u = new URL(upstream);
      upstreamSync = { ...upstreamSync, attempted: true, origin: u.origin };
      u.searchParams.set('mode', fallbackMode);
      if (new URL(request.url).searchParams.get('simulate') === '1') {
        u.searchParams.set('simulate', '1');
      }

      const r = await fetch(u.toString(), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const data = await r.json();
        return NextResponse.json(
          {
            ...data,
            upstreamSync: {
              ...(data?.upstreamSync || {}),
              configured: true,
              attempted: true,
              status: "success",
              origin: u.origin,
              message: "SHawn-INV 업스트림 연동 정상",
              httpStatus: r.status,
            },
            provenance: {
              ...(data?.provenance || {}),
              sources: [...(data?.provenance?.sources || []), `upstream:${u.origin}`],
            },
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
      upstreamFailure = `upstream_status_${r.status}`;
      upstreamSync = {
        ...upstreamSync,
        status: "failed",
        message: `SHawn-INV 응답 실패 (${r.status})`,
        httpStatus: r.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      upstreamFailure = `upstream_error:${message}`;
      upstreamSync = {
        ...upstreamSync,
        status: "failed",
        message: `SHawn-INV 연결 실패 (${message})`,
      };
      // fallback to local snapshot builder
    }
  }

  const shouldSimulate = new URL(request.url).searchParams.get("simulate") === "1";
  const { modules, signalConfidence } = injectSignals(BASE_SIGNAL_MODULES, fallbackMode);
  const krReport = await readLatestReportByMarket("KR");
  const usReport = await readLatestReportByMarket("US");

  const mergedHoldings = normalizeAllocations(
    toQuantHoldings(fallbackMode === "alpha" || fallbackMode === "balanced" ? usReport : krReport)
      .concat(toQuantHoldings(fallbackMode === "defensive" ? krReport : usReport))
      .slice(0, 12)
      .map((item, idx) => ({ ...item, allocation: Math.max(1, Number(item.allocation.toFixed(2))) }))
  );
  const mergedWatchlist = Array.from(
    new Map<string, WatchItem>(
      [...toQuantWatchlist(usReport, "us"), ...toQuantWatchlist(krReport, "k")].map((w) => [w.symbol, w])
    ).values()
  );

  const holdings = mergedHoldings.length ? mergedHoldings : BASE_HOLDINGS;
  const watchlist = mergedWatchlist.length ? mergedWatchlist : BASE_WATCH;
  const { highRiskShare, concentration, weightedPnl } = computeHoldingsRisk(holdings);
  const rebalanceSuggestions = computeRebalanceSuggestions(holdings, signalConfidence);
  const simulation = shouldSimulate ? simulateRebalance(holdings, rebalanceSuggestions) : null;

  const liveMarkets = await fetchLiveMarkets();
  const driftDetector = buildDriftDetector(liveMarkets.markets, modules, signalConfidence);

  const relative = [
    ...buildBenchmarkRelative(usReport),
    ...buildBenchmarkRelative(krReport),
  ];

  const reasons = [
    ...(usReport?.reports || []).slice(0, 8).map((item) => ({ symbol: String(item.ticker || ""), reasons: buildEvidenceFromItem(item) })),
    ...(krReport?.reports || []).slice(0, 8).map((item) => ({ symbol: String(item.ticker || ""), reasons: buildEvidenceFromItem(item) })),
  ].filter((item) => item.symbol);

  const payload = {
    updatedAt: new Date().toISOString(),
    mode: fallbackMode,
    quoteSource: {
      sourceName: liveMarkets.sourceName,
      providerPriority: liveMarkets.providerPriority,
      fetchedAt: liveMarkets.fetchedAt,
      freshnessSec: liveMarkets.freshnessSec,
      fallbackLevel: liveMarkets.fallbackLevel,
    },
    quoteHealth: liveMarkets.quoteHealth,
    driftDetector,
    upstreamSync,
    weights: MODE_WEIGHTS_PROFILES[fallbackMode],
    provenance: {
      sources: ["public/reports/index.json", "public/reports/*.json", liveMarkets.sourceName],
      generatedAt: new Date().toISOString(),
      refreshRule: "latest timestamp from report index by type + live quote refresh on request",
      ...(upstreamFailure ? { upstreamFailure } : {}),
    },
    benchmark: {
      KR: "KOSPI",
      US: "S&P 500",
      lastUpdated: [krReport?.meta?.timestamp, usReport?.meta?.timestamp, liveMarkets.updatedAt].filter(Boolean).join(" | "),
    },
    signalConfidence,
    modules,
    decisionThresholds: {
      buy: 75,
      hold: { min: 40, max: 75 },
      trim: 40,
    },
    reasoning: reasons,
    relatives: relative,

    markets: liveMarkets.markets,
    holdings,
    watchlist,
    risk: {
      concentration,
      highRiskShare,
      weightedPnl,
      rebalanceNeed: highRiskShare >= 20,
    },
    rebalanceSuggestions,
    simulation,
    kpis: {
      portfolio: "$5.2M",
      annualReturn: "+15.3%",
      positionCount: holdings.length,
      volatility: "10.6%",
    },
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}


function collectWatchReason(entry: QuantReportItem, region: "k" | "us"): WatchItem {
  const reasons = buildEvidenceFromItem(entry);
  const top = reasons.find((r) => r.impact === "up") || reasons[0];
  return {
    symbol: String(entry.ticker || ""),
    signal: parseSignalFromVerdict(entry.synthesis_verdict),
    score: Math.round(entry.score || 0),
    reason: entry.synthesis_verdict || "중립/Watch",
    catalyst: (entry.details?.news || [])[0] || `${region.toUpperCase()} 시장 모멘텀 기반 자동 점수`,
    region,
    rationale: top ? `${top.module}: ${top.rationale}` : undefined,
  };
}


function buildBenchmarkRelative(reports: QuantReportPayload | null): RelativeMetric[] {
  if (!reports?.reports?.length) return [];
  return reports.reports
    .filter((item) => item?.ticker)
    .slice(0, 8)
    .map((item) => deriveRelativeScore(item));
}
