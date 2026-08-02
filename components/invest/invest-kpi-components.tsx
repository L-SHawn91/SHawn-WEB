"use client";

import { investUiClass } from "@/components/invest/invest-layout";
import { useLanguage } from "@/components/providers/language-provider";

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

const quoteHealthMap: Record<QuoteHealth, { labelKo: string; labelEn: string; badgeClass: string }> = {
  ok: {
    labelKo: "정상",
    labelEn: "Healthy",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  degraded: {
    labelKo: "주의",
    labelEn: "Degraded",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
  },
  fallback: {
    labelKo: "폴백",
    labelEn: "Fallback",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
  },
};

const upstreamStatusMap: Record<UpstreamSyncState, { labelKo: string; labelEn: string; badgeClass: string }> = {
  success: {
    labelKo: "연동 성공",
    labelEn: "Connected",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  failed: {
    labelKo: "연동 실패",
    labelEn: "Connection failed",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
  },
  disabled: {
    labelKo: "미사용",
    labelEn: "Local mode",
    badgeClass: "text-zinc-600 bg-zinc-50 border-zinc-200",
  },
};

export function formatFreshness(sec?: number | null, language: "ko" | "en" = "ko") {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec < 0) return "-";
  const minutes = Math.floor(sec / 60);
  if (language === "en") {
    if (sec < 60) return `${sec}s`;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
  if (sec < 60) return `${sec}초`;
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  return `${days}일`;
}

function mapUpstreamFailureHint(raw?: string, language: "ko" | "en" = "ko"): string | undefined {
  if (!raw) return undefined;
  const en = language === "en";
  if (raw.startsWith("upstream_status_")) {
    const status = Number(raw.replace("upstream_status_", ""));
    if (status === 401 || status === 403) {
      return en ? "Upstream authentication failed. Check API key and permission settings." : "업스트림 인증에 실패했습니다. API 키/권한 설정을 확인해 주세요.";
    }
    if (status === 404) {
      return en ? "Upstream route was not found. Check the integration URL." : "업스트림 경로를 찾지 못했습니다. 연동 URL 설정을 확인해 주세요.";
    }
    if (status === 429) {
      return en ? "Upstream is temporarily rate-limited. Try again later." : "요청이 많아 업스트림이 일시적으로 제한되었습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (status >= 500) {
      return en ? "Upstream server has a temporary issue. Try again later." : "업스트림 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return en ? `Upstream did not return a normal response. (HTTP ${status || "-"})` : `업스트림 서버가 정상 응답을 주지 않았습니다. (HTTP ${status || "-"})`;
  }
  if (raw.startsWith("upstream_error:")) {
    const detail = raw.replace("upstream_error:", "");
    const normalized = detail.toLowerCase();
    if (normalized.includes("timeout") || normalized.includes("aborted")) {
      return en ? "Upstream response timed out. Try again later." : "업스트림 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (normalized.includes("fetch failed") || normalized.includes("network") || normalized.includes("econn")) {
      return en ? "Upstream network connection failed. Check network status." : "업스트림 네트워크 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.";
    }
    if (normalized.includes("invalid url")) {
      return en ? "Upstream URL format is invalid. Check integration settings." : "업스트림 URL 형식이 올바르지 않습니다. 연동 설정을 확인해 주세요.";
    }
    return en ? "An upstream connection error occurred. Check settings and network." : "업스트림 연결 중 오류가 발생했습니다. 설정 및 네트워크를 확인해 주세요.";
  }
  return en ? "Upstream integration failed. Check settings and network." : "업스트림 연동에 실패했습니다. 설정 및 네트워크를 확인해 주세요.";
}

function humanizeKpiSourceLabel(raw?: string, language: "ko" | "en" = "ko"): string {
  const value = String(raw || "").trim();
  const lower = value.toLowerCase();
  const en = language === "en";
  if (!value || value === "-") return en ? "No source record" : "근거 출처 없음";
  if (lower.includes("public/reports") || lower.includes("reports/index") || lower.includes("reports/*.json")) {
    return en ? "Local report snapshot" : "로컬 리포트 스냅샷";
  }
  if (lower.includes("fallback/static") || lower.includes("fallback")) {
    return en ? "Fallback snapshot" : "폴백 스냅샷";
  }
  if (lower.includes("snapshot")) return en ? "Snapshot record" : "스냅샷 기록";
  if (value.length > 28) return en ? "Configured data source" : "설정된 데이터 소스";
  return value;
}

function mapUpstreamUserMessage(message?: string, failureHint?: string, language: "ko" | "en" = "ko"): string {
  if (failureHint) return failureHint;
  if (!message) return language === "en" ? "No upstream status information" : "업스트림 상태 정보 없음";

  const normalized = message.toLowerCase();
  if (normalized.includes("disabled") || normalized.includes("not configured")) {
    return language === "en" ? "Running in local snapshot mode." : "로컬 스냅샷 모드로 동작 중입니다.";
  }
  if (normalized.includes("success") || normalized.includes("ok")) {
    return language === "en" ? "Upstream connection is healthy." : "업스트림 연동이 정상 동작 중입니다.";
  }
  if (normalized.includes("failed") || normalized.includes("error")) {
    return language === "en" ? "An upstream connection error occurred. Try again later." : "업스트림 연동 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return message;
}

function deriveQuoteHealth(input: QuoteKpiSnapshot, staleThresholdSec: number, language: "ko" | "en" = "ko"): QuoteKpiState {
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
      ? "text-zinc-600 bg-zinc-50 border-zinc-200"
      : isStaleQuote
      ? "text-rose-700 bg-rose-50 border-rose-200"
      : freshnessSec <= staleThresholdSec / 2
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-amber-700 bg-amber-50 border-amber-200";

  const driftScore =
    input.driftDetector?.driftScore !== undefined ? Number(input.driftDetector.driftScore) : null;
  const driftState =
    input.driftDetector?.status ?? (typeof driftScore === "number" && driftScore >= 40 ? "unstable" : "stable");

  const upstreamState = input.upstreamSync?.status ?? "disabled";
  const upstreamMeta = upstreamStatusMap[upstreamState];
  const provenanceSources = input.provenance?.sources || [];
  const upstreamFailureHint = mapUpstreamFailureHint(input.provenance?.upstreamFailure, language);

  const provenanceSummary = provenanceSources.length
    ? Array.from(new Set(provenanceSources.slice(0, 2).map((source) => humanizeKpiSourceLabel(source, language)))).join(", ")
    : (language === "en" ? "No source record" : "근거 출처 없음");

  return {
    quoteHealth: fallbackState,
    quoteHealthLabel: language === "en" ? quoteHealthMap[fallbackState].labelEn : quoteHealthMap[fallbackState].labelKo,
    quoteHealthClass: quoteHealthMap[fallbackState].badgeClass,
    freshnessText: formatFreshness(freshnessSec, language),
    freshnessClass,
    driftScore,
    driftState,
    driftStateLabel: driftState === "stable" ? (language === "en" ? "Stable" : "안정") : (language === "en" ? "Volatile" : "변동"),
    driftStateClass:
      driftState === "stable"
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : "text-rose-700 bg-rose-50 border-rose-200",
    sourceName: humanizeKpiSourceLabel(input.quoteSource?.sourceName, language),
    fallbackLevel: input.quoteSource?.fallbackLevel ?? 0,
    isFallbackQuote,
    isStaleQuote,
    upstreamStatusLabel: language === "en" ? upstreamMeta.labelEn : upstreamMeta.labelKo,
    upstreamStatusClass: upstreamMeta.badgeClass,
    upstreamMessage: mapUpstreamUserMessage(
      input.upstreamSync?.message || (input.upstreamSync?.configured ? "upstream status unknown" : "disabled"),
      upstreamFailureHint,
      language,
    ),
    upstreamFailureHint,
    provenanceSummary,
  };
}

export function InvestQuoteKpiCards({
  snapshot,
  staleThresholdSec = INVEST_STALE_FRESHNESS_SEC,
}: {
  snapshot?: QuoteKpiSnapshot;
  staleThresholdSec?: number;
}) {
  const { language } = useLanguage();
  const isKo = language === "ko";
  const state = deriveQuoteHealth(snapshot || {}, staleThresholdSec, language);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-zinc-500 mb-1">{isKo ? "데이터 건전성" : "Data health"}</p>
        <p className={`text-2xl font-bold ${state.quoteHealth === "ok" ? "text-emerald-700" : state.quoteHealth === "degraded" ? "text-amber-700" : "text-rose-700"}`}>
          {state.quoteHealthLabel}
        </p>
        <p className={`mt-2 inline-flex w-fit max-w-full items-center rounded border px-2 py-1 text-[10px] ${state.quoteHealthClass}`}>{isKo ? "상태" : "Status"}: {state.quoteHealthLabel}</p>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-zinc-500 mb-1">{isKo ? "최신성" : "Freshness"}</p>
        <p className="text-2xl font-bold text-blue-700">{state.freshnessText}</p>
        <div className="mt-2 flex flex-wrap items-start gap-2 text-[10px]">
          <span className={`inline-flex min-w-0 items-center rounded border px-2 py-1 ${state.freshnessClass}`}>{isKo ? "소스" : "Source"}: {state.sourceName}</span>
          <span className={`inline-flex items-center rounded border px-2 py-1 ${state.freshnessClass}`}>{isKo ? "폴백 단계" : "Fallback level"}: {state.fallbackLevel}</span>
        </div>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-zinc-500 mb-1">{isKo ? "드리프트" : "Drift"}</p>
        <p className={`text-2xl font-bold ${state.driftState === "stable" ? "text-emerald-700" : "text-rose-700"}`}>
          {state.driftScore === null ? "-" : `${state.driftScore.toFixed(2)} / 100`}
        </p>
        <p className={`mt-2 w-fit px-2 py-1 text-[10px] inline-flex items-center rounded border ${state.driftStateClass}`}>
          {isKo ? "시장 상태" : "Market state"}: {state.driftStateLabel}
        </p>
      </article>

      <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-zinc-500 mb-1">{isKo ? "연동/근거" : "Integration / source"}</p>
        <p className="text-sm font-semibold leading-snug text-zinc-950">{state.provenanceSummary}</p>
        <div className="mt-2 flex flex-col items-start gap-2 text-[10px]">
          <p className={`inline-flex items-center rounded border px-2 py-1 ${state.upstreamStatusClass}`}>{isKo ? "Source" : "Source"}: {state.upstreamStatusLabel}</p>
          <p className="text-zinc-600 leading-relaxed">{state.upstreamMessage}</p>
          {state.upstreamFailureHint ? <p className="text-amber-700 break-words leading-relaxed">{isKo ? "원인 안내" : "Reason"}: {state.upstreamFailureHint}</p> : null}
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
  const { language } = useLanguage();
  const isKo = language === "ko";
  const state = deriveQuoteHealth(snapshot || {}, staleThresholdSec, language);

  if (!state.isFallbackQuote && !state.isStaleQuote && snapshot?.upstreamSync?.status !== "failed") return null;

  return (
    <div className="mt-3 space-y-2">
      {snapshot?.upstreamSync?.status === "failed" ? (
        <p className="text-xs text-rose-700 border border-rose-200 rounded p-2 leading-relaxed break-words">
          {isKo ? "연동 경고: 업스트림 연동에 실패하여 로컬 스냅샷으로 대체했습니다." : "Connection warning: upstream connection failed, using a local snapshot."}
          {state.upstreamFailureHint ? ` ${state.upstreamFailureHint}` : ""}
        </p>
      ) : null}
      {state.isFallbackQuote ? (
        <p className="text-xs text-amber-700 border border-amber-200 rounded p-2">
          {isKo ? "폴백 경고: 실시간 지수 공급자가 폴백 모드로 동작 중입니다. 원본 공급자 상태를 점검하세요." : "Fallback warning: the live index provider is running in fallback mode. Check the source provider."}
        </p>
      ) : null}
      {state.isStaleQuote ? (
        <p className="text-xs text-rose-700 border border-rose-200 rounded p-2">
          {isKo ? "최신성 경고: 지수 업데이트가 지연되어 데이터 신선도가 낮습니다." : "Freshness warning: index updates are delayed."}
        </p>
      ) : null}
    </div>
  );
}
