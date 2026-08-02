"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { type QuoteKpiSnapshot } from "@/components/invest/invest-kpi-components";
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
  signal: "Focus" | "Watch" | "Caution";
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
  Focus: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Watch: "text-sky-700 bg-sky-50 border-sky-200",
  Caution: "text-rose-700 bg-rose-50 border-rose-200",
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
  return "text-slate-300";
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

function humanizePortalSource(raw?: string, isKo = true): string {
  const value = String(raw || "").trim();
  const lower = value.toLowerCase();
  if (!value || value === "-") return isKo ? "근거 출처 없음" : "No source record";
  if (lower.includes("public/reports") || lower.includes("reports/index") || lower.includes("reports/*.json")) {
    return isKo ? "로컬 리포트 스냅샷" : "Local report snapshot";
  }
  if (lower.includes("naver") || lower.includes("stooq")) return isKo ? "Naver/Stooq 지연 데이터" : "Naver/Stooq delayed data";
  if (lower.includes("yahoo")) return isKo ? "Yahoo 지연 데이터" : "Yahoo delayed data";
  if (lower.includes("fallback")) return isKo ? "폴백 스냅샷" : "Fallback snapshot";
  if (lower.includes("snapshot")) return isKo ? "스냅샷 기록" : "Snapshot record";
  if (value.length > 32) return isKo ? "설정된 데이터 소스" : "Configured data source";
  return value;
}

function reportKindLabel(raw?: string, isKo = true): string {
  const value = String(raw || "").toUpperCase();
  if (value.includes("KR")) return isKo ? "국내 레이더" : "KR Radar";
  if (value.includes("US")) return isKo ? "미국 다이제스트" : "US Digest";
  return isKo ? "데이터 다이제스트" : "Data Digest";
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
  const { language } = useLanguage();
  const isKo = language === "ko";
  const confidence = Math.round(snapshot?.signalConfidence ?? 52);
  const drift = Math.round(snapshot?.driftDetector?.driftScore ?? 34);
  const fearGreed = Math.max(0, Math.min(100, confidence - Math.round(drift * 0.45) + 6));
  const fearGreedLabel =
    fearGreed < 35
      ? (isKo ? "공포" : "Fear")
      : fearGreed < 60
        ? (isKo ? "중립" : "Neutral")
        : fearGreed < 75
          ? (isKo ? "탐욕" : "Greed")
          : (isKo ? "극단적 탐욕" : "Extreme greed");
  const topReasons = [...modules]
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 3);
  const headline =
    confidence >= 70
      ? (isKo ? "공격적 판단보다 강한 관찰 후보 선별에 유리한 구간" : "A zone better suited to selective review than aggressive action")
      : confidence >= 50
        ? (isKo ? "추세는 유지되지만 선택과 노출 위험 점검이 중요한 구간" : "Trend remains intact, but selection and exposure-risk checks matter")
        : (isKo ? "보수적으로 확인하고 리스크 관리가 우선인 구간" : "A conservative review zone where risk checks come first");
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
      title: isKo ? "시장 신뢰도" : "Market confidence",
      code: snapshot?.mode?.toUpperCase() || "BALANCED",
      value: `${confidence}`,
      change: `${fearGreed} / 100`,
      positive: confidence >= 50,
      glow: "shadow-[0_0_40px_rgba(56,189,248,0.18)] border-sky-400/20",
      bg: "from-sky-500/18 via-blue-500/10 to-cyan-500/12",
    },
    {
      title: isKo ? "드리프트" : "Drift",
      code: snapshot?.driftDetector?.status === "unstable" ? "Risk" : "Stable",
      value: `${drift}`,
      change: snapshot?.driftDetector?.status === "unstable" ? (isKo ? "변동성 확대" : "Volatility rising") : (isKo ? "안정 구간" : "Stable zone"),
      positive: snapshot?.driftDetector?.status !== "unstable",
      glow: "shadow-[0_0_40px_rgba(251,191,36,0.14)] border-amber-400/20",
      bg: "from-amber-500/18 via-orange-500/10 to-yellow-500/12",
    },
  ];
  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-sky-400/10 bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.18),_transparent_30%),linear-gradient(180deg,_rgba(3,7,18,0.96),_rgba(8,15,32,0.98))] p-4 text-white shadow-[0_30px_120px_rgba(2,6,23,0.7)] sm:rounded-[2rem] sm:p-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200/70">Shawn Invest</p>
          <h2 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-4xl">{isKo ? "오늘의 결론" : "Today’s read"}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="min-w-0">
              <p className={`break-words text-base font-semibold leading-6 sm:text-lg ${headlineTone}`}>{headline}</p>
              <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                {isKo ? "신호 신뢰도" : "Signal confidence"} {confidence}/100, {isKo ? "시장 심리" : "market sentiment"} {fearGreed}/100({fearGreedLabel}), {isKo ? "드리프트" : "drift"} {drift}/100.
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
              <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/65">Reasons</p>
              <h3 className="mt-1 break-words text-lg font-semibold text-white">{isKo ? "핵심 근거" : "Key reasons"}</h3>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs text-slate-100 transition hover:bg-white/12"
            >
              <RefreshCw size={14} />
              {isKo ? "새로고침" : "Refresh"}
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
                <p className="mt-2 break-words text-sm leading-6 text-slate-200">{isKo ? module.action : "Source note is available in Korean."}</p>
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
  const { language } = useLanguage();
  const isKo = language === "ko";
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);

  useEffect(() => {
    setQueryString(window.location.search);
  }, []);

  const text = {
    title: isKo ? "SHawn 마켓 레이더" : "SHawn Market Radar",
    desc: isKo
      ? "리포트, 데이터 기준시각, 출처 상태를 한 화면에서 확인하는 공개형 Assets 데이터 포털입니다."
      : "A public Assets data portal for reports, timestamps, and source status in one view.",
    reportViewer: isKo ? "리포트 뷰어" : "Report Viewer",
    dashboardDetail: isKo ? "대시보드 상세" : "Dashboard Detail",
    dashboardPanel: isKo ? "통합 대시보드" : "Unified Dashboard",
    search: isKo ? "종목 검색" : "Ticker Search",
    archive: isKo ? "히스토리 아카이브" : "History Archive",
    decisionFrame: isKo ? "의사결정 프레임" : "Decision Framework",
    operationMode: isKo ? "데이터 상태" : "Data status",
    stream: isKo ? "최신 리포트 스트림" : "Latest Report Stream",
    actionQueue: isKo ? "관찰 항목" : "Observation Items",
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
    loadingQueue: isKo ? "후보 리스트 로딩 중" : "Loading observation queue",
    routine: isKo ? "운영 루틴" : "Operation Routine",
    loadingHub: isKo ? "통합 허브 데이터를 불러오는 중입니다." : "Loading command center data...",
    overviewTitle: isKo ? "Market Radar / Data Digest" : "Market Radar / Data Digest",
    overviewDesc: isKo ? "투자 지시가 아니라 공개 가능한 시장 데이터 요약, 리포트 근거, 출처 상태를 정리합니다." : "A reference-only market data portal for source-backed reports and status signals.",
    details: isKo ? "자세히 보기" : "View details",
    viewAll: isKo ? "전체 보기" : "View all",
    flowItems: isKo
      ? [
          { label: "대시보드 열기", desc: "모바일형 핵심 지표 보드", href: "/invest/dashboard" },
          { label: "리포트 보기", desc: "최신 KR/US 리포트 바로 이동", href: "/invest/reports?tab=KR" },
          { label: "검색 실행", desc: "종목 분석 페이지 열기", href: "/invest/search" },
        ]
      : [
          { label: "Open dashboard", desc: "Mobile-friendly key indicator board", href: "/invest/dashboard" },
          { label: "View reports", desc: "Open the latest KR/US reports", href: "/invest/reports?tab=KR" },
          { label: "Run search", desc: "Open the ticker analysis page", href: "/invest/search" },
        ],
    reportDesc: isKo ? "최신 리포트만 빠르게 열 수 있게 구성했습니다." : "A focused view for quickly opening recent reports.",
    reportCountSuffix: isKo ? "개 리포트" : "reports",
    archiveDesc: isKo ? "필터만 남기고 검색 흐름을 단순화했습니다." : "The archive flow is simplified around filters and search.",
    resultSuffix: isKo ? "results" : "results",
    whyTitle: isKo ? "핵심 이유 3개" : "Top three reasons",
    marketCheck: isKo ? "시장 체크" : "Market check",
    continueReading: isKo ? "바로 이어서 보기" : "Continue reading",
    openReports: isKo ? "리포트 열기" : "Open reports",
    sourceNoteKo: isKo ? "" : "Source note is available in Korean.",
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
        fetch("/api/reports?type=KR&limit=1000&offset=0", { cache: "no-store" }),
        fetch("/api/reports?type=US&limit=1000&offset=0", { cache: "no-store" }),
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
      params.set("limit", "1000");
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
      title={activePanel === "overview" ? "" : text.title}
      description={activePanel === "overview" ? undefined : text.desc}
      actions={
        activePanel === "overview" ? null : <>
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
          <section className="rounded-[1.35rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-7">
            <div className="flex min-w-0 flex-col gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2f6f73]">Market Radar</p>
                <h2 className="mt-2 break-words text-3xl font-extrabold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
                  SHawn Assets
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
                  {isKo ? "공개 가능한 시장 데이터와 리포트만 빠르게 확인합니다." : "A fast public view of market data and reports."}
                </p>
              </div>

              <Link href="/invest/search" className="flex min-h-[50px] min-w-0 items-center justify-between gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-500 transition hover:border-[#2f6f73]/40 hover:bg-white hover:text-[#2f6f73]">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Search size={18} className="shrink-0" />
                  <span className="truncate">{isKo ? "종목 · 리포트 · 테마 검색" : "Search ticker · report · theme"}</span>
                </span>
                <span className="shrink-0 rounded-full bg-[#2f6f73] px-3 py-2 text-xs font-semibold text-white">{text.search}</span>
              </Link>

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                <span>{reportsKR.length + reportsUS.length} {isKo ? "리포트" : "reports"}</span>
                <span>{humanizePortalSource(snapshot?.quoteSource?.sourceName, isKo)}</span>
                <span>{formatClockLabel(snapshot?.updatedAt)}</span>
                <span>{isKo ? "투자 조언 아님" : "not advice"}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[1.35rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2f6f73]">Latest</p>
                <h3 className="mt-1 text-lg font-bold text-zinc-950">{text.stream}</h3>
              </div>
              <Link href="/invest/reports?tab=KR" className="text-xs font-semibold text-[#2f6f73] hover:underline">{text.viewAll}</Link>
            </div>
            <div className="mt-4 divide-y divide-zinc-100">
              {[...reportsKR.slice(0, 3), ...reportsUS.slice(0, 1)].slice(0, 4).map((item) => (
                <Link key={`${item.path || item.title}-${item.time || ""}`} href={item.path || "/invest/reports?tab=KR"} target="_blank" className="block py-3 transition hover:bg-zinc-50">
                  <p className="line-clamp-1 text-sm font-semibold text-zinc-950">{shortTitle(item.title)}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatDateLabel(item.date)} {item.time || ""} · {reportKindLabel(item.type, isKo)}</p>
                </Link>
              ))}
              {reportsKR.length + reportsUS.length === 0 ? <p className="py-5 text-sm text-zinc-500">{text.loadingHub}</p> : null}
            </div>
          </section>
        </>
      ) : null}

      {showReports ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">{text.unifiedReports}</h2>
              <p className="mt-1 text-xs text-zinc-500">{text.reportDesc}</p>
            </div>
            <Link href="/invest/dashboard" className={investUiClass.actionButtonDefault}>
              <BarChart3 size={14} />
              {text.openDetail}
            </Link>
          </div>
          <div className="mb-4 inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setReportTab("KR")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${reportTab === "KR" ? "bg-white text-[#2f6f73] shadow-sm" : "text-zinc-600"}`}
            >
              {text.reportTabKr}
            </button>
            <button
              type="button"
              onClick={() => setReportTab("US")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${reportTab === "US" ? "bg-white text-[#2f6f73] shadow-sm" : "text-zinc-600"}`}
            >
              {text.reportTabUs}
            </button>
          </div>
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            {(reportTab === "KR" ? reportsKR : reportsUS).length} {text.reportCountSuffix}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(reportTab === "KR" ? reportsKR : reportsUS).map((item) => (
              <Link
                key={`${item.path || item.title}-${item.time || ""}`}
                href={item.path || "#"}
                target="_blank"
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_8px_28px_rgba(25,25,25,0.04)] transition hover:border-[#2f6f73]/30 hover:bg-zinc-50"
              >
                <p className="line-clamp-1 text-sm font-semibold text-zinc-950">{shortTitle(item.title)}</p>
                <p className="mt-2 text-xs text-zinc-500">{item.date} {item.time || ""}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">
                    {item.type || reportTab}
                  </span>
                  <p className="text-xs font-semibold text-[#2f6f73]">{text.open}</p>
                </div>
              </Link>
            ))}
            {(reportTab === "KR" ? reportsKR : reportsUS).length === 0 ? (
              <p className="text-xs text-zinc-500">{text.loadingHub}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {showArchive ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">{text.unifiedArchive}</h2>
              <p className="mt-1 text-xs text-zinc-500">{text.archiveDesc}</p>
            </div>
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
              {archiveItems.length} {text.resultSuffix}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_180px_auto_auto]">
            <input
              value={archiveQuery}
              onChange={(e) => setArchiveQuery(e.target.value)}
              placeholder={text.queryPlaceholder}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900"
            />
            <input
              type="date"
              value={archiveDate}
              onChange={(e) => setArchiveDate(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900"
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
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_8px_28px_rgba(25,25,25,0.04)] transition hover:border-[#2f6f73]/30 hover:bg-zinc-50"
              >
                <p className="line-clamp-1 text-sm font-semibold text-zinc-950">{shortTitle(item.title)}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500">{item.date} {item.time || ""}</p>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">
                    {item.type || "-"}
                  </span>
                </div>
              </Link>
            ))}
            {archiveLoading ? <p className="text-xs text-zinc-500">{text.loadingHub}</p> : null}
            {!archiveLoading && archiveItems.length === 0 ? <p className="text-xs text-zinc-500">{text.noArchiveResult}</p> : null}
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
                  <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/65">Why</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{text.whyTitle}</h3>
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
                    <p className="mt-3 break-words text-sm leading-6 text-slate-200">{isKo ? module.action : text.sourceNoteKo}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="xl:col-span-5 min-w-0 space-y-4">
              <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-sky-400/10 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,_rgba(4,9,24,0.96),_rgba(10,18,36,0.98))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/65">Market</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{text.marketCheck}</h3>
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
                    <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/65">Reports</p>
                    <h3 className="mt-1 break-words text-lg font-semibold text-white">{text.continueReading}</h3>
                  </div>
                  <Link href="/invest/reports?tab=KR" className="shrink-0 text-xs text-sky-300 hover:text-sky-200">
                    {text.openReports}
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

      {loading && !showOverview ? (
        <section className={`${investUiClass.panel} ${investUiClass.panelInner}`}>
          <p className="text-sm text-zinc-500">{text.loadingHub}</p>
        </section>
      ) : null}
    </InvestLayout>
  );
}

export default function InvestHubPage() {
  return <InvestHubContent />;
}

export function InvestHubPageInner({ forcedPanel }: { forcedPanel?: InvestPanel } = {}) {
  return <InvestHubContent forcedPanel={forcedPanel} />;
}
