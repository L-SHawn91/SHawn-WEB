import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import fs from "fs";

const execFilePromise = promisify(execFile);

const INV_REPO_PATH = process.env.INV_REPO_PATH || "";
const SCRIPT_PATH = INV_REPO_PATH ? path.join(INV_REPO_PATH, "tools/analyze_ticker.py") : "";
const UV_PATH = process.env.UV_PATH || "uv";

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

type SearchResolved = {
  ticker: string;
  displayName?: string;
};

const QUERY_ALIAS_MAP: Record<string, SearchResolved> = {
  "삼성전자": { ticker: "005930.KS", displayName: "삼성전자" },
  "삼성전자우": { ticker: "005935.KS", displayName: "삼성전자우" },
  "sk하이닉스": { ticker: "000660.KS", displayName: "SK하이닉스" },
  "애플": { ticker: "AAPL", displayName: "Apple Inc." },
  "apple": { ticker: "AAPL", displayName: "Apple Inc." },
  "tesla": { ticker: "TSLA", displayName: "Tesla, Inc." },
  "테슬라": { ticker: "TSLA", displayName: "Tesla, Inc." },
  "nvidia": { ticker: "NVDA", displayName: "NVIDIA Corporation" },
  "엔비디아": { ticker: "NVDA", displayName: "NVIDIA Corporation" },
  "microsoft": { ticker: "MSFT", displayName: "Microsoft Corporation" },
  "마이크로소프트": { ticker: "MSFT", displayName: "Microsoft Corporation" },
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

function normalizeTickerInput(value: string): string {
  return String(value || "").trim().toUpperCase();
}

function looksLikeTicker(value: string): boolean {
  const raw = String(value || "").trim();
  const v = normalizeTickerInput(raw);
  if (!v) return false;
  const isExplicitTickerCase = raw === raw.toUpperCase();
  if (/^\d{6}\.(KS|KQ)$/.test(v)) return true;
  if (/^[A-Z][A-Z0-9.\-^]{0,14}$/.test(v) && isExplicitTickerCase) return true;
  return false;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  return await response.json();
}

async function fetchText(url: string, encoding: string = "utf-8") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  const bytes = await response.arrayBuffer();
  return new TextDecoder(encoding).decode(bytes);
}

function scoreSearchMatch(input: string, itemName: string, code: string): number {
  const q = input.trim().toLowerCase();
  const n = itemName.trim().toLowerCase();
  const c = code.trim().toLowerCase();
  if (!q) return 0;
  if (n === q || c === q) return 100;
  if (n.startsWith(q)) return 85;
  if (n.includes(q)) return 70;
  if (c.startsWith(q)) return 60;
  return 10;
}

async function resolveTickerFromQuery(rawQuery: string): Promise<SearchResolved> {
  const query = String(rawQuery || "").trim();
  if (!query) throw new Error("Ticker or company name is required");

  const alias = QUERY_ALIAS_MAP[query.toLowerCase()];
  if (alias) return alias;

  if (looksLikeTicker(query)) {
    return { ticker: normalizeTickerInput(query) };
  }

  const url =
    `https://m.stock.naver.com/front-api/search?target=stock&size=20&page=1&q=${encodeURIComponent(query)}`;
  const data = await fetchJson(url);
  const items: any[] = Array.isArray(data?.result?.items) ? data.result.items : [];
  if (!items.length) throw new Error(`No matched ticker for query: ${query}`);

  const ranked = items
    .map((item) => {
      const code = String(item?.code || "").trim().toUpperCase();
      const name = String(item?.name || "").trim();
      const nation = String(item?.nationCode || "").trim().toUpperCase();
      const typeCode = String(item?.typeCode || "").trim().toUpperCase();
      let ticker = code;
      if (nation === "KOR" && /^\d{6}$/.test(code)) {
        ticker = `${code}.${typeCode === "KOSDAQ" ? "KQ" : "KS"}`;
      }
      const baseScore = scoreSearchMatch(query, name, code);
      const nationBoost = nation === "KOR" || nation === "USA" ? 8 : 0;
      return {
        ticker,
        displayName: name || ticker,
        score: baseScore + nationBoost,
      };
    })
    .filter((row) => row.ticker)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) throw new Error(`No valid ticker resolved for query: ${query}`);
  return {
    ticker: ranked[0].ticker,
    displayName: ranked[0].displayName,
  };
}

function applyPreferredName(payload: AnalyzePayload, preferredName?: string): AnalyzePayload {
  const ticker = String(payload?.ticker || "").trim();
  if (!ticker) return payload;
  const rawName = String(payload?.name || "").trim();
  const safePreferred = String(preferredName || "").trim();
  const nameLooksBroken = !rawName || rawName === ticker || rawName.includes("�");
  if (safePreferred && nameLooksBroken) {
    return { ...payload, name: `${safePreferred} (${ticker})` };
  }
  return payload;
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
  const uvExists = path.isAbsolute(UV_PATH) ? fs.existsSync(UV_PATH) : true;
  if (!INV_REPO_PATH || !fs.existsSync(INV_REPO_PATH) || !fs.existsSync(SCRIPT_PATH) || !uvExists) {
    return null;
  }
  const { stdout } = await execFilePromise(UV_PATH, ["run", "python", SCRIPT_PATH, ticker], { cwd: INV_REPO_PATH });
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

function buildPayloadFromSeries(
  ticker: string,
  name: string,
  currency: "USD" | "KRW",
  points: number[],
  dates: string[]
): AnalyzePayload | null {
  if (points.length < 2) return null;
  const current = points[points.length - 1];
  const prevClose = points[points.length - 2];
  const changePct = ((current - prevClose) / prevClose) * 100;
  const rsi = computeRsi(points.length >= 20 ? points : [prevClose, current]);
  const ret20 =
    points.length >= 21 ? ((points[points.length - 1] / points[points.length - 21]) - 1) * 100 : changePct;

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

  const cleanName = name.trim();
  const displayName = cleanName && cleanName.toUpperCase() !== ticker ? `${cleanName} (${ticker})` : ticker;

  return {
    ticker,
    name: displayName,
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
      rationale: "Fallback analyzer active (market data only).",
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

async function buildStooqFallback(ticker: string): Promise<AnalyzePayload | null> {
  const isKr = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  if (isKr) return null;

  const symbol = `${ticker.toLowerCase()}.us`;
  const quoteCsv = await fetchText(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcvn&e=csv`);
  const quoteLine = quoteCsv.trim().split("\n")[0] || "";
  const quoteCols = quoteLine.split(",");
  if (quoteCols.length < 9 || quoteCols[1] === "N/D") return null;
  const companyName = quoteCols[8] || ticker;

  const histCsv = await fetchText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`);
  const lines = histCsv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","))
    .filter((cols) => cols.length >= 6);

  const points: number[] = [];
  const dates: string[] = [];
  for (const cols of lines) {
    const date = cols[0];
    const close = Number(cols[4]);
    if (Number.isFinite(close) && close > 0) {
      points.push(close);
      dates.push(date);
    }
  }

  return buildPayloadFromSeries(ticker, companyName, "USD", points.slice(-180), dates.slice(-180));
}

async function buildNaverKrFallback(ticker: string): Promise<AnalyzePayload | null> {
  const isKr = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  if (!isKr) return null;
  const code = ticker.split(".")[0];

  const xml = await fetchText(
    `https://fchart.stock.naver.com/sise.nhn?symbol=${encodeURIComponent(code)}&timeframe=day&count=120&requestType=0`,
    "euc-kr"
  );
  const items = [...xml.matchAll(/<item\s+data="(\d{8})\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^"]+)"\s*\/>/g)];
  if (items.length < 2) return null;

  const points: number[] = [];
  const dates: string[] = [];
  for (const item of items) {
    const dateRaw = item[1];
    const close = Number(item[5]);
    if (!Number.isFinite(close) || close <= 0) continue;
    points.push(close);
    dates.push(`${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`);
  }

  const quoteJson = await fetchJson(
    `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${encodeURIComponent(code)}`
  );
  let naverName =
    quoteJson?.result?.areas?.[0]?.datas?.[0]?.nm ||
    quoteJson?.result?.areas?.[0]?.datas?.[0]?.cd ||
    ticker;
  if (typeof naverName === "string" && naverName.includes("�")) {
    naverName = ticker;
  }

  return buildPayloadFromSeries(ticker, String(naverName), "KRW", points.slice(-120), dates.slice(-120));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("ticker");
  if (!query) {
    return NextResponse.json({ error: "Ticker or company name parameter is required" }, { status: 400 });
  }

  let resolved: SearchResolved;
  try {
    resolved = await resolveTickerFromQuery(query);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to resolve company name", details: error?.message || "unknown" },
      { status: 404 }
    );
  }

  const safeTicker = resolved.ticker.replace(/[^a-zA-Z0-9.\-^]/g, "").toUpperCase();
  const errors: string[] = [];

  try {
    const endpoint = process.env.INV_ANALYZE_ENDPOINT?.trim();
    if (endpoint) {
      const payload = await callRemoteAnalyzerData(endpoint, safeTicker);
      return NextResponse.json(applyPreferredName(payload, resolved.displayName));
    }
  } catch (error: any) {
    errors.push(`remote: ${error?.message || "failed"}`);
  }

  try {
    const localPayload = await callLocalAnalyzerData(safeTicker);
    if (localPayload) return NextResponse.json(applyPreferredName(localPayload, resolved.displayName));
  } catch (error: any) {
    errors.push(`local: ${error?.message || "failed"}`);
  }

  try {
    const fallback = await buildYahooFallback(safeTicker);
    if (fallback) return NextResponse.json(applyPreferredName(fallback, resolved.displayName));
  } catch (error: any) {
    errors.push(`yahoo: ${error?.message || "failed"}`);
  }

  try {
    const stooq = await buildStooqFallback(safeTicker);
    if (stooq) return NextResponse.json(applyPreferredName(stooq, resolved.displayName));
  } catch (error: any) {
    errors.push(`stooq: ${error?.message || "failed"}`);
  }

  try {
    const naver = await buildNaverKrFallback(safeTicker);
    if (naver) return NextResponse.json(applyPreferredName(naver, resolved.displayName));
  } catch (error: any) {
    errors.push(`naver: ${error?.message || "failed"}`);
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
