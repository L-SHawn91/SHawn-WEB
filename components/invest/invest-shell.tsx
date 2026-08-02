"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";

type InvestTab = "overview" | "reports" | "dashboard" | "archive" | "search";

type InvestShellProps = {
  currentTab?: InvestTab;
  children: ReactNode;
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
    title: "SHawn Assets",
    desc: "Market Radar와 Data Digest를 공개 가능한 데이터 포털 구조로 탐색합니다.",
    tabs: { overview: "개요", dashboard: "대시보드", reports: "리포트", archive: "아카이브", search: "검색" },
  },
  en: {
    title: "SHawn Assets",
    desc: "Explore Market Radar and Data Digest as a public data portal.",
    tabs: { overview: "Overview", dashboard: "Dashboard", reports: "Reports", archive: "Archive", search: "Search" },
  },
} as const;

export function InvestShell({ currentTab, children }: InvestShellProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = shellCopy[language];

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-3 sm:px-6 sm:py-5">
        <header className="sticky top-2 z-20 border-b border-zinc-200 bg-white/95 py-2 backdrop-blur">
          <nav className="flex w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Invest workspace tabs">
            {investTabs.map((tab) => {
              const isMatchedByPath =
                tab.href === "/invest"
                  ? pathname === "/invest"
                  : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
              const isActive = currentTab ? currentTab === tab.key : isMatchedByPath;
              const mobileHidden = tab.key === "dashboard" || tab.key === "archive" ? "hidden sm:inline-flex" : "inline-flex";
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`${mobileHidden} shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                    isActive
                      ? "bg-[#2f6f73] text-white"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  data-active={isActive}
                  data-route={pathname}
                >
                  {t.tabs[tab.key]}
                </Link>
              );
            })}
          </nav>
        </header>

        <section className="mt-3 flex-1">{children}</section>
      </div>
    </div>
  );
}
