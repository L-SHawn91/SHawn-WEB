"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { InvestTrackBoard } from "./invest-track-board";

type InvestTab = "overview" | "reports" | "dashboard" | "archive" | "search";

type InvestShellProps = {
  currentTab?: InvestTab;
  children: ReactNode;
};

const investTabs: { key: InvestTab; label: string; href: string }[] = [
  { key: "search", label: "검색", href: "/invest/search" },
  { key: "archive", label: "아카이브", href: "/invest?panel=archive" },
  { key: "dashboard", label: "대시보드", href: "/invest?panel=dashboard" },
  { key: "reports", label: "리포트", href: "/invest?panel=reports&tab=KR" },
  { key: "overview", label: "개요", href: "/invest" },
];

export function InvestShell({ currentTab, children }: InvestShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <div className="mb-3 flex flex-col gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">투자 워크스페이스</h1>
            <p className="text-sm text-gray-300">
              SHawnbrain 투자 리서치 허브: 탭으로 기존 페이지(리포트/대시보드/아카이브)에 바로 이동
            </p>
          </div>

          <nav className="w-full overflow-x-auto" aria-label="Invest workspace tabs">
            <div className="inline-flex min-w-max gap-2 rounded-xl bg-zinc-900/60 p-1">
              {investTabs.map((tab) => {
                const isMatchedByPath =
                  pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
                const isActive = isMatchedByPath || currentTab === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-white text-black border-white"
                        : "text-gray-200 border-white/20 hover:border-white/40 hover:bg-white/10"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    data-active={isActive}
                    data-route={pathname}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <InvestTrackBoard compact />
        </header>

        <section className="mt-4 flex-1">{children}</section>
      </div>
    </div>
  );
}
