"use client";

import { investUiClass } from "@/components/invest/invest-layout";

export type QuoteHealth = "ok" | "degraded" | "fallback";
export type DriftState = "stable" | "unstable";

export const INVEST_STALE_FRESHNESS_SEC = 3_600;

export type QuoteSourceSnapshot = {
  sourceName?: string;
  freshnessSec?: number;
  fallbackLevel?: number;
};

export type DriftSnapshot = {
  driftScore?: number;
  status?: DriftState;
};

export type QuoteKpiSnapshot = {
  quoteHealth?: QuoteHealth;
  quoteSource?: QuoteSourceSnapshot;
  driftDetector?: DriftSnapshot;
  provenance?: {
    sources?: string[];
  };
};

export type QuoteKpiState = {
  quoteHealth: QuoteHealth;
  quoteHealthLabel: string;
  quoteHealthClass: string;
  freshnessText: string;
  freshnessClass: string;
  driftScore: number | null;
  driftState: DriftState;
  driftStateLabel: string;
  driftStateClass: string;
  sourceName: string;
  fallbackLevel: number;
  isFallbackQuote: boolean;
  isStaleQuote: boolean;
};

const quoteHealthMap: Record<QuoteHealth, { label: string; badgeClass: string }> = {
  ok: {
    label: "정상",
    badgeClass: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
  },
  degraded: {
    label: "열화",
    badgeClass: "text-amber-200 bg-amber-500/10 border-amber-400/30",
  },
  fallback: {
    label: "폴백",
    badgeClass: "text-rose-200 bg-rose-500/10 border-rose-400/30",
  },
};

export function formatFreshness(sec?: number | null) {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec < 0) return "-";
  const minutes = Math.floor(sec / 60);
  if (sec < 60) return `${sec}s`;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function deriveQuoteHealth(input: QuoteKpiSnapshot, staleThresholdSec: number): QuoteKpiState {
  const isFallbackQuote =
    input.quoteHealth === "fallback" ||
    (input.quoteSource?.fallbackLevel ?? 0) > 0 ||
    (input.provenance?.sources || []).some((source) => source.includes("fallback/static"));

  const freshnessSec = input.quoteSource?.freshnessSec;
  const isStaleQuote =
    typeof freshnessSec === "number" && Number.isFinite(freshnessSec) ? freshnessSec > staleThresholdSec : false;

  const fallbackState: QuoteHealth = isFallbackQuote ? "fallback" : input.quoteHealth ?? "ok";

  const freshnessClass =
    freshnessSec === undefined
      ? "text-gray-300 bg-gray-500/10 border-gray-400/20"
      : isStaleQuote
      ? "text-rose-200 bg-rose-500/10 border-rose-400/30"
      : freshnessSec <= staleThresholdSec / 2
      ? "text-emerald-200 bg-emerald-500/10 border-emerald-400/30"
      : "text-amber-200 bg-amber-500/10 border-amber-400/30";

  const driftScore =
    input.driftDetector?.driftScore !== undefined ? Number(input.driftDetector.driftScore) : null;
  const driftState =
    input.driftDetector?.status ?? (typeof driftScore === "number" && driftScore >= 40 ? "unstable" : "stable");

  return {
    quoteHealth: fallbackState,
    quoteHealthLabel: quoteHealthMap[fallbackState].label,
    quoteHealthClass: quoteHealthMap[fallbackState].badgeClass,
    freshnessText: formatFreshness(freshnessSec),
    freshnessClass,
    driftScore,
    driftState,
    driftStateLabel: driftState === "stable" ? "안정" : "변동",
    driftStateClass:
      driftState === "stable"
        ? "text-emerald-200 bg-emerald-500/10 border-emerald-400/30"
        : "text-rose-200 bg-rose-500/10 border-rose-400/30",
    sourceName: input.quoteSource?.sourceName ?? "-",
    fallbackLevel: input.quoteSource?.fallbackLevel ?? 0,
    isFallbackQuote,
    isStaleQuote,
  };
}

export function InvestQuoteKpiCards({
  snapshot,
  staleThresholdSec = INVEST_STALE_FRESHNESS_SEC,
}: {
  snapshot?: QuoteKpiSnapshot;
  staleThresholdSec?: number;
}) {
  const state = deriveQuoteHealth(snapshot || {}, staleThresholdSec);

  return (
    <div className={`${investUiClass.grid} md:grid-cols-3`}> 
      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-400 mb-1">Quote Health</p>
        <p className={`text-2xl font-bold ${state.quoteHealth === "ok" ? "text-emerald-300" : state.quoteHealth === "degraded" ? "text-amber-300" : "text-rose-300"}`}>
          {state.quoteHealthLabel}
        </p>
        <p className={`mt-2 text-[10px] inline-flex items-center rounded border ${state.quoteHealthClass}`}>헬스 코드: {state.quoteHealth}</p>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-400 mb-1">Freshness</p>
        <p className="text-2xl font-bold text-blue-300">{state.freshnessText}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          <span className={`inline-flex items-center rounded border ${state.freshnessClass}`}>소스: {state.sourceName}</span>
          <span className={`inline-flex items-center rounded border ${state.freshnessClass}`}>Fallback: {state.fallbackLevel}</span>
        </div>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-400 mb-1">Drift Score</p>
        <p className={`text-2xl font-bold ${state.driftState === "stable" ? "text-emerald-300" : "text-rose-300"}`}>
          {state.driftScore === null ? "-" : `${state.driftScore.toFixed(2)} / 100`}
        </p>
        <p className={`mt-2 text-[10px] inline-flex items-center rounded border ${state.driftStateClass}`}>
          시장 드리프트: {state.driftStateLabel}
        </p>
      </article>
    </div>
  );
}

export function InvestQuoteKpiNotice({
  snapshot,
  staleThresholdSec = INVEST_STALE_FRESHNESS_SEC,
}: {
  snapshot?: QuoteKpiSnapshot;
  staleThresholdSec?: number;
}) {
  const state = deriveQuoteHealth(snapshot || {}, staleThresholdSec);

  if (!state.isFallbackQuote && !state.isStaleQuote) return null;

  return (
    <div className="mt-3 space-y-2">
      {state.isFallbackQuote ? (
        <p className="text-xs text-amber-200 border border-amber-500/40 rounded p-2">
          폴백: 실시간 지수 공급자가 폴백 모드로 동작하고 있습니다. 원본 공급자 복구 또는 대체 공급자 연결 상태를 확인하세요.
        </p>
      ) : null}
      {state.isStaleQuote ? (
        <p className="text-xs text-rose-200 border border-rose-500/40 rounded p-2">
          지연: 지수 업데이트 간격이 오래되어 최신성 경고가 있습니다. 데이터 갱신 주기를 점검하세요.
        </p>
      ) : null}
    </div>
  );
}
