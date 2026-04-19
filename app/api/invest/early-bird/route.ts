import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type EarlyBirdSignal = {
  ticker: string;
  grade: string;
  action: string;
  reason: string;
  changePct?: number;
  market?: string;
};

type EarlyBirdPayload = {
  generatedAt?: string;
  session?: string;
  signals?: EarlyBirdSignal[];
  summary?: { count?: number; topTicker?: string | null };
};

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "..", "projects", "early_bird_signals.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as EarlyBirdPayload;

    return NextResponse.json(
      {
        generatedAt: parsed.generatedAt || null,
        session: parsed.session || "early-bird",
        summary: parsed.summary || { count: parsed.signals?.length || 0, topTicker: null },
        signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        generatedAt: null,
        session: "early-bird",
        summary: { count: 0, topTicker: null },
        signals: [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
