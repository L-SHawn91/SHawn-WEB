"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { InvestLayout, investUiClass } from "@/components/invest/invest-layout";
import { useLanguage } from "@/components/providers/language-provider";
import {
  InvestQuoteKpiCards,
  InvestQuoteKpiNotice,
  type QuoteHealth,
  type QuoteKpiSnapshot,
} from "@/components/invest/invest-kpi-components";
import { InvestSignalConfidenceCard } from "@/components/invest/invest-confidence-card";

type SignalTrend = "up" | "down" | "flat";
type RiskLevel = "Low" | "Medium" | "High";
type StrategyMode = "balanced" | "alpha" | "defensive";
type SignalAction = "Buy" | "Hold" | "Trim";

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
  name?: string;
  allocation: number;
  pnl: number;
  beta: number;
  risk: RiskLevel;
};

type WatchItem = {
  symbol: string;
  name?: string;
  signal: SignalAction;
  score: number;
  reason: string;
  catalyst: string;
  region: "k" | "us";
  rationale?: string;
};

type RebalanceSuggestion = {
  symbol: string;
  name?: string;
  action: "up" | "down" | "hold";
  deltaPct: number;
  reason: string;
};

type SimulationChange = {
  symbol: string;
  name?: string;
  prevAllocation: number;
  nextAllocation: number;
  direction: "up" | "down";
  deltaPct: number;
};

type RelativeMetric = {
  symbol: string;
  name?: string;
  alphaVsBenchmark: number;
  beta: number;
  drawdown60d: number;
  momentumScore: number;
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

type SnapshotPayload = {
  updatedAt: string;
  mode: StrategyMode;
  signalConfidence: number;
  quoteSource?: {
    sourceName: string;
    providerPriority: number;
    fetchedAt: string;
    freshnessSec: number;
    fallbackLevel: number;
  };
  quoteHealth?: QuoteHealth;
  driftDetector?: {
    benchmark: { ks: number; us: number; score: number };
    signals: { signalConfidence: number; signalVariance: number; driftScore: number };
    driftScore: number;
    status: "stable" | "unstable";
  };
  weights?: WeightProfile;
  decisionThresholds?: DecisionThresholds;
  upstreamSync?: {
    configured?: boolean;
    attempted?: boolean;
    status?: "success" | "failed" | "disabled";
    origin?: string;
    message?: string;
    httpStatus?: number;
  };
  provenance?: {
    sources: string[];
    generatedAt: string;
    refreshRule: string;
    upstreamFailure?: string;
  };
  benchmark?: { KR: string; US: string; lastUpdated?: string };
  modules: SignalModule[];
  markets: MarketCard[];
  holdings: Holding[];
  watchlist: WatchItem[];
  risk: {
    concentration: number;
    highRiskShare: number;
    weightedPnl: number;
    rebalanceNeed: boolean;
  };
  rebalanceSuggestions: RebalanceSuggestion[];
  simulation: RebalanceSimulation | null;
  reasoning?: { symbol: string; reasons: Array<{module: string; metric: string; value: number | string; impact: "up" | "down" | "neutral"; rationale: string}> }[];
  relatives?: RelativeMetric[];
  kpis: {
    portfolio: string;
    annualReturn: string;
    positionCount: number;
    volatility: string;
  };
};

const strategyModes: { id: StrategyMode; label: string; note: string }[] = [
  { id: "balanced", label: "Balanced", note: "리스크/수익 균형" },
  { id: "alpha", label: "Alpha Focus", note: "초과수익 우선" },
  { id: "defensive", label: "Defensive", note: "변동성 축소 우선" },
];

const trendBadge: Record<SignalTrend, string> = {
  up: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  down: "text-rose-300 bg-rose-400/10 border-rose-400/30",
  flat: "text-amber-300 bg-amber-400/10 border-amber-400/30",
};

const riskText: Record<RiskLevel, string> = {
  Low: "text-emerald-300",
  Medium: "text-amber-300",
  High: "text-rose-300",
};

const signalBadge: Record<SignalAction, string> = {
  Buy: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  Hold: "bg-sky-500/10 text-sky-200 border-sky-500/30",
  Trim: "bg-rose-500/10 text-rose-200 border-rose-500/30",
};

const suggestionBadge: Record<RebalanceSuggestion["action"], string> = {
  up: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
  down: "text-rose-200 bg-rose-500/10 border-rose-400/30",
  hold: "text-sky-200 bg-sky-500/10 border-sky-400/30",
};

const scoreBands = [
  { min: 75, label: "Buy", note: "상승 신호 우위. 분할 매수 검토." },
  { min: 40, label: "Hold", note: "방향성 혼조. 비중 유지/관망." },
  { min: -1, label: "Trim", note: "리스크 우위. 비중 축소 검토." },
];

const moduleExplain: Record<string, string> = {
  expert: "차트·지표·추세를 기반으로 기술적 강도를 평가합니다.",
  whale: "기관/외국인 자금 흐름을 보고 수급 강도를 반영합니다.",
  macro: "금리·환율·지수 환경이 종목에 주는 압력을 반영합니다.",
  news: "최근 뉴스/이슈의 심리 효과를 단기 점수로 반영합니다.",
};

function explainSignal(signal: SignalAction, score: number) {
  if (signal === "Buy") {
    return score >= 75
      ? "강한 매수 후보입니다. 진입은 분할(예: 2~3회)로 나누는 것이 안전합니다."
      : "매수 우위 신호입니다. 단기 변동을 감안해 천천히 비중을 늘리세요.";
  }
  if (signal === "Trim") {
    return "리스크 관리 구간입니다. 급한 전량 매도보다 단계적 축소가 일반적으로 유리합니다.";
  }
  return "관망 구간입니다. 신규 진입보다 기존 비중 유지와 뉴스 확인이 우선입니다.";
}

function explainSuggestion(action: RebalanceSuggestion["action"], deltaPct: number) {
  if (action === "up") return `비중을 약 ${deltaPct}% 늘려 상승 시나리오를 추적하는 제안입니다.`;
  if (action === "down") return `비중을 약 ${deltaPct}% 줄여 변동성/손실 위험을 낮추는 제안입니다.`;
  return "현재 규칙 기준에서 즉시 조정 필요성이 낮다는 의미입니다.";
}

function ProgressBar({ value, label, accentColor }: { value: number; label: string; accentColor: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-300 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{Math.round(value)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className={`${accentColor} h-2 rounded-full`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function formatScore(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-rose-300";
}

function InvestmentWorldContent() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isKo = language === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  const [strategy, setStrategy] = useState<StrategyMode>("balanced");
  const [marketFocus, setMarketFocus] = useState<string>("all");
  const [notice, setNotice] = useState<string>("");
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [simulation, setSimulation] = useState<RebalanceSimulation | null>(null);
  const [simulateLoading, setSimulateLoading] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");

    (async () => {
      try {
        const res = await fetch(`/api/invest/snapshot?mode=${strategy}`, {
          signal: abort.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`요청 실패: ${res.status}`);
        }

        const data = (await res.json()) as SnapshotPayload;
        setSnapshot(data);
        setSimulation(data.simulation ?? null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message || "데이터 로드 실패");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => abort.abort();
  }, [strategy, refreshTick]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const market = String(searchParams.get("market") || "").toLowerCase();
    if (market === "k" || market === "us" || market === "all") {
      setMarketFocus(market);
    }
  }, [searchParams]);

  useEffect(() => {
    const focus = String(searchParams.get("focus") || "").toLowerCase();
    if (!focus) return;

    const sectionMap: Record<string, string> = {
      overview: "invest-overview",
      strategy: "invest-strategy",
      modules: "invest-modules",
      markets: "invest-markets",
      portfolio: "invest-portfolio",
      watchlist: "invest-watchlist",
    };

    const targetId = sectionMap[focus];
    if (!targetId) return;

    const symbol = String(searchParams.get("symbol") || "").trim().toUpperCase();
    if (focus === "watchlist" && symbol) {
      setNotice(`딥링크 대상 종목: ${symbol}`);
    }

    const timer = setTimeout(() => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const watchItems = useMemo(
    () =>
      marketFocus === "all"
        ? snapshot?.watchlist || []
        : (snapshot?.watchlist || []).filter((item) => item.region === marketFocus),
    [marketFocus, snapshot?.watchlist],
  );
  const focusedSymbol = String(searchParams.get("symbol") || "").trim().toUpperCase();

  useEffect(() => {
    const focus = String(searchParams.get("focus") || "").toLowerCase();
    if (focus !== "watchlist" || !focusedSymbol) return;

    const timer = setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-watch-symbol="${focusedSymbol}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchParams, focusedSymbol, watchItems]);

  const quoteKpiData: QuoteKpiSnapshot | undefined = snapshot
    ? {
        quoteHealth: snapshot.quoteHealth,
        quoteSource: snapshot.quoteSource,
        driftDetector: snapshot.driftDetector
          ? {
              driftScore: snapshot.driftDetector.driftScore,
              status: snapshot.driftDetector.status,
            }
          : undefined,
        upstreamSync: snapshot.upstreamSync,
        provenance: snapshot.provenance,
      }
    : undefined;

  const riskSummary = snapshot?.risk
    ? {
        concentration: snapshot.risk.concentration,
        highRiskShare: snapshot.risk.highRiskShare,
        weightedPnl: snapshot.risk.weightedPnl,
        state: snapshot.risk.rebalanceNeed ? "경고" : "양호",
      }
    : null;

  const runRebalanceSimulation = async () => {
    if (!snapshot) return;
    setSimulateLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/invest/snapshot?mode=${strategy}&simulate=1`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`시뮬레이션 요청 실패: ${res.status}`);
      }
      const data = (await res.json()) as SnapshotPayload;
      setSimulation(data.simulation || null);
      setNotice(`시뮬레이션 완료: 제안 반영 ${data.simulation?.changes.length || 0}건`);
    } catch (e) {
      setError((e as Error).message || "시뮬레이션 실패");
    } finally {
      setSimulateLoading(false);
    }
  };

  const getSimulatedHoldings = simulation?.projectedHoldings || null;

  const riskSummarySim = simulation ? {
    concentration: simulation.risk.concentration,
    highRiskShare: simulation.risk.highRiskShare,
    weightedPnl: simulation.risk.weightedPnl,
    state: simulation.risk.highRiskShare >= 20 ? "경고" : "양호",
  } : null;

  const kpiCards = snapshot
    ? [
        { label: "총 포트폴리오", value: snapshot.kpis.portfolio, note: "USD", color: "text-amber-400" },
        { label: "연간 수익률", value: snapshot.kpis.annualReturn, note: "Sovereign Alpha", color: "text-emerald-400" },
        { label: "포지션 수", value: `${snapshot.kpis.positionCount}`, note: "분산 투자", color: "text-sky-400" },
        { label: "변동성(월)", value: snapshot.kpis.volatility, note: "중간 위기 구간", color: "text-rose-300" },
      ]
    : [];

  const getMarketFocusLabel = (value: string) => {
    if (value === "k") return tr("코어(국내)", "Core (KR)");
    if (value === "us") return tr("미국", "US");
    return tr("전체", "All");
  };

  const renderInstrumentLabel = (symbol: string, name?: string) => {
    const rawName = String(name || "").trim();
    const token = `(${symbol})`;
    if (!rawName) return symbol;
    if (rawName.includes(token)) return rawName.replace(token, "").trim() || symbol;
    return rawName;
  };

  return (
    <InvestLayout
      currentTab="dashboard"
      title="Investment World"
      description={tr("Dual Quant System × Sovereign Alpha 강화 대시보드", "Enhanced dashboard powered by Dual Quant System × Sovereign Alpha")}
    >
      <>
        <section id="invest-overview" className="mb-8">
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {tr("통합 운영은 ", "Start from ")}<Link href="/invest" className="underline font-semibold">Investment Command Center</Link>{tr("에서 시작하고, 이 페이지는 시그널/리밸런싱 상세 점검에 사용하세요.", ", then use this page for deep signal/rebalancing checks.")}
          </div>
          <div className="mt-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
            <p className="text-sm font-semibold text-sky-200">{tr("핵심 확인 순서", "Quick check order")}</p>
            <p className="mt-2 text-xs text-gray-200">
              {tr(
                "신호 점수 → 모듈 원인 → Watchlist 근거 → 리밸런싱 시뮬레이션 순으로 점검하면 중복 확인 없이 빠르게 의사결정할 수 있습니다.",
                "Signal score -> module drivers -> watchlist rationale -> rebalance simulation. This flow minimizes duplicate checks.",
              )}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">{tr("운영 모드", "Mode")}</p>
              <p className="text-xl font-bold text-white mt-1">Dual Quant v2.2</p>
            </div>
            <InvestSignalConfidenceCard confidence={snapshot?.signalConfidence} updatedAt={snapshot?.updatedAt} compact />
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">{tr("리밸런싱 위험도", "Rebalancing Risk")}</p>
              <p className="text-xl font-bold text-white mt-1">{riskSummary ? riskSummary.state : tr("로딩", "Loading")}</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">{tr("시그널 임계값", "Signal Thresholds")}</p>
              <p className="text-xs text-gray-200 mt-1">Buy: {snapshot?.decisionThresholds?.buy ?? 75} / Hold: {snapshot?.decisionThresholds?.hold?.min ?? 40}-{snapshot?.decisionThresholds?.hold?.max ?? 75} / Trim: {snapshot?.decisionThresholds?.trim ?? 40}</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">{tr("신호 가중치", "Signal Weights")}</p>
              <p className="text-xl font-bold text-white mt-1">{snapshot?.weights ? `T:${Math.round((snapshot.weights.technical||0)*100)} / F:${Math.round((snapshot.weights.flow||0)*100)} / M:${Math.round((snapshot.weights.macro||0)*100)} / N:${Math.round((snapshot.weights.news||0)*100)}` : "-"}</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">{tr("벤치마크", "Benchmark")}</p>
              <p className="text-xl font-bold text-white mt-1">{snapshot?.benchmark ? `${snapshot.benchmark.KR} / ${snapshot.benchmark.US}` : "-"}</p>
              <p className="text-xs text-gray-500 mt-2">{tr("갱신시각", "Updated")}: {snapshot ? new Date(snapshot.updatedAt).toLocaleTimeString() : "-"}</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">{tr("데이터 갱신", "Data Refresh")}</p>
              <button
                onClick={() => setRefreshTick((prev) => prev + 1)}
                className="mt-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20"
              >
                {tr("지금 새로고침", "Refresh Now")}
              </button>
              <p className="mt-2 text-xs text-gray-500">{tr("60초마다 자동 갱신", "Auto-refresh every 60s")}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/50 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400">점수 해석 기준</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {scoreBands.map((band) => (
                <div key={band.label} className="rounded-lg border border-gray-700 bg-black/30 p-3">
                  <p className="text-sm font-semibold text-white">{band.label}</p>
                  <p className="text-xs text-gray-400 mt-1">기준: {band.label === "Buy" ? "75 이상" : band.label === "Hold" ? "40~74" : "39 이하"}</p>
                  <p className="text-xs text-gray-300 mt-1">{band.note}</p>
                </div>
              ))}
            </div>
          </div>
          <InvestQuoteKpiCards snapshot={quoteKpiData} />
          <InvestQuoteKpiNotice snapshot={quoteKpiData} />
            <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/cartridges/invest?focus=strategy" className={investUiClass.actionButtonDefault}>{tr("전략", "Strategy")}</Link>
            <Link href="/cartridges/invest?focus=modules" className={investUiClass.actionButtonDefault}>{tr("모듈", "Modules")}</Link>
            <Link href="/cartridges/invest?focus=portfolio" className={investUiClass.actionButtonDefault}>{tr("포트폴리오", "Portfolio")}</Link>
            <Link href="/cartridges/invest?focus=watchlist" className={investUiClass.actionButtonDefault}>{tr("워치리스트", "Watchlist")}</Link>
          </div>
        </section>

        <section id="invest-strategy" className="mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">⚙️ 전략 모드</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {strategyModes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setStrategy(m.id);
                  setNotice(`${m.label} 모드로 전환했습니다.`);
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  strategy === m.id
                    ? "border-amber-400 bg-amber-500/10"
                    : "border-gray-700 bg-gray-900/50 hover:bg-gray-800/60"
                }`}
              >
                <p className="font-semibold text-white">{m.label}</p>
                <p className="text-sm text-gray-400 mt-1">{m.note}</p>
              </button>
            ))}
          </div>
        </section>

        <section id="invest-modules" className="mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">⚙️ Dual Quant Signal Mix</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {(snapshot?.modules || []).map((m) => (
              <div
                key={m.key}
                className={`rounded-2xl border ${m.palette.border} bg-gradient-to-br ${m.palette.from} ${m.palette.to} p-6`}
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-3xl">{m.icon}</p>
                    <h3 className={`text-xl font-bold ${m.palette.text}`}>{m.title}</h3>
                    <p className="text-xs text-gray-300">{m.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    <span className={`text-xs px-2 py-1 rounded-full border ${trendBadge[m.trend]}`}>
                      {m.trend === "up" ? "상승" : m.trend === "down" ? "하향" : "보합"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full border border-white/20 bg-white/5 text-gray-200">
                      신뢰도 {m.confidence}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={m.weight} label="Signal Weight" accentColor={m.palette.bar} />
                <p className="mt-2 text-sm text-gray-300">추천 액션: {m.action}</p>
                <p className="mt-1 text-xs text-gray-400">{moduleExplain[m.key] || "모듈 설명 데이터 준비 중"}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
                  {m.checks.map((c) => (
                    <li key={`${m.key}-${c}`} className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="invest-markets" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {(snapshot?.markets || []).map((market) => (
            <article
              key={market.region}
              className={`rounded-2xl border ${market.palette.border} bg-gradient-to-br ${market.palette.from} ${market.palette.to} p-6`}
            >
              <div className="flex items-start justify-between">
                <h3 className={`text-2xl font-bold ${market.palette.text}`}>
                  {market.flag} {market.region}
                </h3>
                <span className="text-xs px-2 py-1 rounded border border-white/15 text-gray-300">
                  유동성 {market.liquidity}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-black/35 p-3 border border-white/10">
                  <p className="text-xs text-gray-300">{market.indexA.label}</p>
                  <p className={`text-xl font-bold mt-1 ${market.palette.text}`}>{market.indexA.value}</p>
                  <p className={`text-xs mt-1 ${market.indexA.change.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>
                    {market.indexA.change}
                  </p>
                </div>
                <div className="rounded-xl bg-black/35 p-3 border border-white/10">
                  <p className="text-xs text-gray-300">{market.indexB.label}</p>
                  <p className={`text-xl font-bold mt-1 ${market.palette.text}`}>{market.indexB.value}</p>
                  <p className={`text-xs mt-1 ${market.indexB.change.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>
                    {market.indexB.change}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-black/35 p-4 border border-white/10 text-sm text-gray-300 space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">시장 특성</p>
                {market.traits.map((t) => (
                  <p key={`${market.region}-${t}`}>• {t}</p>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>포트폴리오 비중</span>
                  <span className="font-semibold text-white">{market.allocation}%</span>
                </div>
                <ProgressBar value={market.allocation} label="Allocation" accentColor="bg-sky-500" />
                <p className="text-xs text-gray-400">
                  리스크 레벨: <span className={riskText[market.risk]}>{market.risk}</span>
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div id="invest-portfolio" className="lg:col-span-2 rounded-2xl border border-gray-700 bg-gray-900/50 p-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">💼 포트폴리오</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((card) => (
                <div key={card.label} className="rounded-xl bg-black/45 border border-gray-700 p-4">
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className={`text-2xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{card.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-gray-700 p-4 bg-black/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-200">Top Holdings</h3>
                <span className="text-xs text-gray-400">실시간 비중 샘플</span>
              </div>
              <div className="space-y-3">
                {(getSimulatedHoldings || snapshot?.holdings || []).map((h) => (
                  <div key={h.symbol} className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{renderInstrumentLabel(h.symbol, h.name)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskText[h.risk]}`}>{h.risk}</span>
                      </div>
                      <span className="text-xs text-gray-400">β {h.beta.toFixed(2)} / PnL {h.pnl.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={h.allocation} label={`비중 ${h.allocation}%`} accentColor="bg-indigo-500" />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-300">
                <p>
                  최대 집중도: <span className="text-rose-300 font-semibold">{riskSummary?.concentration ?? 0}%</span>
                </p>
                <p>
                  고위험 비중: <span className="text-rose-300 font-semibold">{riskSummary?.highRiskShare ?? 0}%</span>
                </p>
                <p>
                  가중 PnL(누적): <span className="text-emerald-300 font-semibold">{riskSummary?.weightedPnl?.toFixed(2) ?? 0}%</span>
                </p>
                <p>
                  리스크 규칙 위반: <span className="text-rose-300 font-semibold">{riskSummary && riskSummary.state === "경고" ? "감지" : "없음"}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-700 p-4">
              <p className="text-sm font-semibold text-gray-100 mb-3">리밸런싱 제안</p>
              <div className="space-y-2">
                {(snapshot?.rebalanceSuggestions || []).map((sugg) => (
                  <div key={`${sugg.symbol}-${sugg.action}`} className="rounded-lg border border-gray-700 bg-black/35 p-3">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-semibold text-white">
                        {renderInstrumentLabel(sugg.symbol, sugg.name)}
                      </p>
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${suggestionBadge[sugg.action]}`}>
                        {sugg.action === "up" ? "증가" : sugg.action === "down" ? "감소" : "보유"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">변경 폭: {sugg.deltaPct}%</p>
                    <p className="text-sm text-gray-300 mt-1">{sugg.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">{explainSuggestion(sugg.action, sugg.deltaPct)}</p>
                  </div>
                ))}
              </div>
            </div>

            {simulation ? (
              <div className="mt-6 rounded-xl border border-gray-700 p-4 bg-black/40">
                <p className="text-sm font-semibold text-gray-100 mb-3">시뮬레이션 반영 결과</p>
                <div className="space-y-2">
                  {(simulation.changes.length > 0 ? simulation.changes : []).map((change) => (
                    <div key={`${change.symbol}-${change.direction}`} className="rounded-lg border border-gray-700 bg-black/35 p-3">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-white">
                          {renderInstrumentLabel(change.symbol, change.name)}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded border ${
                            change.direction === "up"
                              ? "text-emerald-200 bg-emerald-500/10 border-emerald-400/30"
                              : "text-rose-200 bg-rose-500/10 border-rose-400/30"
                          }`}
                        >
                          {change.direction === "up" ? "+" : "-"}{change.deltaPct.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{change.prevAllocation.toFixed(2)}% → {change.nextAllocation.toFixed(2)}%</p>
                    </div>
                  ))}
                  {simulation.changes.length === 0 ? <p className="text-xs text-gray-400">변경 대상이 없어 초기 비중 유지</p> : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-300">
                  <p>
                    시뮬레이션 최대 집중도: <span className="text-rose-300 font-semibold">{riskSummarySim?.concentration ?? 0}%</span>
                  </p>
                  <p>
                    시뮬레이션 고위험 비중: <span className="text-rose-300 font-semibold">{riskSummarySim?.highRiskShare ?? 0}%</span>
                  </p>
                  <p>
                    시뮬레이션 가중 PnL: <span className="text-emerald-300 font-semibold">{riskSummarySim?.weightedPnl.toFixed(2) ?? 0}%</span>
                  </p>
                  <p>
                    시뮬레이션 규칙 위반: <span className="text-rose-300 font-semibold">{riskSummarySim && riskSummarySim.state === "경고" ? "감지" : "없음"}</span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <aside id="invest-watchlist" className="rounded-2xl border border-gray-700 bg-gray-900/50 p-6 space-y-4">
            <h2 className="text-2xl font-bold text-yellow-400">🎯 Watchlist / 알림</h2>
            <div className="flex gap-2">
              <select
                className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
                value={marketFocus}
                onChange={(e) => {
                  const next = e.target.value;
                  setMarketFocus(next);
                  setNotice(tr("필터 적용: ", "Filter applied: ") + getMarketFocusLabel(next));
                }}
              >
                <option value="all">{tr("전체", "All")}</option>
                <option value="k">{tr("국내", "KR Core")}</option>
                <option value="us">US</option>
              </select>
            </div>

            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            {loading ? <p className="text-xs text-gray-400">실시간 데이터를 불러오는 중...</p> : null}
            {snapshot?.provenance ? <p className="text-xs text-gray-500">근거 출처: {snapshot.provenance.sources.join(", ")}</p> : null}
            <div className="rounded-lg border border-gray-700 bg-black/30 p-3">
              <p className="text-xs font-semibold text-gray-200">{tr("핵심 용어", "Key terms")}</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-400">
                <li>{tr("• Signal: 현재 종목 행동 권고(Buy/Hold/Trim)", "• Signal: current action suggestion (Buy/Hold/Trim)")}</li>
                <li>{tr("• Catalyst: 점수 변화의 핵심 이벤트", "• Catalyst: primary event behind score changes")}</li>
                <li>{tr("• Rationale: 판단 근거 요약", "• Rationale: concise decision evidence")}</li>
                <li>{tr("• Beta: 시장 변동 대비 민감도", "• Beta: sensitivity versus market moves")}</li>
              </ul>
            </div>

            <div className="space-y-3">
              {watchItems.map((item) => {
                const watchSymbol = String(item.symbol || "").trim().toUpperCase();
                const isFocused = Boolean(focusedSymbol) && watchSymbol === focusedSymbol;
                return (
                <div
                  key={`${item.symbol}-${item.region}`}
                  data-watch-symbol={watchSymbol}
                  className={`rounded-lg border p-3 ${
                    isFocused
                      ? "border-amber-300/70 bg-amber-500/15 shadow-[0_0_0_1px_rgba(252,211,77,0.4)]"
                      : "border-gray-700 bg-black/35"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white">
                      {renderInstrumentLabel(item.symbol, item.name)}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${signalBadge[item.signal]}`}>{item.signal}</span>
                  </div>
                  {isFocused ? <p className="mt-1 text-[11px] font-semibold text-amber-200">선택된 종목</p> : null}
                  <p className="text-sm text-gray-300 mt-1">{item.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.catalyst}</p>
                  <p className={`text-sm mt-2 ${formatScore(item.score)}`}>점수 {item.score}</p>
                  <p className="text-xs text-gray-400 mt-1">{explainSignal(item.signal, item.score)}</p>
                  {item.rationale ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[10px] px-2 py-0.5 rounded border border-blue-400/30 text-blue-300">{item.signal}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded border border-gray-500/30 text-gray-300">{item.rationale}</span>
                        </div>
                      ) : null}
                </div>
              )})}
            </div>

            {notice ? <p className="text-xs text-amber-300 border border-amber-500/40 rounded p-2">{notice}</p> : null}
            <button
              onClick={runRebalanceSimulation}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold text-sm"
            >{simulateLoading ? "시뮬레이션 실행 중..." : "전략 리밸런싱 시뮬레이션"}
            </button>
            <Link href="/research" className="block">
              <button className="w-full mt-1 py-3 rounded-xl border border-gray-700 hover:bg-gray-800/70 text-sm">
                리서치 모듈 바로가기
              </button>
            </Link>
          </aside>
        </section>
      </>
    </InvestLayout>
  );
}

export default function InvestmentWorld() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white">
          <div className="mx-auto max-w-7xl px-6 py-16 text-sm text-gray-400">Loading investment dashboard...</div>
        </div>
      }
    >
      <InvestmentWorldContent />
    </Suspense>
  );
}
