import { NextRequest, NextResponse } from "next/server";

type SignalTrend = "up" | "down" | "flat";
type RiskLevel = "Low" | "Medium" | "High";
type StrategyMode = "balanced" | "alpha" | "defensive";
type SignalAction = "Buy" | "Hold" | "Trim";

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

type WatchItem = {
  symbol: string;
  signal: SignalAction;
  score: number;
  reason: string;
  catalyst: string;
  region: "k" | "us";
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
    indexA: { label: "KOSPI", value: "2500", change: "+0.8%" },
    indexB: { label: "KOSDAQ", value: "680", change: "-0.2%" },
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
    indexA: { label: "S&P 500", value: "5000", change: "+0.4%" },
    indexB: { label: "NASDAQ 100", value: "18000", change: "+0.9%" },
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

const MODE_WEIGHTS: Record<StrategyMode, number[]> = {
  balanced: [0.45, 0.3, 0.15, 0.1],
  alpha: [0.55, 0.25, 0.1, 0.1],
  defensive: [0.25, 0.2, 0.35, 0.2],
};

function applyModeWeight(modules: SignalModule[], mode: StrategyMode): SignalModule[] {
  const weights = MODE_WEIGHTS[mode];
  return modules.map((m, idx) => ({
    ...m,
    weight: Math.round((m.weight * (0.6 + weights[idx] * 2)) / 1.8),
  }));
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

  const shouldSimulate = new URL(request.url).searchParams.get("simulate") === "1";
  const { modules, signalConfidence } = injectSignals(BASE_SIGNAL_MODULES, fallbackMode);
  const { highRiskShare, concentration, weightedPnl } = computeHoldingsRisk(BASE_HOLDINGS);
  const rebalanceSuggestions = computeRebalanceSuggestions(BASE_HOLDINGS, signalConfidence);
  const simulation = shouldSimulate ? simulateRebalance(BASE_HOLDINGS, rebalanceSuggestions) : null;

  const payload = {
    updatedAt: new Date().toISOString(),
    mode: fallbackMode,
    signalConfidence,
    modules,
    markets: BASE_MARKETS,
    holdings: BASE_HOLDINGS,
    watchlist: BASE_WATCH,
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
      positionCount: BASE_HOLDINGS.length,
      volatility: "10.6%",
    },
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
