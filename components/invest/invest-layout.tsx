import { ReactNode } from "react";
import { InvestShell } from "./invest-shell";

export type InvestLayoutTab = "overview" | "reports" | "dashboard" | "archive" | "search";

export const investUiClass = {
  page: "space-y-6",
  section: "rounded-2xl border border-white/12 bg-zinc-900/65 px-4 py-4 sm:px-6 sm:py-5",
  title: "text-2xl font-bold md:text-3xl leading-tight",
  description: "mt-2 text-sm text-gray-300",
  actionBar: "mt-4 flex flex-wrap gap-2.5",
  actionButton:
    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
  actionButtonPrimary:
    "inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-900/20 px-3 py-1.5 text-xs font-medium text-blue-200 transition-colors",
  actionButtonDefault:
    "inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-zinc-900/70 px-3 py-1.5 text-xs text-gray-300 transition-colors",
  panel: "rounded-2xl border border-white/10 bg-zinc-900/60",
  panelInner: "p-4 sm:p-6",
  panelSpace: "space-y-4",
  panelRadiusSm: "rounded-xl",
  badge: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
  grid: "grid gap-4 sm:gap-6",
};

type InvestLayoutProps = {
  currentTab: InvestLayoutTab;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function InvestLayout({
  currentTab,
  title,
  description,
  actions,
  children,
}: InvestLayoutProps) {
  return (
    <InvestShell currentTab={currentTab}>
      <div className={investUiClass.page}>
        <section className={investUiClass.section}>
          <h1 className={investUiClass.title}>{title}</h1>
          {description ? <p className={investUiClass.description}>{description}</p> : null}
          {actions ? <div className={investUiClass.actionBar}>{actions}</div> : null}
        </section>
        {children}
      </div>
    </InvestShell>
  );
}

export function InvestPanel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={`${investUiClass.panel} ${className}`}>{children}</section>;
}

export function InvestCard({
  className = "",
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <article className={`${investUiClass.panel} ${investUiClass.panelRadiusSm} ${investUiClass.panelInner} ${className}`}>
      {title ? <h3 className="mb-4 text-base font-semibold text-white">{title}</h3> : null}
      {children}
    </article>
  );
}
