"use client";

import { useState } from "react";
import { InvestLayout, InvestCard, investUiClass } from "@/components/invest/invest-layout";
import { Info } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

type AnalysisResult = {
  ticker: string;
  name: string;
  price_info?: {
    current: number;
    change_pct: number;
    currency: string;
  };
  score: number;
  synthesis_verdict: string;
  scores: {
    expert: number;
    whale: number;
    macro: number;
    news: number;
  };
  details: {
    expert: string[];
    whale: string[];
    macro: string[];
    news: string[];
  };
  future_value?: {
    prediction: string;
    rationale?: string;
  };
  badges: string[];
  external_consensus?: string;
  explanation?: string; // error message
};

const SCORE_DESCRIPTIONS = {
  ko: {
    expert: "기술적 분석(RSI, 이동평균선)과 재무 건전성을 바탕으로 한 정량적 지표입니다.",
    whale: "기관 투자자와 외국인의 수급 동향을 분석하여 큰 자금의 흐름을 추적합니다.",
    macro: "금리, 환율, 유가 등 거시경제 지표가 해당 기업에 미치는 영향을 평가합니다.",
    news: "최신 뉴스 감성 분석으로 시장 심리를 반영합니다.",
  },
  en: {
    expert: "A quantitative signal based on technicals (RSI, moving averages) and fundamentals.",
    whale: "Tracks institutional and foreign flow to capture large capital movement.",
    macro: "Evaluates macro pressure from rates, FX, and commodity conditions.",
    news: "Reflects market sentiment based on recent news analysis.",
  },
} as const;

export default function InvestSearchPage() {
  const { language } = useLanguage();
  const isKo = language === "ko";
  const text = {
    title: isKo ? "Assets Search" : "Assets Search",
    desc: isKo
      ? "데이터 기반의 참고용 에셋/종목 분석 화면입니다."
      : "A data-driven reference screen for asset and ticker analysis.",
    placeholder: isKo ? "기업명 또는 티커 (예: 삼성전자, Apple, AAPL)" : "Company or ticker (e.g., Samsung, Apple, AAPL)",
    searching: isKo ? "분석 중..." : "Analyzing...",
    search: isKo ? "검색" : "Search",
    introTitle: isKo ? "SHawn-INV: From Zero to Quant" : "SHawn-INV: From Zero to Quant",
    introDesc: isKo
      ? "가격 정보와 함께 주요 지표, 흐름, 뉴스 맥락을 참고용으로 정리합니다."
      : "A reference view that combines price, core indicators, flow, and news context.",
    verdict: isKo ? "참고 판정" : "Reference View",
    marketConsensus: isKo ? "시장 컨센서스" : "Market Consensus",
    quantCard: isKo ? "정량 분석" : "Quantitative Analysis",
    contextCard: isKo ? "정성 컨텍스트" : "Qualitative Context",
    readGuide: isKo ? "결과 읽는 법" : "How to Read This Result",
    bandPrefix: isKo ? "점수 구간" : "Score Band",
    approach: isKo ? "참고 해석" : "Reference Interpretation",
    note: isKo
      ? "참고: 본 결과는 교육·해설용 자료이며 투자 조언이 아닙니다."
      : "Note: This output is for education and commentary only, not investment advice.",
    strategyNote: isKo ? "AI 해설 노트" : "AI Commentary Note",
  };
  const scoreDescriptions = SCORE_DESCRIPTIONS[language];
  const scoreBandGuide = isKo
    ? [
        { label: "80~100", meaning: "강한 관찰 후보", action: "단계적 확인 + 위험 기준 점검" },
        { label: "60~79", meaning: "긍정 신호 우세", action: "작게 확인하고 추세 지속 여부 관찰" },
        { label: "40~59", meaning: "관망 구간", action: "신규 판단보다 관찰 우선" },
        { label: "0~39", meaning: "주의 구간", action: "노출 위험과 데이터 품질 점검" },
      ]
    : [
        { label: "80~100", meaning: "Strong observation candidate", action: "Review gradually with predefined risk checks" },
        { label: "60~79", meaning: "Positive signals leading", action: "Validate trend continuation before any decision" },
        { label: "40~59", meaning: "Watch zone", action: "Observe first rather than making a new decision" },
        { label: "0~39", meaning: "Caution zone", action: "Recheck exposure risk and data quality" },
      ];
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/invest/analyze?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze ticker");
      }
      
      if (data.explanation) {
          setError(data.explanation);
      } else {
          setResult(data);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    if (score >= 20) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <InvestLayout
      currentTab="search"
      title={text.title}
      description={text.desc}
    >
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={text.placeholder}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                {text.searching}
              </span>
            ) : (
              text.search
            )}
          </button>
        </form>

        {error && (
          <div className="mb-8 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400 flex items-center gap-2">
            <Info className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Introduction / Empty State */}
        {!result && !loading && !error && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">{text.introTitle}</h3>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto mb-4">
              {text.introDesc}<br/>
              SHawn Score + 4 core factors (Expert, Whale, Macro, News)
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-zinc-500">
              <span className="px-2 py-1 rounded bg-zinc-800">{isKo ? "#정량분석" : "#Quant"}</span>
              <span className="px-2 py-1 rounded bg-zinc-800">{isKo ? "#실시간데이터" : "#LiveData"}</span>
              <span className="px-2 py-1 rounded bg-zinc-800">{isKo ? "#참고자료" : "#Reference"}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InvestCard>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-2xl font-bold text-white flex items-center gap-2"
                    title={`티커: ${result.ticker}\n종목: ${result.name}`}
                  >
                    {result.name.includes(`(${result.ticker})`) 
                        ? result.name.replace(`(${result.ticker})`, "").trim() 
                        : result.name}
                    <span className="text-sm font-normal text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                      {result.ticker}
                    </span>
                  </h2>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-white tracking-tight">
                      {result.price_info?.currency === "KRW" ? "₩" : "$"}
                      {result.price_info?.current.toLocaleString()}
                    </span>
                    <span
                      className={`text-lg font-medium px-2 py-0.5 rounded ${
                        (result.price_info?.change_pct || 0) >= 0 
                          ? "bg-green-500/10 text-green-400" 
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {(result.price_info?.change_pct || 0) > 0 ? "+" : ""}
                      {(result.price_info?.change_pct || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between md:block md:text-right border-t md:border-t-0 border-zinc-800 pt-4 md:pt-0">
                  <div className="text-sm text-zinc-400 mb-1 flex items-center md:justify-end gap-1">
                    SHawn Score
                  </div>
                  <div className={`text-5xl font-bold tracking-tighter ${getScoreColor(result.score)}`}>
                    {result.score.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.entries(result.scores) as [keyof typeof scoreDescriptions, number][]).map(([key, val]) => (
                  <div key={key} className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-3 text-center transition-colors hover:bg-zinc-800/60">
                    <div className="text-xs uppercase text-zinc-500 mb-1 flex items-center justify-center gap-1">
                      {key}
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(val)}`}>{val.toFixed(0)}</div>
                    <p className="mt-1 text-[11px] text-zinc-500">{scoreDescriptions[key]}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">{text.verdict}</h3>
                <div className="bg-gradient-to-r from-zinc-800 to-zinc-900/50 p-4 rounded-lg border border-zinc-700/50">
                  <p className="text-lg text-zinc-200 font-medium leading-relaxed">
                    {result.synthesis_verdict}
                  </p>
                   {result.external_consensus && (
                       <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400 border-t border-zinc-700/50 pt-3">
                           <span className="font-semibold text-zinc-500">{text.marketConsensus}:</span>
                           {result.external_consensus}
                       </div>
                   )}
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                  {result.badges.map(b => (
                      <span key={b} className="px-2.5 py-1 bg-blue-500/10 text-blue-300 text-xs font-medium rounded-full border border-blue-500/20">
                          {b}
                      </span>
                  ))}
              </div>
            </InvestCard>

            <div className="grid gap-6 md:grid-cols-2">
              <InvestCard title={text.quantCard}>
                <div className="space-y-6">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3 pb-2 border-b border-zinc-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Expert Technicals
                    </h4>
                    <ul className="space-y-2 text-sm text-zinc-400">
                      {result.details.expert.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-zinc-600 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3 pb-2 border-b border-zinc-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      Whale & Flow
                    </h4>
                    <ul className="space-y-2 text-sm text-zinc-400">
                      {result.details.whale.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-zinc-600 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </InvestCard>

              <InvestCard title={text.contextCard}>
                <div className="space-y-6">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3 pb-2 border-b border-zinc-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                      Macro Environment
                    </h4>
                    <ul className="space-y-2 text-sm text-zinc-400">
                      {result.details.macro.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">News & Sentiment</h4>
                    <ul className="space-y-1 text-sm text-zinc-300">
                      {result.details.news.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </InvestCard>
            </div>

            <InvestCard title={text.readGuide}>
              <div className="grid gap-3 md:grid-cols-2">
                {scoreBandGuide.map((row) => (
                  <div key={row.label} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                    <p className="text-xs text-zinc-400">{text.bandPrefix} {row.label}</p>
                    <p className="text-sm font-semibold text-white mt-1">{row.meaning}</p>
                    <p className="text-xs text-zinc-300 mt-1">{text.approach}: {row.action}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {text.note}
              </p>
            </InvestCard>
            
            {result.future_value?.rationale && (
                 <InvestCard title={text.strategyNote}>
                     <div className="prose prose-invert prose-sm max-w-none whitespace-pre-line text-zinc-300">
                         {result.future_value.rationale}
                     </div>
                 </InvestCard>
            )}
          </div>
        )}
      </div>
    </InvestLayout>
  );
}
