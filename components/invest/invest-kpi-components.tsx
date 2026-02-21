"use client";

import { investUiClass } from "@/components/invest/invest-layout";

export type QuoteHealth = "ok" | "degraded" | "fallback";
export type DriftState = "stable" | "unstable";
export type UpstreamSyncState = "success" | "failed" | "disabled";

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
  upstreamSync?: {
    configured?: boolean;
    attempted?: boolean;
    status?: UpstreamSyncState;
    origin?: string;
    message?: string;
    httpStatus?: number;
  };
  provenance?: {
    sources?: string[];
    generatedAt?: string;
    refreshRule?: string;
    upstreamFailure?: string;
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
  upstreamStatusLabel: string;
  upstreamStatusClass: string;
  upstreamMessage: string;
  upstreamFailureHint?: string;
  provenanceSummary: string;
};

const quoteHealthMap: Record<QuoteHealth, { label: string; badgeClass: string }> = {
  ok: {
    label: "정상",
    badgeClass: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
  },
  degraded: {
    label: "주의",
    badgeClass: "text-amber-200 bg-amber-500/10 border-amber-400/30",
  },
  fallback: {
    label: "폴백",
    badgeClass: "text-rose-200 bg-rose-500/10 border-rose-400/30",
  },
};

const upstreamStatusMap: Record<UpstreamSyncState, { label: string; badgeClass: string }> = {
  success: {
    label: "연동 성공",
    badgeClass: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
  },
  failed: {
    label: "연동 실패",
    badgeClass: "text-rose-200 bg-rose-500/10 border-rose-400/30",
  },
  disabled: {
    label: "미사용",
    badgeClass: "text-gray-200 bg-gray-500/10 border-gray-400/30",
  },
};

export function formatFreshness(sec?: number | null) {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec < 0) return "-";
  const minutes = Math.floor(sec / 60);
  if (sec < 60) return `${sec}초`;
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  return `${days}일`;
}

function mapUpstreamFailureHint(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("upstream_status_")) {
    const status = raw.replace("upstream_status_", "");
    return `업스트림 서버가 정상 응답을 주지 않았습니다. (HTTP ${status})`;
  }
  if (raw.startsWith("upstream_error:")) {
    const detail = raw.replace("upstream_error:", "");
    if (detail.toLowerCase().includes("timeout")) {
      return "업스트림 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (detail.toLowerCase().includes("fetch failed")) {
      return "업스트림 네트워크 연결에 실패했습니다. URL/네트워크 상태를 확인해 주세요.";
    }
    return `업스트림 연결 중 오류가 발생했습니다. (${detail})`;
  }
  return "업스트림 연동에 실패했습니다. 설정 및 네트워크를 확인해 주세요.";
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

  const upstreamState = input.upstreamSync?.status ?? "disabled";
  const upstreamMeta = upstreamStatusMap[upstreamState];
  const provenanceSources = input.provenance?.sources || [];
  const upstreamFailureHint = mapUpstreamFailureHint(input.provenance?.upstreamFailure);

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
    upstreamStatusLabel: upstreamMeta.label,
    upstreamStatusClass: upstreamMeta.badgeClass,
    upstreamMessage:
      input.upstreamSync?.message ||
      (input.upstreamSync?.configured ? "업스트림 상태 정보 없음" : "로컬 스냅샷 모드"),
    upstreamFailureHint,
    provenanceSummary: provenanceSources.length ? provenanceSources.slice(0, 2).join(", ") : "근거 출처 없음",
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
    <div className={`${investUiClass.grid} grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`}>
      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-400 mb-1">데이터 건전성</p>
        <p className={`text-2xl font-bold ${state.quoteHealth === "ok" ? "text-emerald-300" : state.quoteHealth === "degraded" ? "text-amber-300" : "text-rose-300"}`}>
          {state.quoteHealthLabel}
        </p>
        <p className={`mt-2 w-fit max-w-full px-2 py-1 text-[10px] inline-flex items-center rounded border break-all ${state.quoteHealthClass}`}>상태 코드: {state.quoteHealth}</p>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-400 mb-1">최신성</p>
        <p className="text-2xl font-bold text-blue-300">{state.freshnessText}</p>
        <div className="mt-2 flex flex-wrap items-start gap-2 text-[10px]">
          <span className={`inline-flex items-center rounded border px-2 py-1 break-all ${state.freshnessClass}`}>소스: {state.sourceName}</span>
          <span className={`inline-flex items-center rounded border px-2 py-1 ${state.freshnessClass}`}>폴백 단계: {state.fallbackLevel}</span>
        </div>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-400 mb-1">드리프트</p>
        <p className={`text-2xl font-bold ${state.driftState === "stable" ? "text-emerald-300" : "text-rose-300"}`}>
          {state.driftScore === null ? "-" : `${state.driftScore.toFixed(2)} / 100`}
        </p>
        <p className={`mt-2 w-fit px-2 py-1 text-[10px] inline-flex items-center rounded border ${state.driftStateClass}`}>
          시장 상태: {state.driftStateLabel}
        </p>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-400 mb-1">연동/근거</p>
        <p className="text-sm font-semibold text-white break-words">{state.provenanceSummary}</p>
        <div className="mt-2 flex flex-col items-start gap-2 text-[10px]">
          <p className={`inline-flex items-center rounded border px-2 py-1 ${state.upstreamStatusClass}`}>SHawn-INV: {state.upstreamStatusLabel}</p>
          <p className="text-gray-300 break-words leading-relaxed">{state.upstreamMessage}</p>
          {state.upstreamFailureHint ? <p className="text-amber-200 break-words leading-relaxed">원인 안내: {state.upstreamFailureHint}</p> : null}
        </div>
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

  if (!state.isFallbackQuote && !state.isStaleQuote && snapshot?.upstreamSync?.status !== "failed") return null;

  return (
    <div className="mt-3 space-y-2">
      {snapshot?.upstreamSync?.status === "failed" ? (
        <p className="text-xs text-rose-200 border border-rose-500/40 rounded p-2 leading-relaxed break-words">
          연동 경고: SHawn-INV 업스트림 연동에 실패하여 로컬 스냅샷으로 대체했습니다.
          {state.upstreamFailureHint ? ` ${state.upstreamFailureHint}` : ""}
        </p>
      ) : null}
      {state.isFallbackQuote ? (
        <p className="text-xs text-amber-200 border border-amber-500/40 rounded p-2">
          폴백 경고: 실시간 지수 공급자가 폴백 모드로 동작 중입니다. 원본 공급자 상태를 점검하세요.
        </p>
      ) : null}
      {state.isStaleQuote ? (
        <p className="text-xs text-rose-200 border border-rose-500/40 rounded p-2">
          최신성 경고: 지수 업데이트가 지연되어 데이터 신선도가 낮습니다.
        </p>
      ) : null}
    </div>
  );
}
