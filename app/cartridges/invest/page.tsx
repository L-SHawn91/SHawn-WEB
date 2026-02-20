"use client";

import { Footer } from "@/components/ui/footer";
import { Header } from "@/components/ui/header";
import Link from "next/link";
import { useMemo, useState } from "react";

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
};

const strategyModes: { id: StrategyMode; label: string; note: string }[] = [
  { id: "balanced", label: "Balanced", note: "리스크/수익 균형" },
  { id: "alpha", label: "Alpha Focus", note: "초과수익 우선" },
  { id: "defensive", label: "Defensive", note: "변동성 축소 우선" },
];

const signalModules: SignalModule[] = [
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

const markets: MarketCard[] = [
  {
    region: "Korea Market",
    flag: "🇰🇷",
    indexA: { label: "KOSPI", value: "2,500", change: "+0.8%" },
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
    indexA: { label: "S&P 500", value: "5,000", change: "+0.4%" },
    indexB: { label: "NASDAQ 100", value: "18,000", change: "+0.9%" },
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

const holdings: Holding[] = [
  { symbol: "AAPL", allocation: 12, pnl: 4.8, beta: 1.15, risk: "Medium" },
  { symbol: "NVDA", allocation: 8, pnl: 11.2, beta: 1.52, risk: "High" },
  { symbol: "MSFT", allocation: 7.5, pnl: 7.1, beta: 0.98, risk: "Medium" },
  { symbol: "TSMC", allocation: 7, pnl: 3.2, beta: 1.12, risk: "Medium" },
  { symbol: "005930.KS", allocation: 10, pnl: 2.6, beta: 1.38, risk: "High" },
  { symbol: "GOOGL", allocation: 6.5, pnl: -0.9, beta: 1.08, risk: "Medium" },
];

type WatchItemEx = WatchItem & { region: "k" | "us"; };

const watchItems: WatchItemEx[] = [
  { symbol: "SMCI", signal: "Buy", score: 88, reason: "AI 데이터센터 실적 개선 기대", catalyst: "분기 실적 가이던스 상향", region: "us" },
  { symbol: "AMZN", signal: "Hold", score: 61, reason: "가격대비 모멘텀 완만", catalyst: "AWS 성장 둔화 완화 징후", region: "us" },
  { symbol: "TSLA", signal: "Trim", score: 46, reason: "고위험 구간 확대", catalyst: "마진 압박 + 자본지출 부담", region: "us" },
];

const kpis = [
  { label: "총 포트폴리오", value: "$5.2M", note: "USD", color: "text-amber-400" },
  { label: "연간 수익률", value: "+15.3%", note: "Sovereign Alpha", color: "text-emerald-400" },
  { label: "변동성(월)", value: "10.6%", note: "중간 위기 구간", color: "text-rose-300" },
  { label: "위험 한도 사용률", value: "72%", note: "24h 기준", color: "text-sky-300" },
];

const trendBadge = {
  up: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  down: "text-rose-300 bg-rose-400/10 border-rose-400/30",
  flat: "text-amber-300 bg-amber-400/10 border-amber-400/30",
} as const;

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

  const riskScore = useMemo(() => {
    const totalHighRisk = holdings.filter((h) => h.risk === "High").reduce((acc, h) => acc + h.allocation, 0);
    const weightedPnl = holdings.reduce((acc, h) => acc + h.allocation * Math.max(-5, Math.min(15, h.pnl)), 0) / 100;
    return {
      concentration: Math.max(...holdings.map((h) => h.allocation)),
      highRiskShare: totalHighRisk,
      pnl: weightedPnl,
      rebalanceDelta: totalHighRisk > 35 ? 1 : 0,
    };
  }, []);

  const filteredWatch = marketFocus === "all" ? watchItems : watchItems.filter((item) => item.region === marketFocus);

  const signalConfidence = useMemo(
    () => Math.round(signalModules.reduce((acc, m) => acc + m.confidence * (m.weight / 100), 0)),
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <section className="mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <span className="text-4xl">📈</span>
            <h1 className="text-4xl md:text-5xl font-bold">Investment World</h1>
          </div>
          <p className="text-gray-400 text-lg">Dual Quant System × Sovereign Alpha 강화 대시보드</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-sm text-gray-400">운영 모드</p>
              <p className="text-xl font-bold text-white mt-1">Dual Quant v2.2</p>
            </div>
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-sm text-gray-400">신호 합의 점수</p>
              <p className="text-xl font-bold text-white mt-1">{signalConfidence}%</p>
            </div>
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-sm text-gray-400">리밸런싱 위험도</p>
              <p className="text-xl font-bold text-white mt-1">{riskScore.rebalanceDelta === 1 ? "경고" : "양호"}</p>
            </div>
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-sm text-gray-400">업데이트</p>
              <p className="text-xl font-bold text-white mt-1">실시간 프리셋 뷰</p>
            </div>
          </div>
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
            {signalModules.map((m) => (
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
          {markets.map((market) => (
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
              {kpis.map((card) => (
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
                {holdings.map((h) => (
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
                <p>최대 집중도: <span className="text-rose-300 font-semibold">{riskScore.concentration}%</span></p>
                <p>고위험 비중: <span className="text-rose-300 font-semibold">{riskScore.highRiskShare}%</span></p>
                <p>가중 PnL(누적): <span className="text-emerald-300 font-semibold">{riskScore.pnl.toFixed(2)}%</span></p>
                <p>리스크 규칙 위반: <span className="text-rose-300 font-semibold">{riskScore.rebalanceDelta ? "감지" : "없음"}</span></p>
              </div>
            </div>
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
                <option value="k">코어(국내)</option>
                <option value="us">미국</option>
              </select>
            </div>
            <div className="space-y-3">
              {filteredWatch.map((item) => (
                <div key={item.symbol} className="rounded-lg border border-gray-700 bg-black/35 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white">{item.symbol}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${signalBadge[item.signal]}`}>{item.signal}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{item.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.catalyst}</p>
                  <p className={`text-sm mt-2 ${formatScore(item.score)}`}>점수 {item.score}</p>
                </div>
              ))}
            </div>
            {notice ? <p className="text-xs text-amber-300 border border-amber-500/40 rounded p-2">{notice}</p> : null}
            <button
              onClick={() => setNotice(`리밸런싱 제안: ${strategy} 모드 기준으로 위험 구간 종목 2개 재배치 권고`) }
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold text-sm"
            >
              전략 리밸런싱 제안 받기
            </button>
            <Link href="/research" className="block">
              <button className="w-full mt-1 py-3 rounded-xl border border-gray-700 hover:bg-gray-800/70 text-sm">
                리서치 모듈 바로가기
              </button>
            </Link>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
