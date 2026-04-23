"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Database, FlaskConical, Microscope } from "lucide-react";
import { BioLayout, BioCard, BioLayoutTab, bioUiClass } from "./bio-layout";

type BioItem = {
  date?: string;
  type?: string;
  slug?: string;
  title?: string;
  summary?: string;
  tags?: string[];
  filename?: string;
  json_path?: string;
  timestamp?: string;
};

type BioIndexResponse = {
  items?: BioItem[];
  total?: number;
  hasMore?: boolean;
};

type BioSnapshot = {
  source?: string;
  updatedAt?: string;
  total?: number;
  byType?: Record<string, number>;
  latest?: BioItem | null;
};

type Panel = "overview" | "research" | "archive";

const PANEL_TO_TAB: Record<Panel, BioLayoutTab> = {
  overview: "overview",
  research: "research",
  archive: "archive",
};

const PANEL_TITLE: Record<Panel, { title: string; description: string }> = {
  overview: {
    title: "BIO 리서치 개요",
    description: "SHawn-BIO에서 publish된 최신 노트, 오가노이드 마일스톤, 데이터셋 진입점",
  },
  research: {
    title: "연구 노트 피드",
    description: "SHawn-BIO publish_bio_feed.py가 SHawn-WEB/public/bio-data로 전송한 연구 노트",
  },
  archive: {
    title: "BIO 아카이브",
    description: "과거 BIO 노트·오가노이드 기록·프로토콜의 시계열 저장소",
  },
};

function formatRelative(timestamp?: string): string {
  if (!timestamp) return "-";
  const t = new Date(timestamp).getTime();
  if (!Number.isFinite(t)) return timestamp;
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  return `${day}일 전`;
}

function typeTone(type?: string): string {
  const t = String(type || "").toUpperCase();
  if (t === "ORGANOID") return "text-emerald-200 bg-emerald-500/10 border-emerald-400/30";
  if (t === "DATASET") return "text-indigo-200 bg-indigo-500/10 border-indigo-400/30";
  if (t === "PAPER") return "text-sky-200 bg-sky-500/10 border-sky-400/30";
  if (t === "PROTOCOL") return "text-amber-200 bg-amber-500/10 border-amber-400/30";
  return "text-slate-200 bg-slate-500/10 border-slate-400/30";
}

export function BioHubPageInner({ forcedPanel }: { forcedPanel: Panel }) {
  const [items, setItems] = useState<BioItem[]>([]);
  const [snapshot, setSnapshot] = useState<BioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [idxRes, snapRes] = await Promise.all([
          fetch("/api/bio/index?limit=50", { cache: "no-store" }),
          fetch("/api/bio/snapshot", { cache: "no-store" }),
        ]);
        const idx: BioIndexResponse = idxRes.ok ? await idxRes.json() : {};
        const snap: BioSnapshot = snapRes.ok ? await snapRes.json() : {};
        if (cancelled) return;
        setItems(idx.items || []);
        setSnapshot(snap);
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

  const researchItems = useMemo(
    () => items.filter((x) => ["NOTE", "ORGANOID", "PROTOCOL"].includes(String(x.type || ""))),
    [items]
  );

  const panelMeta = PANEL_TITLE[forcedPanel];
  const currentTab = PANEL_TO_TAB[forcedPanel];

  return (
    <BioLayout currentTab={currentTab} title={panelMeta.title} description={panelMeta.description}>
      {forcedPanel === "overview" ? (
        <OverviewPanel
          items={items}
          snapshot={snapshot}
          loading={loading}
          error={error}
        />
      ) : null}
      {forcedPanel === "research" ? (
        <FeedPanel items={researchItems} loading={loading} error={error} emptyLabel="연구 노트 없음" />
      ) : null}
      {forcedPanel === "archive" ? (
        <FeedPanel items={items} loading={loading} error={error} emptyLabel="아카이브 비어 있음" />
      ) : null}
    </BioLayout>
  );
}

function OverviewPanel({
  items,
  snapshot,
  loading,
  error,
}: {
  items: BioItem[];
  snapshot: BioSnapshot | null;
  loading: boolean;
  error: string | null;
}) {
  const latest = snapshot?.latest || items[0];
  const byType = snapshot?.byType || {};
  const total = snapshot?.total ?? items.length;

  return (
    <div className={`${bioUiClass.grid} grid-cols-1 md:grid-cols-3`}>
      <BioCard title="피드 상태">
        {loading ? (
          <p className="text-sm text-gray-400">로딩 중…</p>
        ) : error ? (
          <p className="text-sm text-rose-300">에러: {error}</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-gray-300">
              총 항목: <span className="font-semibold text-white">{total}</span>
            </p>
            <p className="text-gray-300">
              소스: <span className="font-mono text-xs text-emerald-300">{snapshot?.source || "local-index"}</span>
            </p>
            <p className="text-gray-300">
              최근 갱신: <span className="text-white">{formatRelative(snapshot?.updatedAt)}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(byType).map(([t, n]) => (
                <span key={t} className={`${bioUiClass.badge} ${typeTone(t)}`}>
                  {t} · {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </BioCard>

      <BioCard title="최신 노트">
        {latest ? (
          <div className="space-y-2">
            <span className={`${bioUiClass.badge} ${typeTone(latest.type)}`}>{latest.type}</span>
            <h4 className="text-base font-semibold text-white">{latest.title}</h4>
            <p className="text-sm text-gray-300">{latest.summary || "요약 없음"}</p>
            <p className="text-xs text-gray-500">
              {latest.date} · {formatRelative(latest.timestamp)}
            </p>
            {latest.slug ? (
              <Link
                href={`/api/bio/items/${latest.slug}`}
                className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
              >
                원문 JSON <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-400">아직 피드 데이터가 없습니다.</p>
        )}
      </BioCard>

      <BioCard title="진입점">
        <div className="space-y-3">
          <Link
            href="/bio/research"
            className="group flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 transition hover:border-emerald-400"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <FlaskConical className="h-4 w-4 text-emerald-400" /> 연구 노트
            </span>
            <ArrowRight className="h-4 w-4 text-emerald-300 transition group-hover:translate-x-1" />
          </Link>
          <Link
            href="/bio/papers"
            className="group flex items-center justify-between rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 transition hover:border-sky-400"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <BookOpen className="h-4 w-4 text-sky-400" /> Papers 검색
            </span>
            <ArrowRight className="h-4 w-4 text-sky-300 transition group-hover:translate-x-1" />
          </Link>
          <Link
            href="/bio/datasets"
            className="group flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 transition hover:border-indigo-400"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <Database className="h-4 w-4 text-indigo-400" /> Datasets 검색
            </span>
            <ArrowRight className="h-4 w-4 text-indigo-300 transition group-hover:translate-x-1" />
          </Link>
          <Link
            href="/lab"
            className="group flex items-center justify-between rounded-lg border border-white/20 bg-white/5 p-3 transition hover:border-white/50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <Microscope className="h-4 w-4 text-white" /> 통합 Lab 허브
            </span>
            <ArrowRight className="h-4 w-4 text-white transition group-hover:translate-x-1" />
          </Link>
        </div>
      </BioCard>
    </div>
  );
}

function FeedPanel({
  items,
  loading,
  error,
  emptyLabel,
}: {
  items: BioItem[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
}) {
  if (loading) return <BioCard>로딩 중…</BioCard>;
  if (error) return <BioCard><span className="text-rose-300">에러: {error}</span></BioCard>;
  if (!items.length) return <BioCard>{emptyLabel}</BioCard>;

  return (
    <div className={`${bioUiClass.grid} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`}>
      {items.map((item) => (
        <BioCard key={item.filename || item.slug}>
          <div className="space-y-2">
            <span className={`${bioUiClass.badge} ${typeTone(item.type)}`}>{item.type}</span>
            <h4 className="text-base font-semibold text-white">{item.title}</h4>
            {item.summary ? (
              <p className="text-sm text-gray-300 line-clamp-3">{item.summary}</p>
            ) : null}
            <p className="text-xs text-gray-500">
              {item.date} · {formatRelative(item.timestamp)}
            </p>
            {(item.tags || []).length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(item.tags || []).slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            {item.slug ? (
              <Link
                href={`/api/bio/items/${item.slug}`}
                className="inline-flex items-center gap-1 pt-1 text-xs text-emerald-300 hover:text-emerald-200"
              >
                원문 <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        </BioCard>
      ))}
    </div>
  );
}
