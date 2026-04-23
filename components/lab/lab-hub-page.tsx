"use client";

import { useEffect, useState } from "react";
import { BarChart3, Bot, FlaskConical } from "lucide-react";
import { LabStatusCard, type ModuleStatus } from "./lab-status-card";

type LabStatusResponse = {
  inv?: ModuleStatus;
  bio?: ModuleStatus;
  bot?: ModuleStatus;
  generatedAt?: string;
};

const DEFAULT_STATUS: ModuleStatus = { module: "inv", status: "unknown" };

export function LabHubPageInner() {
  const [data, setData] = useState<LabStatusResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lab/status", { cache: "no-store" });
        const json: LabStatusResponse = res.ok ? await res.json() : {};
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inv = data.inv ?? { ...DEFAULT_STATUS, module: "inv" };
  const bio = data.bio ?? { ...DEFAULT_STATUS, module: "bio" };
  const bot = data.bot ?? { ...DEFAULT_STATUS, module: "bot" };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">SHawn Lab</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">통합 운영 허브</h1>
          <p className="mt-2 text-sm text-gray-300">
            SHawn-INV · SHawn-BIO · SHawn-BOT 생태계 상태를 한 화면에 집계합니다.
          </p>
          {error ? (
            <p className="mt-3 text-sm text-rose-300">상태 로드 실패: {error}</p>
          ) : null}
          {loading ? (
            <p className="mt-3 text-sm text-gray-400">로딩 중…</p>
          ) : null}
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <LabStatusCard
            heading="SHawn-INV"
            accent="border-blue-500/30"
            icon={BarChart3}
            status={inv}
            deepLink={{ href: "/invest", label: "투자 워크스페이스" }}
          />
          <LabStatusCard
            heading="SHawn-BIO"
            accent="border-emerald-500/30"
            icon={FlaskConical}
            status={bio}
            deepLink={{ href: "/bio", label: "BIO 리서치 허브" }}
          />
          <LabStatusCard
            heading="SHawn-BOT"
            accent="border-purple-500/30"
            icon={Bot}
            status={bot}
            deepLink={{ href: "/admin", label: "관리자 콘솔" }}
          />
        </section>

        <footer className="mt-8 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-xs text-gray-400">
          상태 집계 시각: {data.generatedAt || "-"} · /api/lab/status 응답 기반
        </footer>
      </div>
    </div>
  );
}
