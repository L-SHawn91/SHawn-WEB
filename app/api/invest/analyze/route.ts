import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";
import fs from "fs";

const execPromise = util.promisify(exec);

const INV_REPO_PATH = process.env.INV_REPO_PATH || "/Users/soohyunglee/GitHub/SHawn-INV";
const SCRIPT_PATH = path.join(INV_REPO_PATH, "tools/analyze_ticker.py");
const UV_PATH = process.env.UV_PATH || "/Users/soohyunglee/.local/bin/uv";

type AnalyzePayload = {
  ticker: string;
  name: string;
  score: number;
  rank: number;
  synthesis_verdict: string;
  scores: {
    expert: number;
    whale: number;
    macro: number;
    news: number;
  };
  details: {
    expert: string[];
    whale: string[];
    macro: string[];
    news: string[];
  };
  future_value: {
    prediction: string;
    rationale: string;
  };
  external_consensus: string;
  whale_activity: string;
  badges: string[];
  price_info: {
    current: number;
    change_pct: number;
    currency: string;
  };
  price_trend?: {
    period: string;
    points: number[];
    dates: string[];
    start: number;
    end: number;
  };
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function computeRsi(values: number[], period = 14) {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function verdict(score: number) {
  if (score >= 70) return "Strong Buy (Fallback)";
  if (score >= 60) return "Buy (Fallback)";
  if (score >= 55) return "Watch (Fallback)";
  return "Neutral/Watch";
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  return await response.json();
}

async function callRemoteAnalyzerData(endpoint: string, ticker: string): Promise<AnalyzePayload> {
  const url = new URL(endpoint);
  url.searchParams.set("ticker", ticker);
  const token = process.env.INV_ANALYZE_TOKEN;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`remote analyzer failed: ${response.status}`);
  }
  return (await response.json()) as AnalyzePayload;
}

async function callLocalAnalyzerData(ticker: string): Promise<AnalyzePayload | null> {
  if (!fs.existsSync(INV_REPO_PATH) || !fs.existsSync(SCRIPT_PATH) || !fs.existsSync(UV_PATH)) {
    return null;
  }
  const command = `cd "${INV_REPO_PATH}" && "${UV_PATH}" run python "${SCRIPT_PATH}" "${ticker}"`;
  const { stdout } = await execPromise(command);
  return JSON.parse(stdout) as AnalyzePayload;
}

async function buildYahooFallback(ticker: string): Promise<AnalyzePayload | null> {
  const quoteJson = await fetchJson(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`
  );
  const quote = quoteJson?.quoteResponse?.result?.[0];
  if (!quote) return null;

  const chartJson = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker
    )}?range=6mo&interval=1d`
  );
  const result = chartJson?.chart?.result?.[0];
  const timestamps: number[] = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const closesRaw: Array<number | null> =
    result?.indicators?.quote?.[0]?.close && Array.isArray(result.indicators.quote[0].close)
      ? result.indicators.quote[0].close
      : [];

  const points: number[] = [];
  const dates: string[] = [];
  for (let i = 0; i < Math.min(timestamps.length, closesRaw.length); i += 1) {
    const close = closesRaw[i];
    if (typeof close === "number" && Number.isFinite(close)) {
      points.push(Number(close.toFixed(4)));
      dates.push(new Date(timestamps[i] * 1000).toISOString().slice(0, 10));
    }
  }

  const current =
    Number(quote.regularMarketPrice) ||
    (points.length ? points[points.length - 1] : 0);
  const prevClose =
    Number(quote.regularMarketPreviousClose) ||
    (points.length >= 2 ? points[points.length - 2] : current);

  if (!current || !prevClose) return null;

  const changePct = ((current - prevClose) / prevClose) * 100;
  const rsi = computeRsi(points.length >= 20 ? points : [prevClose, current]);

  const ret20 =
    points.length >= 21 ? ((points[points.length - 1] / points[points.length - 21]) - 1) * 100 : changePct;
  const ret60 =
    points.length >= 61 ? ((points[points.length - 1] / points[points.length - 61]) - 1) * 100 : ret20;

  let expert = 50;
  if (ret20 >= 12) expert += 18;
  else if (ret20 >= 5) expert += 10;
  else if (ret20 <= -12) expert -= 18;
  else if (ret20 <= -5) expert -= 10;
  if (rsi >= 78) expert -= 6;
  else if (rsi <= 28) expert += 4;
  else if (rsi >= 45 && rsi <= 65) expert += 6;
  expert = clamp(expert);

  const whale = 50;
  const macro = 50;
  const news = 50;
  const score = Number((expert * 0.4 + whale * 0.3 + macro * 0.2 + news * 0.1).toFixed(1));
  const currency = String(quote.currency || "").toUpperCase() === "KRW" ? "KRW" : "USD";
  const rawName = String(quote.longName || quote.shortName || ticker).trim();
  const name = rawName.toUpperCase() === ticker ? ticker : `${rawName} (${ticker})`;

  return {
    ticker,
    name,
    score,
    rank: 0,
    synthesis_verdict: verdict(score),
    scores: { expert, whale, macro, news },
    details: {
      expert: [
        `Fallback momentum(20d): ${ret20.toFixed(2)}%`,
        `Fallback RSI(14): ${rsi.toFixed(1)}`,
      ],
      whale: ["Fallback mode: no institutional flow feed"],
      macro: ["Fallback mode: neutral macro baseline"],
      news: ["Fallback mode: no external news pipeline"],
    },
    future_value: {
      prediction: "N/A",
      rationale: "Fallback analyzer active (Yahoo market data only).",
    },
    external_consensus: "Fallback",
    whale_activity: "Neutral",
    badges: ["Fallback"],
    price_info: {
      current: Number(current.toFixed(4)),
      change_pct: Number(changePct.toFixed(4)),
      currency,
    },
    ...(points.length >= 3
      ? {
          price_trend: {
            period: "6M",
            points: points.slice(-60),
            dates: dates.slice(-60),
            start: points[Math.max(0, points.length - 60)],
            end: points[points.length - 1],
          },
        }
      : {}),
  };
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "Ticker parameter is required" }, { status: 400 });
  }

  const safeTicker = ticker.replace(/[^a-zA-Z0-9.\-^]/g, "").toUpperCase();
  const errors: string[] = [];

  try {
    const endpoint = process.env.INV_ANALYZE_ENDPOINT?.trim();
    if (endpoint) {
      const payload = await callRemoteAnalyzerData(endpoint, safeTicker);
      return NextResponse.json(payload);
    }
  } catch (error: any) {
    errors.push(`remote: ${error?.message || "failed"}`);
  }

  try {
    const localPayload = await callLocalAnalyzerData(safeTicker);
    if (localPayload) return NextResponse.json(localPayload);
  } catch (error: any) {
    errors.push(`local: ${error?.message || "failed"}`);
  }

  try {
    const fallback = await buildYahooFallback(safeTicker);
    if (fallback) return NextResponse.json(fallback);
  } catch (error: any) {
    errors.push(`fallback: ${error?.message || "failed"}`);
  }

  return NextResponse.json(
    {
      error: "Analyzer unavailable",
      details:
        "Set INV_ANALYZE_ENDPOINT or configure INV_REPO_PATH/UV_PATH. Fallback analyzer also failed.",
      trace: errors,
    },
    { status: 503 }
  );
}
