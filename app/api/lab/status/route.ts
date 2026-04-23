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

async function botStatus(): Promise<ModuleStatus> {
  const base = process.env.GCP_BRAIN_URL;
  if (!base) {
    return {
      module: "bot",
      status: "unknown",
      detail: "GCP_BRAIN_URL not configured",
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${base.replace(/\/$/, "")}/healthz`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) {
      return {
        module: "bot",
        status: "ok",
        updatedAt: new Date().toISOString(),
        detail: `HTTP ${res.status}`,
      };
    }
    return {
      module: "bot",
      status: "error",
      detail: `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      module: "bot",
      status: "unknown",
      detail: (e as Error).message || "healthz unreachable",
    };
  }
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
