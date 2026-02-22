"use client";

import { useState } from "react";
import { InvestLayout, InvestCard, investUiClass } from "@/components/invest/invest-layout";

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

export default function InvestSearchPage() {
  const [ticker, setTicker] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/invest/analyze?ticker=${encodeURIComponent(ticker)}`);
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
      title="Investment Search"
      description="실시간으로 개별 종목을 분석하고 진단합니다."
    >
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter Ticker (e.g., AAPL, 005930.KS)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="mb-8 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <InvestCard>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {result.name.includes(`(${result.ticker})`) 
                        ? result.name.replace(`(${result.ticker})`, "").trim() 
                        : result.name}
                    <span className="ml-2 text-lg text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                        {result.ticker}
                    </span>
                  </h2>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">
                      {result.price_info?.currency === "KRW" ? "₩" : "$"}
                      {result.price_info?.current.toLocaleString()}
                    </span>
                    <span
                      className={`text-lg font-medium ${(result.price_info?.change_pct || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {(result.price_info?.change_pct || 0) > 0 ? "+" : ""}
                      {(result.price_info?.change_pct || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400">SHawn Score</div>
                  <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Object.entries(result.scores).map(([key, val]) => (
                  <div key={key} className="rounded-lg bg-zinc-800/50 p-3 text-center">
                    <div className="text-xs uppercase text-zinc-500">{key}</div>
                    <div className={`text-xl font-bold ${getScoreColor(val)}`}>{val.toFixed(0)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-2">Verdict</h3>
                <p className="text-zinc-300 bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50">
                  {result.synthesis_verdict}
                </p>
                 {result.external_consensus && (
                     <p className="mt-2 text-sm text-zinc-400">
                         External Consensus: {result.external_consensus}
                     </p>
                 )}
              </div>
              
              <div className="mt-6 flex flex-wrap gap-2">
                  {result.badges.map(b => (
                      <span key={b} className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded border border-yellow-500/30">
                          {b}
                      </span>
                  ))}
              </div>
            </InvestCard>

            <div className="grid gap-6 md:grid-cols-2">
              <InvestCard title="Expert & Whale">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Expert Analysis</h4>
                    <ul className="space-y-1 text-sm text-zinc-300">
                      {result.details.expert.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Whale Activity</h4>
                    <ul className="space-y-1 text-sm text-zinc-300">
                      {result.details.whale.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </InvestCard>

              <InvestCard title="Macro & News">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Macro Environment</h4>
                    <ul className="space-y-1 text-sm text-zinc-300">
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
            
            {result.future_value?.rationale && (
                 <InvestCard title="AI Strategy Note">
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
