"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, FileText, Search, Sparkles } from "lucide-react";
import { InvestLayout, InvestCard, investUiClass } from "@/components/invest/invest-layout";
import {
  InvestQuoteKpiCards,
  InvestQuoteKpiNotice,
  type QuoteKpiSnapshot,
} from "@/components/invest/invest-kpi-components";
import { InvestSignalConfidenceCard } from "@/components/invest/invest-confidence-card";

type ReportItem = {
  title?: string;
  date?: string;
  time?: string;
  type?: string;
  path?: string;
  json_path?: string;
};

type ReportsResponse = {
  items?: ReportItem[];
};

type SignalModule = {
  key: string;
  title: string;
  weight: number;
  confidence: number;
  action: string;
};

type WatchItem = {
  symbol: string;
  name?: string;
  signal: "Buy" | "Hold" | "Trim";
  score: number;
  reason: string;
  region: "k" | "us";
};

type SnapshotPayload = QuoteKpiSnapshot & {
  updatedAt?: string;
  signalConfidence?: number;
  mode?: string;
  modules?: SignalModule[];
  watchlist?: WatchItem[];
};

const signalTone: Record<WatchItem["signal"], string> = {
  Buy: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
  Hold: "text-sky-200 bg-sky-500/10 border-sky-400/30",
  Trim: "text-rose-200 bg-rose-500/10 border-rose-400/30",
};

function shortTitle(raw?: string): string {
  const base = String(raw || "").trim();
  if (!base) return "Untitled Report";
  return base.replace(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}\s(KR|US)\sMarket\sReport\s?/i, "").trim() || base;
}

export default function InvestHubPage() {
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [reportsKR, setReportsKR] = useState<ReportItem[]>([]);
  const [reportsUS, setReportsUS] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHub = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshotRes, krRes, usRes] = await Promise.all([
        fetch("/api/invest/snapshot?mode=balanced", { cache: "no-store" }),
        fetch("/api/reports?type=KR&limit=4&offset=0", { cache: "no-store" }),
        fetch("/api/reports?type=US&limit=4&offset=0", { cache: "no-store" }),
      ]);

      if (snapshotRes.ok) {
        const data = (await snapshotRes.json()) as SnapshotPayload;
        setSnapshot(data);
      }

      if (krRes.ok) {
        const data = (await krRes.json()) as ReportsResponse;
        setReportsKR(Array.isArray(data.items) ? data.items : []);
      }

      if (usRes.ok) {
        const data = (await usRes.json()) as ReportsResponse;
        setReportsUS(Array.isArray(data.items) ? data.items : []);
      }
    } catch (error) {
      console.error("Failed to load invest hub data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHub();
    const timer = setInterval(() => {
      void loadHub();
    }, 60_000);

    return () => clearInterval(timer);
  }, [loadHub]);

  const topModules = useMemo(() => {
    return [...(snapshot?.modules || [])]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 4);
  }, [snapshot?.modules]);

  const actionQueue = useMemo(() => {
    return [...(snapshot?.watchlist || [])].slice(0, 6);
  }, [snapshot?.watchlist]);

  return (
    <InvestLayout
      currentTab="overview"
      title="Investment Command Center"
      description="리포트 해석, 시그널 점검, 실행 후보 정리를 한 화면에서 이어서 처리하는 운영 허브"
      actions={
        <>
          <Link href="/market-intelligence?tab=KR" className={investUiClass.actionButtonDefault}>
            <FileText size={14} />
            리포트 뷰어
          </Link>
          <Link href="/cartridges/invest?focus=modules" className={investUiClass.actionButtonDefault}>
            <BarChart3 size={14} />
            대시보드 상세
          </Link>
          <Link href="/invest/search" className={investUiClass.actionButtonDefault}>
            <Search size={14} />
            종목 검색
          </Link>
          <Link href="/market-intelligence/archive" className={investUiClass.actionButtonPrimary}>
            <ArrowRight size={14} />
            히스토리 아카이브
          </Link>
        </>
      }
    >
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-1">
            <InvestSignalConfidenceCard
              confidence={snapshot?.signalConfidence}
              updatedAt={snapshot?.updatedAt}
            />
          </div>
          <div className="xl:col-span-4">
            <InvestQuoteKpiCards snapshot={snapshot || undefined} />
          </div>
        </div>
        <InvestQuoteKpiNotice snapshot={snapshot || undefined} />
      </section>

      <section className={`${investUiClass.grid} grid-cols-1 xl:grid-cols-12`}>
        <InvestCard className="xl:col-span-4" title="의사결정 프레임">
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-gray-400">운영 모드</p>
              <p className="mt-1 text-base font-semibold text-white">{snapshot?.mode || "balanced"}</p>
            </div>
            {topModules.map((module) => (
              <div key={module.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">{module.title}</p>
                  <p className="text-xs text-gray-300">weight {Math.round(module.weight)}%</p>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-sky-400"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(module.confidence)))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-300">action: {module.action}</p>
              </div>
            ))}
            {!topModules.length ? (
              <p className="text-xs text-gray-400">모듈 데이터 로딩 중</p>
            ) : null}
          </div>
        </InvestCard>

        <InvestCard className="xl:col-span-4" title="최신 리포트 스트림">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="mb-2 text-xs font-semibold text-blue-200">KR</p>
              <div className="space-y-2">
                {reportsKR.map((item) => (
                  <Link
                    key={`${item.path || item.title}-${item.time || ""}`}
                    href="/market-intelligence?tab=KR"
                    className="block rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 hover:border-blue-300/40"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-white">{shortTitle(item.title)}</p>
                    <p className="mt-1 text-[11px] text-gray-300">{item.date} {item.time || ""}</p>
                  </Link>
                ))}
                {!reportsKR.length ? <p className="text-xs text-gray-400">데이터 로딩 중</p> : null}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="mb-2 text-xs font-semibold text-emerald-200">US</p>
              <div className="space-y-2">
                {reportsUS.map((item) => (
                  <Link
                    key={`${item.path || item.title}-${item.time || ""}`}
                    href="/market-intelligence?tab=US"
                    className="block rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 hover:border-emerald-300/40"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-white">{shortTitle(item.title)}</p>
                    <p className="mt-1 text-[11px] text-gray-300">{item.date} {item.time || ""}</p>
                  </Link>
                ))}
                {!reportsUS.length ? <p className="text-xs text-gray-400">데이터 로딩 중</p> : null}
              </div>
            </div>
          </div>
        </InvestCard>

        <InvestCard className="xl:col-span-4" title="실행 후보 큐">
          <div className="space-y-2.5">
            {actionQueue.map((item) => (
              <Link
                key={`${item.region}-${item.symbol}`}
                href={`/cartridges/invest?focus=watchlist&market=${item.region}&symbol=${encodeURIComponent(item.symbol)}`}
                className="block rounded-xl border border-white/10 bg-black/20 p-3 hover:border-white/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name || item.symbol}</p>
                    <p className="text-[11px] text-gray-400">{item.symbol} · {item.region.toUpperCase()}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${signalTone[item.signal]}`}>
                    {item.signal} / {Math.round(item.score)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-300 line-clamp-2">{item.reason}</p>
              </Link>
            ))}
            {!actionQueue.length ? <p className="text-xs text-gray-400">후보 리스트 로딩 중</p> : null}

            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100">
              <p className="inline-flex items-center gap-1 font-semibold">
                <Sparkles size={13} />
                운영 루틴
              </p>
              <p className="mt-1 leading-relaxed text-amber-50/90">
                1) 리포트 맥락 확인 → 2) 모듈 원인 점검 → 3) 후보 큐 우선순위 확정 → 4) 상세 화면에서 최종 검토
              </p>
            </div>
          </div>
        </InvestCard>
      </section>

      {loading ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <p className="text-sm text-gray-400">통합 허브 데이터를 불러오는 중입니다.</p>
        </section>
      ) : null}
    </InvestLayout>
  );
}
