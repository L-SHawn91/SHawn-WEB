"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  FileText,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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

type MarketCard = {
  region: string;
  flag: string;
  indexA: { label: string; value: string; change: string };
  indexB: { label: string; value: string; change: string };
  traits?: string[];
  allocation?: number;
  liquidity?: string;
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
  markets?: MarketCard[];
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

function changeTone(change?: string): string {
  const value = String(change || "");
  if (value.startsWith("+")) return "text-emerald-300";
  if (value.startsWith("-")) return "text-rose-300";
  return "text-gray-400";
}

function formatClockLabel(value?: string): string {
  if (!value) return "--:--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatDateLabel(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function buildSparklinePath(seedText: string): string {
  const base = Array.from(seedText || "seed").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const points = Array.from({ length: 8 }, (_, idx) => {
    const x = idx * 14;
    const y = 22 + (((base + idx * 17) % 20) - 10);
    return `${x},${Math.max(6, Math.min(38, y))}`;
  });
  return points.join(" ");
}

function ShawnInvestDashboard({
  snapshot,
  marketPulse,
  modules,
}: {
  snapshot: SnapshotPayload | null;
  marketPulse: MarketCard[];
  modules: SignalModule[];
}) {
  const confidence = Math.round(snapshot?.signalConfidence ?? 52);
  const drift = Math.round(snapshot?.driftDetector?.driftScore ?? 34);
  const fearGreed = Math.max(0, Math.min(100, confidence - Math.round(drift * 0.45) + 6));
  const fearGreedLabel =
    fearGreed < 35 ? "공포" : fearGreed < 60 ? "중립" : fearGreed < 75 ? "탐욕" : "극단적 탐욕";
  const topReasons = [...modules]
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 3);
  const headline =
    confidence >= 70
      ? "공격적 진입보다 강한 종목 선별에 유리한 구간"
      : confidence >= 50
        ? "추세는 유지되지만 선택과 비중 조절이 중요한 구간"
        : "보수적으로 확인하고 리스크 관리가 우선인 구간";
  const headlineTone =
    confidence >= 70 ? "text-emerald-300" : confidence >= 50 ? "text-sky-300" : "text-amber-300";
  const cards = [
    {
      title: marketPulse[0]?.indexA?.label || "KOSPI",
      code: marketPulse[0]?.region?.replace(" Market", "").toUpperCase() || "KOREA",
      value: marketPulse[0]?.indexA?.value || "N/A",
      change: marketPulse[0]?.indexA?.change || "0.00%",
      positive: !String(marketPulse[0]?.indexA?.change || "").startsWith("-"),
      glow: "shadow-[0_0_40px_rgba(16,185,129,0.18)] border-emerald-400/20",
      bg: "from-emerald-500/18 via-emerald-500/8 to-cyan-500/14",
    },
    {
      title: marketPulse[1]?.indexB?.label || "NASDAQ 100",
      code: "US Futures",
      value: marketPulse[1]?.indexB?.value || "N/A",
      change: marketPulse[1]?.indexB?.change || "0.00%",
      positive: !String(marketPulse[1]?.indexB?.change || "").startsWith("-"),
      glow: "shadow-[0_0_40px_rgba(244,63,94,0.16)] border-rose-400/20",
      bg: "from-rose-500/18 via-fuchsia-500/8 to-orange-500/12",
    },
    {
      title: "시장 신뢰도",
      code: snapshot?.mode?.toUpperCase() || "BALANCED",
      value: `${confidence}`,
      change: `${fearGreed} / 100`,
      positive: confidence >= 50,
      glow: "shadow-[0_0_40px_rgba(56,189,248,0.18)] border-sky-400/20",
      bg: "from-sky-500/18 via-blue-500/10 to-cyan-500/12",
    },
    {
      title: "드리프트",
      code: snapshot?.driftDetector?.status === "unstable" ? "Risk" : "Stable",
      value: `${drift}`,
      change: snapshot?.driftDetector?.status === "unstable" ? "변동성 확대" : "안정 구간",
      positive: snapshot?.driftDetector?.status !== "unstable",
      glow: "shadow-[0_0_40px_rgba(251,191,36,0.14)] border-amber-400/20",
      bg: "from-amber-500/18 via-orange-500/10 to-yellow-500/12",
    },
  ];
  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-sky-400/10 bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.18),_transparent_30%),linear-gradient(180deg,_rgba(3,7,18,0.96),_rgba(8,15,32,0.98))] p-4 text-white shadow-[0_30px_120px_rgba(2,6,23,0.7)] sm:rounded-[2rem] sm:p-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200/65">Shawn Invest</p>
          <h2 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-4xl">오늘의 결론</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="min-w-0">
              <p className={`break-words text-base font-semibold leading-6 sm:text-lg ${headlineTone}`}>{headline}</p>
              <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                신호 신뢰도 {confidence}/100, 시장 심리 {fearGreed}/100({fearGreedLabel}), 드리프트 {drift}/100 기준입니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {cards.slice(0, 4).map((card) => (
                <article
                  key={`${card.title}-${card.code}`}
                  className={`min-w-0 overflow-hidden rounded-[1.2rem] border bg-gradient-to-br ${card.bg} p-3 backdrop-blur ${card.glow}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{card.title}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">{card.code}</p>
                    </div>
                    {card.positive ? <TrendingUp className="shrink-0 text-emerald-300" size={15} /> : <TrendingDown className="shrink-0 text-rose-300" size={15} />}
                  </div>
                  <p className="mt-3 truncate text-lg font-bold tracking-tight text-slate-50 sm:text-xl">{card.value}</p>
                  <p className={`mt-1 break-words text-[11px] font-medium sm:text-xs ${card.positive ? "text-emerald-300" : "text-rose-300"}`}>{card.change}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/55">Reasons</p>
              <h3 className="mt-1 break-words text-lg font-semibold text-white">핵심 근거</h3>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs text-slate-100 transition hover:bg-white/12"
            >
              <RefreshCw size={14} />
              새로고침
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {topReasons.map((module, index) => (
              <div key={module.key} className="min-w-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-semibold text-white">{index + 1}. {module.title}</p>
                  <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[11px] text-sky-200">
                    {Math.round(module.weight)}%
                  </span>
                </div>
                <p className="mt-2 break-words text-xs text-slate-400">confidence {Math.round(module.confidence)}/100</p>
                <p className="mt-2 break-words text-sm leading-6 text-slate-200">{module.action}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
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
    marketPulse: isKo ? "시장 지수 펄스" : "Market Index Pulse",
    focusView: isKo ? "집중 보기" : "Focus View",
    flowGuide: isKo ? "운영 순서" : "Operation Flow",
    flow1: isKo ? "지수 상태 확인" : "Check index pulse",
    flow2: isKo ? "모듈 강약 확인" : "Review module strength",
    flow3: isKo ? "후보 큐 우선순위" : "Prioritize action queue",
    flow4: isKo ? "리포트/아카이브 실행" : "Execute via report/archive",
    unifiedArchive: isKo ? "통합 아카이브 검색" : "Unified Archive Search",
    queryPlaceholder: isKo ? "제목/타입 검색..." : "Search title/type...",
    date: isKo ? "날짜" : "Date",
    reset: isKo ? "초기화" : "Reset",
    noArchiveResult: isKo ? "검색 결과가 없습니다." : "No archive result.",
    allInHub: isKo ? "리포트/아카이브/대시보드 기능을 Invest Hub로 통합했습니다." : "Reports, archive, and dashboard flow are unified in Invest Hub.",
    allModules: isKo ? "전체 모듈" : "All Modules",
    watchlistFull: isKo ? "모듈 해석" : "Module Notes",
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
  const focus = String(searchParams.get("focus") || "").toLowerCase();

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

  const marketPulse = useMemo(() => {
    return snapshot?.markets || [];
  }, [snapshot?.markets]);

  const showOverview = activePanel === "overview";
  const showReports = activePanel === "reports";
  const showArchive = activePanel === "archive";
  const showDashboard = activePanel === "dashboard";

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
      {showOverview ? (
        <>
          <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,_rgba(9,9,11,0.94),_rgba(15,23,42,0.94))] p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200/60">Overview</p>
                  <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">숀투자 한 화면 요약</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    복잡한 섹션을 줄이고, 지금 바로 봐야 할 지표와 다음 행동만 남겼습니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="sm:col-span-2 xl:col-span-1">
                    <InvestSignalConfidenceCard
                      confidence={snapshot?.signalConfidence}
                      updatedAt={snapshot?.updatedAt}
                      compact
                    />
                  </div>
                  <div className="sm:col-span-2 xl:col-span-3 hidden sm:block">
                    <InvestQuoteKpiCards snapshot={snapshot || undefined} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {marketPulse.slice(0, 2).map((market) => (
                    <article key={market.region} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{market.flag} {market.region}</p>
                          <p className="mt-1 text-xs text-gray-400">{market.liquidity || "-"}</p>
                        </div>
                        <Link href="/invest/dashboard" className="text-xs text-sky-300 hover:text-sky-200">
                          자세히 보기
                        </Link>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <p className="text-[11px] text-gray-400">{market.indexA.label}</p>
                          <p className="mt-1 text-base font-semibold text-white">{market.indexA.value}</p>
                          <p className={`text-xs ${changeTone(market.indexA.change)}`}>{market.indexA.change}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <p className="text-[11px] text-gray-400">{market.indexB.label}</p>
                          <p className="mt-1 text-base font-semibold text-white">{market.indexB.value}</p>
                          <p className={`text-xs ${changeTone(market.indexB.change)}`}>{market.indexB.change}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold text-gray-400">{text.flowGuide}</p>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "대시보드 열기", desc: "모바일형 핵심 지표 보드", href: "/invest/dashboard" },
                      { label: "리포트 보기", desc: "최신 KR/US 리포트 바로 이동", href: "/invest/reports?tab=KR" },
                      { label: "검색 실행", desc: "종목 분석 페이지 열기", href: "/invest/search" },
                    ].map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="block rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition hover:border-white/20 hover:bg-white/8"
                      >
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-xs text-gray-400">{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{text.actionQueue}</p>
                    <Link href="/invest/dashboard?focus=watchlist" className="text-xs text-sky-300 hover:text-sky-200">
                      전체 보기
                    </Link>
                  </div>
                  <div className="mt-3 space-y-2">
                    {actionQueue.slice(0, 3).map((item) => (
                      <div key={`${item.region}-${item.symbol}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.name || item.symbol}</p>
                            <p className="text-[11px] text-gray-400">{item.symbol} · {item.region.toUpperCase()}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${signalTone[item.signal]}`}>
                            {item.signal}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-gray-300">{item.reason}</p>
                      </div>
                    ))}
                    {!actionQueue.length ? <p className="text-xs text-gray-400">{text.loadingQueue}</p> : null}
                  </div>
                </article>

                <div className="hidden xl:block">
                  <InvestQuoteKpiNotice snapshot={snapshot || undefined} />
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {showReports ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">{text.unifiedReports}</h2>
              <p className="mt-1 text-xs text-gray-400">최신 리포트만 빠르게 열 수 있게 구성했습니다.</p>
            </div>
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
          <div className="mb-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-400">
            총 {(reportTab === "KR" ? reportsKR : reportsUS).length}개 리포트
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(reportTab === "KR" ? reportsKR : reportsUS).map((item) => (
              <Link
                key={`${item.path || item.title}-${item.time || ""}`}
                href={item.path || "#"}
                target="_blank"
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.03]"
              >
                <p className="line-clamp-1 text-sm font-semibold text-white">{shortTitle(item.title)}</p>
                <p className="mt-2 text-xs text-gray-400">{item.date} {item.time || ""}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
                    {item.type || reportTab}
                  </span>
                  <p className="text-xs text-sky-300">{text.open}</p>
                </div>
              </Link>
            ))}
            {(reportTab === "KR" ? reportsKR : reportsUS).length === 0 ? (
              <p className="text-xs text-gray-400">{text.loadingHub}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {showArchive ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">{text.unifiedArchive}</h2>
              <p className="mt-1 text-xs text-gray-400">필터만 남기고 검색 흐름을 단순화했습니다.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
              {archiveItems.length} results
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_180px_auto_auto]">
            <input
              value={archiveQuery}
              onChange={(e) => setArchiveQuery(e.target.value)}
              placeholder={text.queryPlaceholder}
              className="rounded-xl border border-gray-700 bg-zinc-950 px-3 py-2.5 text-sm text-gray-100"
            />
            <input
              type="date"
              value={archiveDate}
              onChange={(e) => setArchiveDate(e.target.value)}
              className="rounded-xl border border-gray-700 bg-zinc-950 px-3 py-2.5 text-sm text-gray-100"
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

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {archiveItems.map((item) => (
              <Link
                key={`${item.path || item.title}-${item.time || ""}`}
                href={item.path || "#"}
                target="_blank"
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.03]"
              >
                <p className="line-clamp-1 text-sm font-semibold text-white">{shortTitle(item.title)}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">{item.date} {item.time || ""}</p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
                    {item.type || "-"}
                  </span>
                </div>
              </Link>
            ))}
            {archiveLoading ? <p className="text-xs text-gray-400">{text.loadingHub}</p> : null}
            {!archiveLoading && archiveItems.length === 0 ? <p className="text-xs text-gray-400">{text.noArchiveResult}</p> : null}
          </div>
        </section>
      ) : null}

      {showDashboard ? (
        <section className="space-y-4">
          <ShawnInvestDashboard snapshot={snapshot} marketPulse={marketPulse} modules={allModules} />

          <section className={`${investUiClass.grid} grid-cols-1 gap-4 xl:grid-cols-12`}>
            <section className="xl:col-span-7 min-w-0 overflow-hidden rounded-[1.75rem] border border-sky-400/10 bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.16),_transparent_28%),linear-gradient(180deg,_rgba(4,9,24,0.96),_rgba(10,18,36,0.98))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/55">Why</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">핵심 이유 3개</h3>
                </div>
              </div>
              <div className="space-y-3">
                {allModules.slice(0, 3).map((module, index) => (
                  <article key={module.key} className="min-w-0 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold text-white">{index + 1}. {module.title}</p>
                        <p className="mt-1 break-words text-xs text-slate-400">weight {Math.round(module.weight)}% · confidence {Math.round(module.confidence)}/100</p>
                      </div>
                      <div className="hidden shrink-0 sm:block">
                        <svg viewBox="0 0 98 42" className="h-10 w-24 overflow-visible">
                          <polyline
                            fill="none"
                            stroke="#6ee7b7"
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={buildSparklinePath(`${module.title}-${module.weight}-${module.confidence}`)}
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                        style={{ width: `${Math.max(0, Math.min(100, Math.round(module.confidence)))}%` }}
                      />
                    </div>
                    <p className="mt-3 break-words text-sm leading-6 text-slate-200">{module.action}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="xl:col-span-5 min-w-0 space-y-4">
              <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-sky-400/10 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,_rgba(4,9,24,0.96),_rgba(10,18,36,0.98))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/55">Market</p>
                <h3 className="mt-1 text-lg font-semibold text-white">시장 체크</h3>
                <div className="mt-4 space-y-3">
                  {marketPulse.slice(0, 2).map((market) => (
                    <article key={market.region} className="min-w-0 overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-semibold text-white">{market.flag} {market.region}</p>
                        <span className="shrink-0 text-[11px] text-slate-400">{market.liquidity || "-"}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="min-w-0 overflow-hidden rounded-xl border border-white/8 bg-black/20 p-3">
                          <p className="truncate text-[11px] text-slate-400">{market.indexA.label}</p>
                          <p className="mt-1 truncate text-base font-semibold text-white">{market.indexA.value}</p>
                          <p className={`mt-1 break-words text-xs ${changeTone(market.indexA.change)}`}>{market.indexA.change}</p>
                        </div>
                        <div className="min-w-0 overflow-hidden rounded-xl border border-white/8 bg-black/20 p-3">
                          <p className="truncate text-[11px] text-slate-400">{market.indexB.label}</p>
                          <p className="mt-1 truncate text-base font-semibold text-white">{market.indexB.value}</p>
                          <p className={`mt-1 break-words text-xs ${changeTone(market.indexB.change)}`}>{market.indexB.change}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-sky-400/10 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,_rgba(4,9,24,0.96),_rgba(10,18,36,0.98))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/55">Reports</p>
                    <h3 className="mt-1 break-words text-lg font-semibold text-white">바로 이어서 보기</h3>
                  </div>
                  <Link href="/invest/reports?tab=KR" className="shrink-0 text-xs text-sky-300 hover:text-sky-200">
                    리포트 열기
                  </Link>
                </div>
                <div className="mt-4 space-y-2">
                  {[...reportsKR.slice(0, 2), ...reportsUS.slice(0, 1)].map((item) => (
                    <Link
                      key={`${item.path || item.title}-${item.time || ""}`}
                      href={item.path || "/invest/reports?tab=KR"}
                      target="_blank"
                      className="block min-w-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-3 transition hover:border-white/25"
                    >
                      <p className="line-clamp-2 break-words text-sm font-semibold text-white">{shortTitle(item.title)}</p>
                      <p className="mt-1 break-words text-xs text-slate-400">{item.date} {item.time || ""}</p>
                    </Link>
                  ))}
                </div>
              </section>
            </section>
          </section>
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
