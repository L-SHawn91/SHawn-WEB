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
    const documentSignals = projects.reduce((sum, project) => sum + project.documentPreview.length, 0);
    const obsidianSignals = projects.reduce((sum, project) => sum + project.obsidianSignals.length, 0);
    const sessionBoundProjects = projects.filter((project) => project.session !== "not-bound").length;
    const discussionBoundProjects = projects.filter((project) => project.discussion !== "not fixed yet").length;
    return {
      repoProjects,
      workspaceProjects,
      activeProjects,
      documentSignals,
      obsidianSignals,
      sessionBoundProjects,
      discussionBoundProjects,
    };
  }, [projects]);

  const branchTone = useMemo(() => getBranchTone(selected), [selected]);

  return (
    <main className="dashboard-shell mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <section className={`dashboard-panel mb-6 overflow-hidden rounded-[28px] border shadow-2xl backdrop-blur-xl ${branchTone.hero}`}>
        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div>
            <div className={`text-xs uppercase tracking-[0.24em] ${branchTone.kicker}`}>Main entry · SHawn-WEB /dashboard</div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">Workspace control starts here.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
              첫 화면은 전체 상태를 빠르게 판독하고, 그 다음 선택한 프로젝트의 working folder·세션·문서 신호로 내려가도록 정리했습니다. prototype은 SHawn-dashboard에 두고, 실제 진입은 여기 `/dashboard`로 고정합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs">
              <GlowPill label={`Projects ${projects.length}`} tone="cyan" />
              <GlowPill label={`Active ${stats.activeProjects}`} tone="emerald" />
              <GlowPill label={`Git repos ${stats.repoProjects}`} tone="violet" />
              <GlowPill label={`Workspace items ${stats.workspaceProjects}`} tone="amber" />
              <GlowPill label={`Focus ${selected?.tag ?? "default"}`} tone={branchTone.pill} />
            </div>
          </div>

          <div className="dashboard-card rounded-3xl border p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Entry flow</div>
            <div className="mt-4 space-y-3">
              <FlowStep index="01" title="Read the pulse" desc="상단 KPI에서 active/repo/workspace/document 상태를 먼저 확인" tone="cyan" />
              <FlowStep index="02" title="Pick the project" desc="좌측 registry에서 프로젝트를 선택하고 중심 패널로 이동" tone="violet" />
              <FlowStep index="03" title="Act from canonical context" desc="working folder, session, canonical files 기준으로 다음 작업 실행" tone="emerald" />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Registry" value={`${projects.length}`} sub={`${stats.repoProjects} repos · ${stats.workspaceProjects} workspace`} tone="cyan" />
        <KpiCard label="Active focus" value={`${stats.activeProjects}`} sub={`${selected?.name ?? "no project"} selected`} tone="emerald" />
        <KpiCard label="Document signals" value={`${stats.documentSignals}`} sub={`${stats.obsidianSignals} obsidian matches`} tone="violet" />
        <KpiCard label="Ops binding" value={`${stats.sessionBoundProjects}/${projects.length}`} sub={`${stats.discussionBoundProjects} discussion links`} tone="amber" />
      </section>

      {!selected ? (
        <section className="dashboard-panel rounded-3xl border p-6 text-zinc-300">
          읽을 수 있는 프로젝트 메타가 아직 없습니다.
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_340px]">
          <aside className="space-y-6 xl:order-1">
            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="1 · Project registry" helper="click to inspect" />
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

          </aside>

          <section className="space-y-6 xl:order-2">
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
                <SectionHeading title="2 · Operating lane" helper="next action context" />
                <div className="mt-4 space-y-3">
                  <LaneRow step="A" title="Canonical folder" value={selected.workingFolder} mono />
                  <LaneRow step="B" title="Session handoff" value={selected.session} />
                  <LaneRow step="C" title="Discussion thread" value={selected.discussion} />
                </div>
              </section>

              <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
                <SectionHeading title="3 · Guardrails" />
                <div className="mt-4 space-y-3 text-sm">
                  <RuleRow label="Source of truth" value="filesystem-first" />
                  <RuleRow label="Write policy" value="limited-writeback" />
                  <RuleRow label="Discussion" value={selected.discussion} />
                  <RuleRow label="Recent hint" value={selected.recentHint} />
                </div>
              </section>

            </div>

            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="4 · Promotion rule" />
              <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 text-zinc-300 ${branchTone.callout}`}>
                새 기능은 <strong>SHawn-dashboard</strong>에서 실험하고, 검증 후 <strong>SHawn-WEB /dashboard</strong>로 승격합니다. 이 페이지가 사용자-facing canonical entry입니다.
              </div>
            </section>
          </section>

          <aside className="space-y-6 xl:order-3">
            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="5 · Quick actions" />
              <div className="mt-4 grid gap-3">
                <ActionCard title="Open legacy prototype" desc="기존 SHawn-dashboard 로컬 실험면 열기" href="http://localhost:4173" external />
                <ActionCard title="Open working folder" desc={selected.workingFolder} mono />
                <ActionCard title="Main session" desc={selected.session} />
              </div>
            </section>

            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="6 · Canonical files" />
              <ul className="mt-4 space-y-2 text-sm">
                {selected.canonicalFiles.map((file) => (
                  <li key={file} className="dashboard-list-item font-mono">
                    {file}
                  </li>
                ))}
              </ul>
            </section>

            <section className="dashboard-panel rounded-3xl border p-5 backdrop-blur">
              <SectionHeading title="7 · Signal cards" />
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

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "cyan" | "emerald" | "violet" | "amber";
}) {
  const toneMap = {
    cyan: "border-cyan-400/20 bg-cyan-500/[0.07] text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-200",
    violet: "border-violet-400/20 bg-violet-500/[0.07] text-violet-200",
    amber: "border-amber-400/20 bg-amber-500/[0.07] text-amber-200",
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-lg shadow-black/20 ${toneMap[tone]}`}>
      <div className="text-xs uppercase tracking-[0.16em] text-current/70">{label}</div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-zinc-400">{sub}</div>
    </div>
  );
}

function FlowStep({ index, title, desc, tone }: { index: string; title: string; desc: string; tone: "cyan" | "emerald" | "violet" }) {
  const toneMap = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  };

  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${toneMap[tone]}`}>{index}</span>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-zinc-400">{desc}</div>
      </div>
    </div>
  );
}

function LaneRow({ step, title, value, mono = false }: { step: string; title: string; value: string; mono?: boolean }) {
  return (
    <div className="dashboard-card rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">{step}</span>
        <div className="text-sm font-semibold text-white">{title}</div>
      </div>
      <div className={`mt-2 text-xs leading-5 text-zinc-400 ${mono ? "break-all font-mono" : ""}`}>{value}</div>
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
