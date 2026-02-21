import { investUiClass } from "@/components/invest/invest-layout";

function getTone(confidence: number) {
  if (confidence >= 75) {
    return {
      valueClass: "text-emerald-300",
      badgeClass: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
      label: "강함",
    };
  }
  if (confidence >= 50) {
    return {
      valueClass: "text-amber-300",
      badgeClass: "text-amber-200 bg-amber-500/10 border-amber-400/30",
      label: "중립",
    };
  }
  return {
    valueClass: "text-rose-300",
    badgeClass: "text-rose-200 bg-rose-500/10 border-rose-400/30",
    label: "주의",
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
  const score = typeof confidence === "number" ? Math.max(0, Math.min(100, Math.round(confidence))) : 0;
  const tone = getTone(score);

  return (
    <article className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
      <p className="text-sm text-gray-400">신호 합의 점수</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className={`text-xl font-bold ${tone.valueClass}`}>{score}%</p>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.badgeClass}`}>
          {tone.label}
        </span>
      </div>
      {!compact && updatedAt ? (
        <p className="mt-2 text-xs text-gray-500">갱신시각: {new Date(updatedAt).toLocaleTimeString()}</p>
      ) : null}
    </article>
  );
}
