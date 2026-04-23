"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export type BioLayoutTab = "overview" | "research" | "archive" | "papers" | "datasets";

export const bioUiClass = {
  page: "space-y-6",
  section: "rounded-2xl border border-emerald-500/15 bg-zinc-900/65 px-4 py-4 sm:px-6 sm:py-5",
  title: "text-2xl font-bold md:text-3xl leading-tight",
  description: "mt-2 text-sm text-gray-300",
  actionBar: "mt-4 flex flex-wrap gap-2.5",
  panel: "rounded-2xl border border-emerald-500/10 bg-zinc-900/60",
  panelInner: "p-4 sm:p-6",
  panelRadiusSm: "rounded-xl",
  badge: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
  grid: "grid gap-4 sm:gap-6",
};

const bioTabs: { key: BioLayoutTab; label: string; href: string }[] = [
  { key: "overview", label: "개요", href: "/bio" },
  { key: "research", label: "연구 노트", href: "/bio/research" },
  { key: "archive", label: "아카이브", href: "/bio/archive" },
  { key: "papers", label: "Papers", href: "/bio/papers" },
  { key: "datasets", label: "Datasets", href: "/bio/datasets" },
];

export function BioShell({
  currentTab,
  children,
}: {
  currentTab?: BioLayoutTab;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="rounded-2xl border border-emerald-500/20 bg-zinc-950/60 p-4">
          <div className="mb-3 flex flex-col gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">🧬 SHawn-BIO 리서치 허브</h1>
            <p className="text-sm text-gray-300">
              오가노이드·줄기세포 연구 노트와 데이터셋을 SHawn-WEB으로 집계
            </p>
          </div>

          <nav className="w-full overflow-x-auto" aria-label="Bio workspace tabs">
            <div className="inline-flex min-w-max gap-2 rounded-xl bg-zinc-900/60 p-1">
              {bioTabs.map((tab) => {
                const matched =
                  pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
                const isActive = matched || currentTab === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-emerald-400 text-black border-emerald-400"
                        : "text-gray-200 border-white/20 hover:border-emerald-400/60 hover:bg-emerald-400/10"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {tab.label}
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

export function BioLayout({
  currentTab,
  title,
  description,
  actions,
  children,
}: {
  currentTab: BioLayoutTab;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <BioShell currentTab={currentTab}>
      <div className={bioUiClass.page}>
        <section className={bioUiClass.section}>
          <h1 className={bioUiClass.title}>{title}</h1>
          {description ? <p className={bioUiClass.description}>{description}</p> : null}
          {actions ? <div className={bioUiClass.actionBar}>{actions}</div> : null}
        </section>
        {children}
      </div>
    </BioShell>
  );
}

export function BioCard({
  className = "",
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`${bioUiClass.panel} ${bioUiClass.panelRadiusSm} ${bioUiClass.panelInner} ${className}`}
    >
      {title ? <h3 className="mb-4 text-base font-semibold text-white">{title}</h3> : null}
      {children}
    </article>
  );
}
