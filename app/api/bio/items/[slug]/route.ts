import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const BIO_ROOT = path.join(process.cwd(), "public", "bio-data");

function safeSlug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = safeSlug(params.slug || "");
  if (!slug) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  try {
    const entries = await fs.readdir(BIO_ROOT).catch(() => [] as string[]);
    const match = entries.find((f) => {
      if (!f.endsWith(".json") || f === "index.json") return false;
      const base = f.replace(/\.json$/i, "");
      const m = base.match(/^\d{4}-\d{2}-\d{2}_[A-Z]+_(.+)$/i);
      const fileSlug = m ? m[1] : base;
      return fileSlug === slug || base === slug;
    });

    if (!match) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const full = path.join(BIO_ROOT, match);
    const raw = await fs.readFile(full, "utf-8");
    const parsed = JSON.parse(raw);

    return NextResponse.json(
      { filename: match, data: parsed },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
