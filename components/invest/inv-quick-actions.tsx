"use client";

import { useState } from "react";
import { InvestCard } from "@/components/invest/invest-layout";

type AnalyzeResponse = {
  ok: boolean;
  status?: string;
  data?: {
    ticker: string;
    signal: string;
    confidence: number;
    price: number;
    thesis?: string[];
    risk?: string[];
    provenance?: {
      source_used?: string;
      drift_alert?: boolean;
    };
  };
  error?: string;
};

type CompareResponse = {
  ok: boolean;
  data?: {
    best?: {
      strategy: string;
      alpha: number;
      sharpe: number;
      sortino: number;
    };
  };
  error?: string;
};

export function InvQuickActions() {
  const [ticker, setTicker] = useState("AAPL");
  const [loading, setLoading] = useState<"analyze" | "backtest" | "compare" | "nl" | "">("");
  const [error, setError] = useState("");
  const [nlInput, setNlInput] = useState("애플 백테스트 해줘");
  const [normalizedCommand, setNormalizedCommand] = useState("");
  const [analyze, setAnalyze] = useState<AnalyzeResponse["data"]>();
  const [backtest, setBacktest] = useState<any>();
  const [compare, setCompare] = useState<CompareResponse["data"]>();

  const onAnalyze = async () => {
    setLoading("analyze");
    setError("");
    try {
      const res = await fetch("/api/inv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, horizon: "swing", risk_profile: "mid" }),
      });
      const json: AnalyzeResponse = await res.json();
      if (!json.ok) throw new Error(json.error || "analyze failed");
      setAnalyze(json.data);
    } catch (e: any) {
      setError(e?.message || "analyze failed");
    } finally {
      setLoading("");
    }
  };

  const onBacktest = async () => {
    setLoading("backtest");
    setError("");
    try {
      const res = await fetch("/api/inv/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          strategy: "ema_cross",
          from: "2024-01-01",
          to: "2026-02-27",
          benchmark: "^GSPC",
          fees_bps: 10,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "backtest failed");
      setBacktest(json.data);
    } catch (e: any) {
      setError(e?.message || "backtest failed");
    } finally {
      setLoading("");
    }
  };

  const onCompare = async () => {
    setLoading("compare");
    setError("");
    try {
      const res = await fetch("/api/inv/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          from: "2024-01-01",
          to: "2026-02-27",
          benchmark: "^GSPC",
          fees_bps: 10,
        }),
      });
      const json: CompareResponse = await res.json();
      if (!json.ok) throw new Error(json.error || "compare failed");
      setCompare(json.data);
    } catch (e: any) {
      setError(e?.message || "compare failed");
    } finally {
      setLoading("");
    }
  };

  const onRunNaturalLanguage = async () => {
    setLoading("nl");
    setError("");
    setNormalizedCommand("");
    try {
      const res = await fetch("/api/inv/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nlInput }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "natural language parse failed");
      setNormalizedCommand(json.commandText || "");
      if (json.mode === "analyze") setAnalyze(json.data);
      if (json.mode === "backtest") setBacktest(json.data);
      if (json.mode === "compare") setCompare(json.data);
    } catch (e: any) {
      setError(e?.message || "natural language parse failed");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="grid gap-4">
      <InvestCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ticker (e.g. AAPL, 005930.KS)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={onAnalyze} className="rounded-lg border border-blue-500/40 px-3 py-2 text-xs">
              {loading === "analyze" ? "Analyzing..." : "Analyze"}
            </button>
            <button onClick={onBacktest} className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs">
              {loading === "backtest" ? "Backtesting..." : "Backtest"}
            </button>
            <button onClick={onCompare} className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs">
              {loading === "compare" ? "Comparing..." : "Compare"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <input
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            placeholder="자연어 요청 (예: 애플 백테스트 해줘)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <div>
            <button onClick={onRunNaturalLanguage} className="rounded-lg border border-violet-500/40 px-3 py-2 text-xs">
              {loading === "nl" ? "Running..." : "Run Natural Language"}
            </button>
          </div>
          {normalizedCommand ? <p className="text-xs text-zinc-400">정규화 명령: {normalizedCommand}</p> : null}
        </div>

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </InvestCard>

      {analyze ? (
        <InvestCard>
          <h3 className="text-sm font-semibold">Analyze Result · {analyze.ticker}</h3>
          <p className="mt-1 text-sm">
            Signal: <b>{analyze.signal}</b> / Confidence: {analyze.confidence} / Price: {analyze.price}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Source: {analyze.provenance?.source_used || "n/a"} · Drift: {String(analyze.provenance?.drift_alert)}
          </p>
        </InvestCard>
      ) : null}

      {backtest ? (
        <InvestCard>
          <h3 className="text-sm font-semibold">Backtest Result · {backtest.ticker}</h3>
          <p className="mt-1 text-sm">
            CAGR {backtest.metrics?.cagr} / MDD {backtest.metrics?.max_drawdown} / Sharpe {backtest.metrics?.sharpe} / Alpha {backtest.vs_benchmark?.alpha}
          </p>
        </InvestCard>
      ) : null}

      {compare?.best ? (
        <InvestCard>
          <h3 className="text-sm font-semibold">Compare Result · Best Strategy</h3>
          <p className="mt-1 text-sm">
            {compare.best.strategy} (alpha {compare.best.alpha}, sharpe {compare.best.sharpe}, sortino {compare.best.sortino})
          </p>
        </InvestCard>
      ) : null}
    </div>
  );
}
