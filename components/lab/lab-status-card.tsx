"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleHelp, LucideIcon } from "lucide-react";

export type ModuleStatus = {
  module: "inv" | "bio" | "bot";
  status: "ok" | "empty" | "unknown" | "error";
  updatedAt?: string;
  total?: number;
  latest?: {
    title?: string;
    date?: string;
    type?: string;
    href?: string;
  } | null;
  detail?: string;
};

const STATUS_TONE: Record<ModuleStatus["status"], { icon: LucideIcon; cls: string; label: string }> = {
  ok: { icon: CircleCheck, cls: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10", label: "OK" },
  empty: { icon: CircleHelp, cls: "text-slate-300 border-slate-400/40 bg-slate-500/10", label: "EMPTY" },
  unknown: { icon: CircleHelp, cls: "text-amber-300 border-amber-400/40 bg-amber-500/10", label: "UNKNOWN" },
  error: { icon: CircleAlert, cls: "text-rose-300 border-rose-400/40 bg-rose-500/10", label: "ERROR" },
};

function formatRelative(timestamp?: string): string {
  if (!timestamp) return "-";
  const t = new Date(timestamp).getTime();
  if (!Number.isFinite(t)) return timestamp;
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  return `${day}일 전`;
}

export function LabStatusCard({
  heading,
  accent,
  icon: Icon,
  status,
  deepLink,
}: {
  heading: string;
  accent: string;
  icon: LucideIcon;
  status: ModuleStatus;
  deepLink: { href: string; label: string };
}) {
  const tone = STATUS_TONE[status.status];
  const ToneIcon = tone.icon;
  return (
    <article className={`rounded-2xl border bg-zinc-900/60 p-5 ${accent}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-white">{heading}</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.cls}`}
        >
          <ToneIcon className="h-3 w-3" />
          {tone.label}
        </span>
      </header>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-400">총 항목</dt>
          <dd className="text-white">{status.total ?? "-"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-400">최근 갱신</dt>
          <dd className="text-white">{formatRelative(status.updatedAt)}</dd>
        </div>
      </dl>

      {status.latest?.title ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-400">Latest</p>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-white">{status.latest.title}</p>
          <p className="mt-1 text-xs text-gray-400">
            {status.latest.date} · {status.latest.type}
          </p>
        </div>
      ) : status.detail ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-gray-400">
          {status.detail}
        </p>
      ) : null}

      <Link
        href={deepLink.href}
        className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-white hover:underline"
      >
        {deepLink.label} <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
