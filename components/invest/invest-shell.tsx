"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { InvestTrackBoard } from "./invest-track-board";

type InvestTab = "overview" | "reports" | "dashboard" | "archive" | "search";

type InvestShellProps = {
  currentTab?: InvestTab;
  children: ReactNode;
};

type ShellSnapshot = {
  updatedAt?: string;
  signalConfidence?: number;
};

const investTabs: { key: InvestTab; href: string }[] = [
  { key: "overview", href: "/invest" },
  { key: "dashboard", href: "/invest/dashboard" },
  { key: "reports", href: "/invest/reports?tab=KR" },
  { key: "archive", href: "/invest/archive" },
  { key: "search", href: "/invest/search" },
];

const shellCopy = {
  ko: {
    title: "에셋 워크스페이스",
    desc: "모바일은 핵심 정보만, 데스크탑은 비교와 탐색이 쉬운 구조로 정리했습니다.",
    tabs: { overview: "개요", dashboard: "대시보드", reports: "리포트", archive: "아카이브", search: "검색" },
  },
  en: {
    title: "Assets Workspace",
    desc: "Mobile shows the essentials; desktop keeps comparison and exploration easy.",
    tabs: { overview: "Overview", dashboard: "Dashboard", reports: "Reports", archive: "Archive", search: "Search" },
  },
} as const;

export function InvestShell({ currentTab, children }: InvestShellProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = shellCopy[language];
  const [snapshot, setSnapshot] = useState<ShellSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const res = await fetch("/api/invest/snapshot?mode=balanced", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ShellSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // no-op
      }
    }

    void loadSnapshot();
    const timer = setInterval(() => {
      void loadSnapshot();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const updatedLabel = snapshot?.updatedAt
    ? new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Seoul",
      }).format(new Date(snapshot.updatedAt))
    : "--:--:--";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3 sm:px-6 sm:py-5">
        <header className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Shawn Invest</p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">{t.title}</h1>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                {t.desc}
              </p>
              </div>
              <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Live</p>
                  <p className="text-sm font-semibold text-white">{updatedLabel}</p>
                </div>
                <div className="border-l border-white/10 pl-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Signal</p>
                  <p className="text-sm font-semibold text-white">{Math.round(snapshot?.signalConfidence ?? 0)}/100</p>
                </div>
              </div>
            </div>
            <div className="hidden min-w-[220px] sm:block">
              <InvestTrackBoard compact />
            </div>
          </div>

          <nav className="mt-3 w-full overflow-x-auto" aria-label="Invest workspace tabs">
            <div className="inline-flex min-w-max gap-2 rounded-2xl border border-white/8 bg-zinc-900/70 p-1.5">
              {investTabs.map((tab) => {
                const isMatchedByPath =
                  tab.href === "/invest"
                    ? pathname === "/invest"
                    : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
                const isActive = currentTab ? currentTab === tab.key : isMatchedByPath;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={`min-w-[92px] rounded-xl border px-4 py-2.5 text-center text-sm font-semibold transition-all whitespace-nowrap sm:min-w-[104px] ${
                      isActive
                        ? "border-white bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.16)]"
                        : "border-white/12 bg-transparent text-gray-300 hover:border-white/28 hover:bg-white/6 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    data-active={isActive}
                    data-route={pathname}
                  >
                    {t.tabs[tab.key]}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        <section className="mt-4 flex-1">{children}</section>
      </div>
    </div>
  );
}
