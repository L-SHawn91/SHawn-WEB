import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const INDEX_PATH = path.join(process.cwd(), "public", "bio-data", "index.json");

type BioItem = {
  date?: string;
  type?: string;
  slug?: string;
  title?: string;
  summary?: string;
  tags?: string[];
  timestamp?: string;
};

async function localFallback() {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf-8");
    const items: BioItem[] = JSON.parse(raw);
    const sorted = [...items].sort((a, b) =>
      String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
    );
    const latest = sorted[0];
    const byType: Record<string, number> = {};
    for (const it of sorted) {
      const t = String(it.type || "NOTE").toUpperCase();
      byType[t] = (byType[t] || 0) + 1;
    }
    return {
      source: "local-index",
      updatedAt: latest?.timestamp || new Date().toISOString(),
      total: sorted.length,
      byType,
      latest: latest
        ? {
            date: latest.date,
            type: latest.type,
            slug: latest.slug,
            title: latest.title,
            summary: latest.summary,
            tags: latest.tags || [],
          }
        : null,
    };
  } catch {
    return {
      source: "local-index",
      updatedAt: new Date().toISOString(),
      total: 0,
      byType: {},
      latest: null,
    };
  }
}

export async function GET() {
  const upstream = process.env.SHAWN_BIO_SNAPSHOT_URL;

  if (upstream) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(upstream, {
        headers: { accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(
          { source: "upstream", upstream, ...data },
          {
            headers: {
              "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
            },
          }
        );
      }
    } catch {
      // fall through to local
    }
  }

  const local = await localFallback();
  return NextResponse.json(local, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
