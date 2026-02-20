import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";

type SignalModule = {
  key: string;
  title: string;
  icon: string;
  subtitle: string;
  weight: number;
  trend: "up" | "down" | "flat";
  checks: string[];
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
  indexA: { label: string; value: string };
  indexB: { label: string; value: string };
  traits: string[];
  allocation: number;
  risk: "Low" | "Medium" | "High";
  palette: {
    from: string;
    to: string;
    border: string;
    text: string;
  };
};

const signalModules: SignalModule[] = [
  {
    key: "expert",
    title: "Expert Score",
    icon: "📊",
    subtitle: "기술 분석 모듈",
    weight: 40,
    trend: "up",
    checks: ["Moving Average", "RSI", "MACD", "지지/저항선"],
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
    checks: ["기관 수급", "대량 거래 패턴", "진입/청산 시그널", "외국인 유입"],
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
    subtitle: "거시 경제 지표",
    weight: 20,
    trend: "down",
    checks: ["GDP", "금리 정책", "인플레이션", "환율 변동"],
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
    subtitle: "이벤트 반응도",
    weight: 10,
    trend: "down",
    checks: ["긍정 뉴스", "부정 뉴스", "중립 판정", "이벤트 임팩트"],
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
    indexA: { label: "KOSPI", value: "2,500" },
    indexB: { label: "KOSDAQ", value: "680" },
    traits: ["2,500+ 종목", "삼성전자/하이닉스", "현대차", "높은 변동성"],
    allocation: 40,
    risk: "High",
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
    indexA: { label: "S&P 500", value: "5,000" },
    indexB: { label: "NASDAQ 100", value: "18,000" },
    traits: ["5,000+ 종목", "AI Tech 중심", "메가 트렌드 수혜", "변동성 제어"],
    allocation: 60,
    risk: "Medium",
    palette: {
      from: "from-blue-900/35",
      to: "to-indigo-900/35",
      border: "border-blue-500/45",
      text: "text-blue-400",
    },
  },
];

const portfolioKPIs = [
  { label: "총 포트폴리오", value: "$5.2M", note: "USD 기준", color: "text-amber-400" },
  { label: "연간 수익률", value: "+15.3%", note: "Sovereign Alpha", color: "text-emerald-400" },
  { label: "포지션 수", value: "24", note: "분산 투자", color: "text-sky-400" },
];

const holdings = [
  { symbol: "AAPL", weight: 0.25, allocation: 12 },
  { symbol: "NVDA", weight: 0.16, allocation: 8 },
  { symbol: "MSFT", weight: 0.15, allocation: 7.5 },
  { symbol: "TSMC", weight: 0.14, allocation: 7 },
  { symbol: "005930.KS", weight: 0.20, allocation: 10 },
];

const trendBadge = {
  up: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  down: "text-rose-300 bg-rose-400/10 border-rose-400/30",
  flat: "text-amber-300 bg-amber-400/10 border-amber-400/30",
} as const;

function Bar({ value, label, accentColor }: { value: number; label: string; accentColor: string }) {
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

export default function InvestmentWorld() {
  const riskLevel = signalModules.reduce((acc, mod) => acc + mod.weight, 0);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <section className="mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <span className="text-4xl">📈</span>
            <h1 className="text-4xl md:text-5xl font-bold">Investment World</h1>
          </div>
          <p className="text-gray-400 text-lg">Dual Quant System × Sovereign Alpha Dashboard</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-sm text-gray-400">운영 모드</p>
              <p className="text-xl font-bold text-white mt-1">Dual Quant v2.1</p>
            </div>
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-sm text-gray-400">가중치 합</p>
              <p className="text-xl font-bold text-white mt-1">{riskLevel}% (모듈 합계)</p>
            </div>
            <div className="rounded-xl bg-gray-900/70 border border-gray-700 p-4">
              <p className="text-sm text-gray-400">업데이트</p>
              <p className="text-xl font-bold text-white mt-1">실시간 지표 뷰</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
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
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${trendBadge[m.trend]}`}
                  >
                    {m.trend === "up" ? "상승" : m.trend === "down" ? "하향" : "보합"}
                  </span>
                </div>
                <Bar value={m.weight} label="Signal Weight" accentColor={m.palette.bar} />
                <ul className="mt-4 space-y-1.5 text-sm text-gray-300">
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

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">🌐 Market Intelligence</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {markets.map((market) => (
              <article
                key={market.region}
                className={`rounded-2xl border ${market.palette.border} bg-gradient-to-br ${market.palette.from} ${market.palette.to} p-6`}
              >
                <h3 className={`text-2xl font-bold ${market.palette.text} mb-4`}>
                  {market.flag} {market.region}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/35 p-3 border border-white/10">
                    <p className="text-xs text-gray-300">{market.indexA.label}</p>
                    <p className={`text-xl font-bold mt-1 ${market.palette.text}`}>{market.indexA.value}</p>
                  </div>
                  <div className="rounded-xl bg-black/35 p-3 border border-white/10">
                    <p className="text-xs text-gray-300">{market.indexB.label}</p>
                    <p className={`text-xl font-bold mt-1 ${market.palette.text}`}>{market.indexB.value}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-black/35 p-4 border border-white/10 text-sm text-gray-300 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">시장 특성</p>
                  <ul className="space-y-1">
                    {market.traits.map((t) => (
                      <li key={`${market.region}-${t}`}>• {t}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>포트폴리오 비중</span>
                    <span className="font-semibold text-white">{market.allocation}%</span>
                  </div>
                  <Bar value={market.allocation} label="Allocation" accentColor="bg-sky-500" />
                  <p className="text-xs text-gray-400">리스크 레벨: <span className={`${market.risk === "High" ? "text-rose-300" : market.risk === "Medium" ? "text-amber-300" : "text-emerald-300"}`}>{market.risk}</span></p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-gray-700 bg-gray-900/50 p-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">💼 Portfolio Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {portfolioKPIs.map((card) => (
                <div key={card.label} className="rounded-xl bg-black/45 border border-gray-700 p-4">
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{card.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-gray-700 p-4 bg-black/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-200">Top Holdings</h3>
                <span className="text-xs text-gray-400">5개 종목 샘플</span>
              </div>
              <div className="space-y-3">
                {holdings.map((h) => (
                  <div key={h.symbol} className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-200">
                      <span>{h.symbol}</span>
                      <span>{h.weight * 100}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${h.allocation}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-700 bg-gray-900/50 p-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">🎯 리스크 룰</h2>
            <ul className="text-sm text-gray-300 space-y-3">
              <li>단일 종목 최대 10%</li>
              <li>최소 10개 종목 분산</li>
              <li>일일 손실 한도 -2%</li>
              <li>월 누적 손실 한도 -8%</li>
              <li>목표 수익 연 15%</li>
            </ul>
            <div className="mt-6 p-4 rounded-xl border border-green-500/30 bg-green-500/5 text-green-200 text-sm">
              상태: 시스템 경고 레벨 - 정상. 시장 변동성 기준으로 현 포지션 유지 권고
            </div>
            <button className="mt-5 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold text-sm">
              전략 리밸런싱 뷰 열기
            </button>
          </aside>
        </section>

        <section className="text-center pb-8">
          <Link href="/">
            <button className="px-8 py-3 bg-gray-500/20 text-gray-300 rounded-lg border border-gray-500/50 hover:border-gray-400 hover:bg-gray-500/30 transition">
              ← 메인으로 돌아가기
            </button>
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
