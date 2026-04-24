"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DashboardProject } from "@/lib/dashboard-data";

export function DashboardClient({ projects }: { projects: DashboardProject[] }) {
  const defaultProject = useMemo(() => {
    return projects.find((project) => project.slug === "shawn-web") ?? projects[0];
  }, [projects]);

  const [selectedSlug, setSelectedSlug] = useState(defaultProject?.slug ?? "");

  const selected = useMemo(() => {
    return projects.find((project) => project.slug === selectedSlug) ?? defaultProject;
  }, [defaultProject, projects, selectedSlug]);

  const stats = useMemo(() => {
    const repoProjects = projects.filter((project) => project.axis === "github").length;
    const workspaceProjects = projects.filter((project) => project.axis !== "github").length;
    const activeProjects = projects.filter((project) => project.status.startsWith("active")).length;
    return { repoProjects, workspaceProjects, activeProjects };
  }, [projects]);

  const branchTone = useMemo(() => getBranchTone(selected), [selected]);

  return (
    <main className="dashboard-shell mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <section className={`dashboard-panel mb-6 overflow-hidden rounded-[28px] border shadow-2xl backdrop-blur-xl ${branchTone.hero}`}>
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
          <div>
            <div className={`text-xs uppercase tracking-[0.24em] ${branchTone.kicker}`}>SHawn Dashboard</div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Workspace control layer inside SHawn-WEB</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
              local-first, filesystem-first, read-first 규칙으로 프로젝트 상태를 묶어 보여주는 운영 대시보드입니다. prototype은 SHawn-dashboard에 두고, 실제 진입은 여기 `/dashboard`로 고정합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs">
              <GlowPill label={`Projects ${projects.length}`} tone="cyan" />
              <GlowPill label={`Active ${stats.activeProjects}`} tone="emerald" />
              <GlowPill label={`Git repos ${stats.repoProjects}`} tone="violet" />
              <GlowPill label={`Workspace items ${stats.workspaceProjects}`} tone="amber" />
              <GlowPill label={`Focus ${selected?.tag ?? "default"}`} tone={branchTone.pill} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MetricCard label="Selected" value={selected?.name ?? "none"} sub={selected?.status ?? "n/a"} />
            <MetricCard label="Main session" value={selected?.session ?? "not-bound"} sub={selected?.discussion ?? "not fixed"} />
            <MetricCard label="Recent hint" value={selected?.recentHint ?? "n/a"} sub={`${selected?.fileCountHint ?? 0} visible entries`} />
          </div>
        </div>
      </section>

      {!selected ? (
        <section className="dashboard-panel rounded-3xl border p-6 text-zinc-300">
          읽을 수 있는 프로젝트 메타가 아직 없습니다.
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <aside className="space-y-6">
            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="Projects" helper="click to inspect" />
              <div className="mt-4 space-y-3 max-h-[72vh] overflow-auto pr-1">
                {projects.map((project) => {
                  const active = project.slug === selected.slug;
                  return (
                    <button
                      key={`${project.kind}:${project.slug}:${project.workingFolder}`}
                      type="button"
                      onClick={() => setSelectedSlug(project.slug)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${active ? branchTone.cardActive : "dashboard-card hover:border-white/20 hover:bg-white/[0.06]"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{project.name}</div>
                          <div className="mt-1 text-xs text-zinc-400">{project.repo}</div>
                          <div className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{project.summary}</div>
                        </div>
                        <span className="dashboard-tag">{project.tag}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{project.kind}</span>
                        <span>{project.recentHint}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="Quick actions" />
              <div className="mt-4 grid gap-3">
                <ActionCard title="Open legacy prototype" desc="기존 SHawn-dashboard 로컬 실험면 열기" href="http://localhost:4173" external />
                <ActionCard title="Open repo folder" desc={selected.workingFolder} mono />
                <ActionCard title="Main session" desc={selected.session} />
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{selected.name}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{selected.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <GlowPill label={selected.status} tone="emerald" />
                  <GlowPill label={selected.axis} tone="violet" />
                  <GlowPill label={selected.kind} tone="amber" />
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Info label="Slug" value={selected.slug} />
                <Info label="Repo" value={selected.repo} />
                <Info label="Main session" value={selected.session} />
                <Info label="Working folder" value={selected.workingFolder} mono />
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
                <SectionHeading title="Operational rules" />
                <div className="mt-4 space-y-3 text-sm">
                  <RuleRow label="Source of truth" value="filesystem-first" />
                  <RuleRow label="Write policy" value="limited-writeback" />
                  <RuleRow label="Discussion" value={selected.discussion} />
                  <RuleRow label="Recent hint" value={selected.recentHint} />
                </div>
              </section>

              <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
                <SectionHeading title="Feature lane" />
                <div className="mt-4 space-y-3">
                  <FeatureChip title="Project selector" desc="좌측 프로젝트 선택으로 중심 패널 즉시 전환" />
                  <FeatureChip title="Auto summary" desc="PROJECT.md, README.md, STATUS.md 기반 요약 추출" />
                  <FeatureChip title="Workspace-aware registry" desc="github repo + workspace item 동시 표기" />
                </div>
              </section>
            </div>

            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="Promotion rule" />
              <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 text-zinc-300 ${branchTone.callout}`}>
                새 기능은 <strong>SHawn-dashboard</strong>에서 실험하고, 검증 후 <strong>SHawn-WEB /dashboard</strong>로 승격합니다. 이 페이지가 사용자-facing canonical entry입니다.
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="Canonical files" />
              <ul className="mt-4 space-y-2 text-sm">
                {selected.canonicalFiles.map((file) => (
                  <li key={file} className="dashboard-list-item font-mono">
                    {file}
                  </li>
                ))}
              </ul>
            </section>

            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="Signal cards" />
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <SignalCard label="kind" value={selected.kind} />
                <SignalCard label="axis" value={selected.axis} />
                <SignalCard label="file count hint" value={String(selected.fileCountHint)} />
                <SignalCard label="tag" value={selected.tag} />
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}

function SectionHeading({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="dashboard-section-title">{title}</h2>
      {helper ? <span className="text-xs text-zinc-500">{helper}</span> : null}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="dashboard-card rounded-2xl border p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-zinc-400">{sub}</div>
    </div>
  );
}

function GlowPill({ label, tone }: { label: string; tone: "cyan" | "emerald" | "violet" | "amber" }) {
  const toneMap = {
    cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-200",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  };

  return <span className={`rounded-full border px-3 py-2 ${toneMap[tone]}`}>{label}</span>;
}

function ActionCard({ title, desc, href, external = false, mono = false }: { title: string; desc: string; href?: string; external?: boolean; mono?: boolean }) {
  const body = (
    <div className="dashboard-card rounded-2xl border p-4 transition hover:border-white/20 hover:bg-white/[0.06]">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className={`mt-2 text-xs text-zinc-400 ${mono ? "font-mono break-all" : ""}`}>{desc}</div>
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      {body}
    </Link>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="dashboard-card flex flex-col gap-1 rounded-2xl border p-4">
      <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <span className={mono ? "font-mono text-sm text-zinc-200 break-all" : "text-zinc-200"}>{value}</span>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="text-zinc-400">{label}</span>
      <strong className="text-right text-white">{value}</strong>
    </div>
  );
}

function FeatureChip({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="dashboard-card rounded-2xl border p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-xs leading-5 text-zinc-400">{desc}</div>
    </div>
  );
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-card rounded-2xl border p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm text-white">{value}</div>
    </div>
  );
}

function getBranchTone(project?: DashboardProject) {
  const key = `${project?.axis ?? ""}:${project?.tag ?? ""}:${project?.slug ?? ""}`.toLowerCase();

  if (key.includes("bio")) {
    return {
      hero: "border-emerald-400/20 bg-emerald-500/[0.06] shadow-emerald-950/20",
      kicker: "text-emerald-300",
      cardActive: "border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 shadow-lg shadow-emerald-950/20",
      callout: "border-emerald-400/20 bg-emerald-500/5",
      pill: "emerald" as const,
    };
  }

  if (key.includes("onedrive") || key.includes("cloud") || key.includes("discussion")) {
    return {
      hero: "border-amber-400/20 bg-amber-500/[0.06] shadow-amber-950/20",
      kicker: "text-amber-300",
      cardActive: "border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-orange-500/10 shadow-lg shadow-amber-950/20",
      callout: "border-amber-400/20 bg-amber-500/5",
      pill: "amber" as const,
    };
  }

  if (key.includes("dashboard") || key.includes("web") || key.includes("github")) {
    return {
      hero: "border-cyan-400/20 bg-cyan-500/[0.06] shadow-cyan-950/20",
      kicker: "text-cyan-300",
      cardActive: "border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 shadow-lg shadow-cyan-950/20",
      callout: "border-cyan-400/20 bg-cyan-500/5",
      pill: "cyan" as const,
    };
  }

  return {
    hero: "border-violet-400/20 bg-violet-500/[0.06] shadow-violet-950/20",
    kicker: "text-violet-300",
    cardActive: "border-violet-400/40 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 shadow-lg shadow-violet-950/20",
    callout: "border-violet-400/20 bg-violet-500/5",
    pill: "violet" as const,
  };
}
