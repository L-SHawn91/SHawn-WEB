"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BarChart3, FileText, Search, Sparkles } from "lucide-react";
import { InvestLayout, InvestCard, investUiClass } from "@/components/invest/invest-layout";
import {
  InvestQuoteKpiCards,
  InvestQuoteKpiNotice,
  type QuoteKpiSnapshot,
} from "@/components/invest/invest-kpi-components";
import { InvestSignalConfidenceCard } from "@/components/invest/invest-confidence-card";
import { useLanguage } from "@/components/providers/language-provider";

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
  hasMore?: boolean;
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

type InvestPanel = "overview" | "reports" | "archive" | "dashboard";

function InvestHubContent({ forcedPanel }: { forcedPanel?: InvestPanel }) {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isKo = language === "ko";
  const text = {
    title: isKo ? "Investment Command Center" : "Investment Command Center",
    desc: isKo
      ? "리포트 해석, 시그널 점검, 실행 후보 정리를 한 화면에서 이어서 처리하는 운영 허브"
      : "An operation hub that connects report reading, signal checks, and action queue decisions in one flow.",
    reportViewer: isKo ? "리포트 뷰어" : "Report Viewer",
    dashboardDetail: isKo ? "대시보드 상세" : "Dashboard Detail",
    dashboardPanel: isKo ? "통합 대시보드" : "Unified Dashboard",
    search: isKo ? "종목 검색" : "Ticker Search",
    archive: isKo ? "히스토리 아카이브" : "History Archive",
    decisionFrame: isKo ? "의사결정 프레임" : "Decision Framework",
    operationMode: isKo ? "운영 모드" : "Mode",
    stream: isKo ? "최신 리포트 스트림" : "Latest Report Stream",
    actionQueue: isKo ? "실행 후보 큐" : "Action Queue",
    unifiedReports: isKo ? "통합 리포트 뷰" : "Unified Report View",
    reportTabKr: isKo ? "국내 리포트" : "KR Reports",
    reportTabUs: isKo ? "미국 리포트" : "US Reports",
    open: isKo ? "열기" : "Open",
    openDetail: isKo ? "상세 대시보드" : "Open Dashboard",
    unifiedArchive: isKo ? "통합 아카이브 검색" : "Unified Archive Search",
    queryPlaceholder: isKo ? "제목/타입 검색..." : "Search title/type...",
    date: isKo ? "날짜" : "Date",
    reset: isKo ? "초기화" : "Reset",
    noArchiveResult: isKo ? "검색 결과가 없습니다." : "No archive result.",
    allInHub: isKo ? "리포트/아카이브/대시보드 기능을 Invest Hub로 통합했습니다." : "Reports, archive, and dashboard flow are unified in Invest Hub.",
    allModules: isKo ? "전체 모듈" : "All Modules",
    watchlistFull: isKo ? "전체 워치리스트" : "Full Watchlist",
    loadingModules: isKo ? "모듈 데이터 로딩 중" : "Loading module data",
    loadingQueue: isKo ? "후보 리스트 로딩 중" : "Loading action queue",
    routine: isKo ? "운영 루틴" : "Operation Routine",
    loadingHub: isKo ? "통합 허브 데이터를 불러오는 중입니다." : "Loading command center data...",
  };
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [reportsKR, setReportsKR] = useState<ReportItem[]>([]);
  const [reportsUS, setReportsUS] = useState<ReportItem[]>([]);
  const [archiveItems, setArchiveItems] = useState<ReportItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [archiveDate, setArchiveDate] = useState("");
  const [reportTab, setReportTab] = useState<"KR" | "US">("KR");
  const [loading, setLoading] = useState(true);

  const loadHub = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshotRes, krRes, usRes] = await Promise.all([
        fetch("/api/invest/snapshot?mode=balanced", { cache: "no-store" }),
        fetch("/api/reports?type=KR&limit=12&offset=0", { cache: "no-store" }),
        fetch("/api/reports?type=US&limit=12&offset=0", { cache: "no-store" }),
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

  const activePanel = useMemo(() => {
    if (forcedPanel) return forcedPanel;
    const panel = String(searchParams.get("panel") || "").toLowerCase();
    if (panel === "reports" || panel === "archive" || panel === "dashboard") return panel;
    return "overview";
  }, [forcedPanel, searchParams]);

  useEffect(() => {
    const tab = String(searchParams.get("tab") || "").toUpperCase();
    if (tab === "KR" || tab === "US") setReportTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (activePanel !== "archive") return;
    const q = String(searchParams.get("q") || "");
    const date = String(searchParams.get("date") || "");
    setArchiveQuery(q);
    setArchiveDate(date);
  }, [activePanel, searchParams]);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "60");
      params.set("offset", "0");
      if (archiveQuery.trim()) params.set("q", archiveQuery.trim());
      if (archiveDate) params.set("date", archiveDate);

      const res = await fetch(`/api/reports?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ReportsResponse;
      setArchiveItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Failed to load archive in hub", error);
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveDate, archiveQuery]);

  useEffect(() => {
    if (activePanel !== "archive") return;
    void loadArchive();
  }, [activePanel, loadArchive]);

  const topModules = useMemo(() => {
    return [...(snapshot?.modules || [])]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 4);
  }, [snapshot?.modules]);

  const allModules = useMemo(() => {
    return [...(snapshot?.modules || [])].sort((a, b) => (b.weight || 0) - (a.weight || 0));
  }, [snapshot?.modules]);

  const actionQueue = useMemo(() => {
    return [...(snapshot?.watchlist || [])].slice(0, 6);
  }, [snapshot?.watchlist]);

  const fullWatchlist = useMemo(() => {
    return [...(snapshot?.watchlist || [])];
  }, [snapshot?.watchlist]);

  return (
    <InvestLayout
      currentTab={
        activePanel === "reports"
          ? "reports"
          : activePanel === "archive"
            ? "archive"
            : activePanel === "dashboard"
              ? "dashboard"
              : "overview"
      }
      title={text.title}
      description={text.desc}
      actions={
        <>
          <Link href="/invest/reports?tab=KR" className={investUiClass.actionButtonDefault}>
            <FileText size={14} />
            {text.reportViewer}
          </Link>
          <Link href="/invest/dashboard" className={investUiClass.actionButtonDefault}>
            <BarChart3 size={14} />
            {text.dashboardPanel}
          </Link>
          <Link href="/invest/search" className={investUiClass.actionButtonDefault}>
            <Search size={14} />
            {text.search}
          </Link>
          <Link href="/invest/archive" className={investUiClass.actionButtonPrimary}>
            <ArrowRight size={14} />
            {text.archive}
          </Link>
        </>
      }
    >
      <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
        <p className="text-xs text-gray-300">{text.allInHub}</p>
      </section>

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
        <InvestCard className="xl:col-span-4" title={text.decisionFrame}>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-gray-400">{text.operationMode}</p>
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
              <p className="text-xs text-gray-400">{text.loadingModules}</p>
            ) : null}
          </div>
        </InvestCard>

        <InvestCard className="xl:col-span-4" title={text.stream}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="mb-2 text-xs font-semibold text-blue-200">KR</p>
              <div className="space-y-2">
                {reportsKR.map((item) => (
                  <Link
                    key={`${item.path || item.title}-${item.time || ""}`}
                    href="/invest/reports?tab=KR"
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
                    href="/invest/reports?tab=US"
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

        <InvestCard className="xl:col-span-4" title={text.actionQueue}>
          <div className="space-y-2.5">
            {actionQueue.map((item) => (
              <Link
                key={`${item.region}-${item.symbol}`}
                href={`/invest/dashboard?focus=watchlist&market=${item.region}&symbol=${encodeURIComponent(item.symbol)}`}
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
            {!actionQueue.length ? <p className="text-xs text-gray-400">{text.loadingQueue}</p> : null}

            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100">
              <p className="inline-flex items-center gap-1 font-semibold">
                <Sparkles size={13} />
                {text.routine}
              </p>
              <p className="mt-1 leading-relaxed text-amber-50/90">
                1) 리포트 맥락 확인 → 2) 모듈 원인 점검 → 3) 후보 큐 우선순위 확정 → 4) 상세 화면에서 최종 검토
              </p>
            </div>
          </div>
        </InvestCard>
      </section>

      {activePanel === "reports" ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">{text.unifiedReports}</h2>
            <Link href="/invest/dashboard" className={investUiClass.actionButtonDefault}>
              <BarChart3 size={14} />
              {text.openDetail}
            </Link>
          </div>
          <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-zinc-950/60 p-1">
            <button
              type="button"
              onClick={() => setReportTab("KR")}
              className={`rounded px-3 py-1.5 text-xs ${reportTab === "KR" ? "bg-white text-black" : "text-gray-300"}`}
            >
              {text.reportTabKr}
            </button>
            <button
              type="button"
              onClick={() => setReportTab("US")}
              className={`rounded px-3 py-1.5 text-xs ${reportTab === "US" ? "bg-white text-black" : "text-gray-300"}`}
            >
              {text.reportTabUs}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(reportTab === "KR" ? reportsKR : reportsUS).map((item) => (
              <Link
                key={`${item.path || item.title}-${item.time || ""}`}
                href={item.path || "#"}
                target="_blank"
                className="rounded-lg border border-white/10 bg-black/20 p-3 hover:border-white/30"
              >
                <p className="line-clamp-1 text-sm font-semibold text-white">{shortTitle(item.title)}</p>
                <p className="mt-1 text-xs text-gray-400">{item.date} {item.time || ""} · {item.type || reportTab}</p>
                <p className="mt-2 text-xs text-sky-300">{text.open}</p>
              </Link>
            ))}
            {(reportTab === "KR" ? reportsKR : reportsUS).length === 0 ? (
              <p className="text-xs text-gray-400">{text.loadingHub}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {activePanel === "archive" ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <h2 className="text-lg font-semibold text-white">{text.unifiedArchive}</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={archiveQuery}
              onChange={(e) => setArchiveQuery(e.target.value)}
              placeholder={text.queryPlaceholder}
              className="rounded border border-gray-700 bg-zinc-950 px-3 py-2 text-sm text-gray-100"
            />
            <input
              type="date"
              value={archiveDate}
              onChange={(e) => setArchiveDate(e.target.value)}
              className="rounded border border-gray-700 bg-zinc-950 px-3 py-2 text-sm text-gray-100"
              aria-label={text.date}
            />
            <button type="button" onClick={() => void loadArchive()} className={investUiClass.actionButtonDefault}>
              <Search size={14} />
              {text.search}
            </button>
            <button
              type="button"
              onClick={() => {
                setArchiveQuery("");
                setArchiveDate("");
              }}
              className={investUiClass.actionButtonDefault}
            >
              {text.reset}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {archiveItems.map((item) => (
              <Link
                key={`${item.path || item.title}-${item.time || ""}`}
                href={item.path || "#"}
                target="_blank"
                className="rounded-lg border border-white/10 bg-black/20 p-3 hover:border-white/30"
              >
                <p className="line-clamp-1 text-sm font-semibold text-white">{shortTitle(item.title)}</p>
                <p className="mt-1 text-xs text-gray-400">{item.date} {item.time || ""} · {item.type || "-"}</p>
              </Link>
            ))}
            {archiveLoading ? <p className="text-xs text-gray-400">{text.loadingHub}</p> : null}
            {!archiveLoading && archiveItems.length === 0 ? <p className="text-xs text-gray-400">{text.noArchiveResult}</p> : null}
          </div>
        </section>
      ) : null}

      {activePanel === "dashboard" ? (
        <section className={`${investUiClass.grid} grid-cols-1 xl:grid-cols-12`}>
          <InvestCard className="xl:col-span-6" title={text.allModules}>
            <div className="space-y-2">
              {allModules.map((module) => (
                <div key={module.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{module.title}</p>
                    <p className="text-xs text-gray-300">{Math.round(module.weight)}%</p>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-sky-400"
                      style={{ width: `${Math.max(0, Math.min(100, Math.round(module.confidence)))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-300">{module.action}</p>
                </div>
              ))}
              {!allModules.length ? <p className="text-xs text-gray-400">{text.loadingModules}</p> : null}
            </div>
          </InvestCard>

          <InvestCard className="xl:col-span-6" title={text.watchlistFull}>
            <div className="space-y-2">
              {fullWatchlist.map((item) => (
                <div key={`${item.region}-${item.symbol}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name || item.symbol}</p>
                      <p className="text-[11px] text-gray-400">{item.symbol} · {item.region.toUpperCase()}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${signalTone[item.signal]}`}>
                      {item.signal} / {Math.round(item.score)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-300">{item.reason}</p>
                </div>
              ))}
              {!fullWatchlist.length ? <p className="text-xs text-gray-400">{text.loadingQueue}</p> : null}
            </div>
          </InvestCard>
        </section>
      ) : null}

      {loading ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <p className="text-sm text-gray-400">{text.loadingHub}</p>
        </section>
      ) : null}
    </InvestLayout>
  );
}

export default function InvestHubPage() {
  return <InvestHubPageInner />;
}

export function InvestHubPageInner({ forcedPanel }: { forcedPanel?: InvestPanel } = {}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white">
          <div className="mx-auto max-w-7xl px-6 py-16 text-sm text-gray-400">Loading invest hub...</div>
        </div>
      }
    >
      <InvestHubContent forcedPanel={forcedPanel} />
    </Suspense>
  );
}
