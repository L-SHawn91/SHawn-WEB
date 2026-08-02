import { ReactNode } from "react";
import { InvestShell } from "./invest-shell";

export type InvestLayoutTab = "overview" | "reports" | "dashboard" | "archive" | "search";

export const investUiClass = {
  page: "space-y-6",
  section: "rounded-[1.35rem] border border-zinc-200 bg-white px-4 py-4 shadow-[0_8px_28px_rgba(25,25,25,0.04)] sm:px-6 sm:py-5",
  title: "text-2xl font-bold leading-tight tracking-tight text-zinc-900 md:text-3xl",
  description: "mt-2 text-sm leading-6 text-zinc-600",
  actionBar: "mt-4 flex flex-wrap gap-2.5",
  actionButton:
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
  actionButtonPrimary:
    "inline-flex items-center gap-2 rounded-full border border-[#2f6f73]/20 bg-[#eaf4f3] px-3 py-1.5 text-xs font-semibold text-[#2f6f73] transition-colors hover:border-[#2f6f73]/35 hover:bg-[#dff0ee]",
  actionButtonDefault:
    "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50",
  panel: "rounded-[1.35rem] border border-zinc-200 bg-white shadow-[0_8px_28px_rgba(25,25,25,0.04)]",
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
        {title || description || actions ? (
          <section className={investUiClass.section}>
            {title ? <h1 className={investUiClass.title}>{title}</h1> : null}
            {description ? <p className={investUiClass.description}>{description}</p> : null}
            {actions ? <div className={investUiClass.actionBar}>{actions}</div> : null}
          </section>
        ) : null}
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
      {title ? <h3 className="mb-4 text-base font-semibold text-zinc-900">{title}</h3> : null}
      {children}
    </article>
  );
}
