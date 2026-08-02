"use client";

import { investUiClass } from "@/components/invest/invest-layout";
import { useLanguage } from "@/components/providers/language-provider";

function getTone(confidence: number, isKo: boolean) {
  if (confidence >= 75) {
    return {
      valueClass: "text-emerald-700",
      badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
      label: isKo ? "강함" : "Strong",
    };
  }
  if (confidence >= 50) {
    return {
      valueClass: "text-amber-700",
      badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
      label: isKo ? "중립" : "Neutral",
    };
  }
  return {
    valueClass: "text-rose-700",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
    label: isKo ? "주의" : "Caution",
  };
}

export function InvestSignalConfidenceCard({
  confidence,
  updatedAt,
  compact = false,
}: {
  confidence?: number;
  updatedAt?: string;
  compact?: boolean;
}) {
  const { language } = useLanguage();
  const isKo = language === "ko";
  const score = typeof confidence === "number" ? Math.max(0, Math.min(100, Math.round(confidence))) : 0;
  const tone = getTone(score, isKo);

  return (
    <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
      <p className="text-sm text-zinc-500">{isKo ? "신호 합의 점수" : "Signal consensus score"}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className={`text-xl font-bold ${tone.valueClass}`}>{score}%</p>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.badgeClass}`}>
          {tone.label}
        </span>
      </div>
      {!compact && updatedAt ? (
        <p className="mt-2 text-xs text-zinc-500">{isKo ? "갱신시각" : "Updated"}: {new Date(updatedAt).toLocaleTimeString()}</p>
      ) : null}
    </article>
  );
}
