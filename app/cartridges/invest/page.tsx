"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InvestLayout, investUiClass } from "@/components/invest/invest-layout";
import {
  InvestQuoteKpiCards,
  InvestQuoteKpiNotice,
  type QuoteHealth,
  type QuoteKpiSnapshot,
} from "@/components/invest/invest-kpi-components";

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

type RelativeMetric = {
  symbol: string;
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
  provenance?: {
    sources: string[];
    generatedAt: string;
    refreshRule: string;
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

export default function InvestmentWorld() {
  const [strategy, setStrategy] = useState<StrategyMode>("balanced");
  const [marketFocus, setMarketFocus] = useState<string>("all");
  const [notice, setNotice] = useState<string>("");
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [simulation, setSimulation] = useState<RebalanceSimulation | null>(null);
  const [simulateLoading, setSimulateLoading] = useState<boolean>(false);

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
  }, [strategy]);

  const watchItems =
    marketFocus === "all"
      ? snapshot?.watchlist || []
      : (snapshot?.watchlist || []).filter((item) => item.region === marketFocus);

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
    if (value === "k") return "코어(국내)";
    if (value === "us") return "미국";
    return "전체";
  };

  return (
    <InvestLayout
      currentTab="dashboard"
      title="Investment World"
      description="Dual Quant System × Sovereign Alpha 강화 대시보드"
    >
      <>
        <section className="mb-8">
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            투자 페이지를 단계적으로 통합 중입니다. 리포트 탐색은 <Link href="/market-intelligence" className="underline font-semibold">Market Intelligence</Link>를 기본 허브로 사용하세요.
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">운영 모드</p>
              <p className="text-xl font-bold text-white mt-1">Dual Quant v2.2</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">신호 합의 점수</p>
              <p className="text-xl font-bold text-white mt-1">{snapshot?.signalConfidence ?? 0}%</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">리밸런싱 위험도</p>
              <p className="text-xl font-bold text-white mt-1">{riskSummary ? riskSummary.state : "로딩"}</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">시그널 임계값</p>
              <p className="text-xs text-gray-200 mt-1">Buy: {snapshot?.decisionThresholds?.buy ?? 75} / Hold: {snapshot?.decisionThresholds?.hold?.min ?? 40}-{snapshot?.decisionThresholds?.hold?.max ?? 75} / Trim: {snapshot?.decisionThresholds?.trim ?? 40}</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">신호 가중치</p>
              <p className="text-xl font-bold text-white mt-1">{snapshot?.weights ? `T:${Math.round((snapshot.weights.technical||0)*100)} / F:${Math.round((snapshot.weights.flow||0)*100)} / M:${Math.round((snapshot.weights.macro||0)*100)} / N:${Math.round((snapshot.weights.news||0)*100)}` : "-"}</p>
            </div>
            <div className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
              <p className="text-sm text-gray-400">벤치마크</p>
              <p className="text-xl font-bold text-white mt-1">{snapshot?.benchmark ? `${snapshot.benchmark.KR} / ${snapshot.benchmark.US}` : "-"}</p>
              <p className="text-xs text-gray-500 mt-2">갱신시각: {snapshot ? new Date(snapshot.updatedAt).toLocaleTimeString() : "-"}</p>
            </div>
          </div>
          <InvestQuoteKpiCards snapshot={quoteKpiData} />
          <InvestQuoteKpiNotice snapshot={quoteKpiData} />
        </section>

        <section className="mb-8">
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

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">⚙️ Dual Quant Signal Mix</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {(snapshot?.modules || []).map((m) => (
              <div
                key={m.key}
                className={`rounded-2xl border ${m.palette.border} bg-gradient-to-br ${m.palette.from} ${m.palette.to} p-6`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <p className="text-3xl">{m.icon}</p>
                    <h3 className={`text-xl font-bold ${m.palette.text}`}>{m.title}</h3>
                    <p className="text-xs text-gray-300">{m.subtitle}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${trendBadge[m.trend]}`}>
                    {m.trend === "up" ? "상승" : m.trend === "down" ? "하향" : "보합"}
                  </span>
                </div>
                <ProgressBar value={m.weight} label="Signal Weight" accentColor={m.palette.bar} />
                <p className="mt-3 text-xs text-gray-400">신뢰도 {m.confidence}%</p>
                <p className="mt-2 text-sm text-gray-300">추천 액션: {m.action}</p>
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

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
          <div className="lg:col-span-2 rounded-2xl border border-gray-700 bg-gray-900/50 p-6">
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
                        <span>{h.symbol}</span>
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
                      <p className="font-semibold text-white">{sugg.symbol}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${suggestionBadge[sugg.action]}`}>
                        {sugg.action === "up" ? "증가" : sugg.action === "down" ? "감소" : "보유"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">변경 폭: {sugg.deltaPct}%</p>
                    <p className="text-sm text-gray-300 mt-1">{sugg.reason}</p>
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
                        <span className="font-semibold text-white">{change.symbol}</span>
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

          <aside className="rounded-2xl border border-gray-700 bg-gray-900/50 p-6 space-y-4">
            <h2 className="text-2xl font-bold text-yellow-400">🎯 Watchlist / 알림</h2>
            <div className="flex gap-2">
              <select
                className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
                value={marketFocus}
                onChange={(e) => setMarketFocus(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="k">국내({getMarketFocusLabel("k")})</option>
                <option value="us">미국({getMarketFocusLabel("us")})</option>
              </select>
              <button
                onClick={() => setNotice(`필터 적용: ${getMarketFocusLabel(marketFocus)}`)}
                className="px-3 rounded border border-gray-700 hover:bg-gray-800/70"
              >
                적용
              </button>
            </div>

            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            {loading ? <p className="text-xs text-gray-400">실시간 데이터를 불러오는 중...</p> : null}
            {snapshot?.provenance ? <p className="text-xs text-gray-500">근거 출처: {snapshot.provenance.sources.join(", ")}</p> : null}

            <div className="space-y-3">
              {watchItems.map((item) => (
                <div key={`${item.symbol}-${item.region}`} className="rounded-lg border border-gray-700 bg-black/35 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white">{item.symbol}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${signalBadge[item.signal]}`}>{item.signal}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{item.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.catalyst}</p>
                  <p className={`text-sm mt-2 ${formatScore(item.score)}`}>점수 {item.score}</p>
                  {item.rationale ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[10px] px-2 py-0.5 rounded border border-blue-400/30 text-blue-300">{item.signal}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded border border-gray-500/30 text-gray-300">{item.rationale}</span>
                        </div>
                      ) : null}
                </div>
              ))}
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
