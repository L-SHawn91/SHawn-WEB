import { NextRequest, NextResponse } from "next/server";
import { runInvTool } from "@/lib/invRunner";

type Mode = "analyze" | "backtest" | "compare";

function normTicker(raw?: string): string {
  const t = String(raw || "").trim().toUpperCase();
  if (!t) return "";
  if (!/^[A-Z0-9.^_-]+(\.[A-Z]+)?$/.test(t)) return "";
  return t;
}

function inferTicker(text: string): string {
  const upper = text.toUpperCase();
  const krMap: Record<string, string> = {
    "삼성전자": "005930.KS",
    "삼전": "005930.KS",
    "애플": "AAPL",
    "마소": "MSFT",
    "엔비디아": "NVDA",
    "테슬라": "TSLA",
  };
  for (const [k, v] of Object.entries(krMap)) {
    if (text.includes(k)) return v;
  }
  const m = upper.match(/\b[A-Z]{1,6}(?:\.[A-Z]{1,4})?\b/);
  return normTicker(m?.[0]);
}

function inferMode(text: string): Mode {
  const t = text.toLowerCase();
  if (t.includes("비교") || t.includes("compare")) return "compare";
  if (t.includes("백테") || t.includes("backtest") || t.includes("전략")) return "backtest";
  return "analyze";
}

function inferRisk(text: string): "low" | "mid" | "high" {
  if (text.includes("보수") || text.includes("안전")) return "low";
  if (text.includes("공격") || text.includes("고위험")) return "high";
  return "mid";
}

function inferHorizon(text: string): "swing" | "position" | "long" {
  if (text.includes("장기") || text.includes("롱")) return "long";
  if (text.includes("중기") || text.includes("포지션")) return "position";
  return "swing";
}

function inferStrategy(text: string): "ema_cross" | "rsi_meanrev" | "buy_hold" {
  const t = text.toLowerCase();
  if (t.includes("rsi")) return "rsi_meanrev";
  if (t.includes("홀드") || t.includes("buy_hold") || t.includes("바이앤홀드")) return "buy_hold";
  return "ema_cross";
}

function inferBenchmark(ticker: string): string {
  return ticker.endsWith(".KS") ? "^KS11" : "^GSPC";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim();
  if (!text) return NextResponse.json({ ok: false, error: "text is required" }, { status: 400 });

  const ticker = inferTicker(text);
  if (!ticker) {
    return NextResponse.json({ ok: false, status: "미완료", error: "티커를 찾지 못했습니다. 예: AAPL, 005930.KS" }, { status: 400 });
  }

  const mode = inferMode(text);
  const from = "2024-01-01";
  const to = "2026-02-27";
  const benchmark = inferBenchmark(ticker);

  if (mode === "analyze") {
    const horizon = inferHorizon(text);
    const risk = inferRisk(text);
    const commandText = `/inv analyze ticker=${ticker} horizon=${horizon} risk=${risk}`;
    const run = await runInvTool("analyze_ticker.py", ["--ticker", ticker, "--horizon", horizon, "--risk-profile", risk, "--json"]);
    if (!run.ok) {
      return NextResponse.json({ ok: false, status: "미완료", error: run.stderr || run.stdout, commandText }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "완료", mode, commandText, data: run.json });
  }

  if (mode === "backtest") {
    const strategy = inferStrategy(text);
    const commandText = `/inv backtest ticker=${ticker} strategy=${strategy} from=${from} to=${to} benchmark=${benchmark} fees_bps=10`;
    const run = await runInvTool("backtest_strategy.py", [
      "--ticker", ticker,
      "--strategy", strategy,
      "--from", from,
      "--to", to,
      "--benchmark", benchmark,
      "--fees-bps", "10",
    ]);
    if (!run.ok) {
      return NextResponse.json({ ok: false, status: "미완료", error: run.stderr || run.stdout, commandText }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "완료", mode, commandText, data: run.json });
  }

  const commandText = `/inv compare ticker=${ticker} from=${from} to=${to} benchmark=${benchmark} fees_bps=10`;
  const run = await runInvTool("compare_strategies.py", [
    "--ticker", ticker,
    "--from", from,
    "--to", to,
    "--benchmark", benchmark,
    "--fees-bps", "10",
  ]);
  if (!run.ok) {
    return NextResponse.json({ ok: false, status: "미완료", error: run.stderr || run.stdout, commandText }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: "완료", mode, commandText, data: run.json });
}
