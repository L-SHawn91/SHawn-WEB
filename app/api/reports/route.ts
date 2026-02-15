import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type ReportItem = {
  date?: string;
  time?: string;
  type?: string;
  title?: string;
  path?: string;
  json_path?: string;
  filename?: string;
  timestamp?: string;
};

let _cache: { mtimeMs: number; items: ReportItem[] } | null = null;

async function loadIndex(): Promise<ReportItem[]> {
  const filePath = path.join(process.cwd(), "public", "reports", "index.json");
  const st = await fs.stat(filePath);
  if (_cache && _cache.mtimeMs === st.mtimeMs) return _cache.items;

  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? (parsed as ReportItem[]) : [];
  _cache = { mtimeMs: st.mtimeMs, items };
  return items;
}

function asInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const type = (url.searchParams.get("type") || "").trim().toUpperCase(); // KR | US | ""
  const date = (url.searchParams.get("date") || "").trim(); // YYYY-MM-DD
  const offset = Math.max(0, asInt(url.searchParams.get("offset"), 0));
  const limit = Math.min(200, Math.max(1, asInt(url.searchParams.get("limit"), 50)));

  try {
    let items = await loadIndex();

    // Normalize + sort newest first.
    items = items
      .filter((x) => x && typeof x === "object")
      .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));

    if (type === "KR" || type === "US") {
      items = items.filter((x) => String(x.type || "").toUpperCase() === type);
    }
    if (date) {
      items = items.filter((x) => String(x.date || "") === date);
    }
    if (q) {
      items = items.filter((x) => {
        const hay = `${x.title || ""} ${x.type || ""} ${x.date || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const total = items.length;
    const page = items.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const hasMore = nextOffset < total;

    return NextResponse.json(
      {
        items: page,
        total,
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
      },
      {
        headers: {
          // index.json changes only when new reports are published.
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

