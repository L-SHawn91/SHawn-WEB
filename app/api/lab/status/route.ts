import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type IndexItem = {
  date?: string;
  time?: string;
  type?: string;
  slug?: string;
  title?: string;
  summary?: string;
  timestamp?: string;
};

type ModuleStatus = {
  module: "inv" | "bio" | "bot";
  status: "ok" | "empty" | "unknown" | "error";
  updatedAt?: string;
  total?: number;
  latest?: {
    title?: string;
    date?: string;
    type?: string;
    href?: string;
  } | null;
  detail?: string;
};

async function readIndex(relPath: string): Promise<IndexItem[]> {
  const full = path.join(process.cwd(), "public", relPath, "index.json");
  try {
    const raw = await fs.readFile(full, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IndexItem[]) : [];
  } catch {
    return [];
  }
}

async function invStatus(): Promise<ModuleStatus> {
  const items = await readIndex("reports");
  const sorted = [...items].sort((a, b) =>
    String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );
  const latest = sorted[0];
  if (!latest) {
    return { module: "inv", status: "empty", total: 0, latest: null };
  }
  return {
    module: "inv",
    status: "ok",
    updatedAt: latest.timestamp,
    total: sorted.length,
    latest: {
      title: latest.title,
      date: latest.date,
      type: latest.type,
      href: "/invest/reports",
    },
  };
}

async function bioStatus(): Promise<ModuleStatus> {
  const items = await readIndex("bio-data");
  const sorted = [...items].sort((a, b) =>
    String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );
  const latest = sorted[0];
  if (!latest) {
    return { module: "bio", status: "empty", total: 0, latest: null };
  }
  return {
    module: "bio",
    status: "ok",
    updatedAt: latest.timestamp,
    total: sorted.length,
    latest: {
      title: latest.title,
      date: latest.date,
      type: latest.type,
      href: "/bio/research",
    },
  };
}

const BOT_TIMEOUT_MS = 2500;
const BOT_MAX_ATTEMPTS = 2;

async function probeHealthz(
  url: string
): Promise<{ status: "ok" | "error" | "unknown"; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BOT_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const dur = Date.now() - started;
    if (res.ok) return { status: "ok", detail: `HTTP ${res.status} in ${dur}ms` };
    return { status: "error", detail: `HTTP ${res.status} in ${dur}ms` };
  } catch (e) {
    const dur = Date.now() - started;
    const err = e as Error;
    if (err?.name === "AbortError") {
      return { status: "unknown", detail: `timeout after ${dur}ms` };
    }
    return { status: "unknown", detail: `${err?.message || "network error"} after ${dur}ms` };
  } finally {
    clearTimeout(timer);
  }
}

async function botStatus(): Promise<ModuleStatus> {
  const base = process.env.GCP_BRAIN_URL;
  if (!base) {
    return {
      module: "bot",
      status: "unknown",
      detail: "GCP_BRAIN_URL not configured",
    };
  }
  const target = `${base.replace(/\/$/, "")}/healthz`;
  let attempts = 0;
  let last: { status: "ok" | "error" | "unknown"; detail: string } = {
    status: "unknown",
    detail: "no attempts",
  };
  while (attempts < BOT_MAX_ATTEMPTS) {
    attempts += 1;
    last = await probeHealthz(target);
    if (last.status === "ok" || last.status === "error") break;
  }
  return {
    module: "bot",
    status: last.status,
    updatedAt: new Date().toISOString(),
    detail: `${last.detail} (attempt ${attempts}/${BOT_MAX_ATTEMPTS})`,
  };
}

export async function GET() {
  const [inv, bio, bot] = await Promise.all([invStatus(), bioStatus(), botStatus()]);
  return NextResponse.json(
    { inv, bio, bot, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
      },
    }
  );
}
