import { NextRequest, NextResponse } from "next/server";
import { runInvTool } from "@/lib/invRunner";

type BacktestBody = {
  ticker?: string;
  strategy?: "ema_cross" | "rsi_meanrev" | "buy_hold";
  from?: string;
  to?: string;
  benchmark?: string;
  fees_bps?: number;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function normTicker(raw?: string): string {
  const t = String(raw || "").trim().toUpperCase();
  if (!t) return "";
  if (!/^[A-Z0-9.^_-]+(\.[A-Z]+)?$/.test(t)) return "";
  return t;
}

function isIsoDate(v?: string): boolean {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function POST(req: NextRequest) {
  let body: BacktestBody;
  try {
    body = (await req.json()) as BacktestBody;
  } catch {
    return bad("Invalid JSON body");
  }

  const ticker = normTicker(body.ticker);
  const benchmark = normTicker(body.benchmark || "^GSPC");
  const strategy = body.strategy || "ema_cross";
  const from = body.from;
  const to = body.to;
  const fees = Number.isFinite(body.fees_bps as number) ? Number(body.fees_bps) : 10;

  if (!ticker) return bad("Invalid ticker");
  if (!benchmark) return bad("Invalid benchmark");
  if (!isIsoDate(from) || !isIsoDate(to)) return bad("from/to must be YYYY-MM-DD");
  if (fees < 0 || fees > 500) return bad("fees_bps out of range (0-500)");

  const run = await runInvTool("backtest_strategy.py", [
    "--ticker",
    ticker,
    "--strategy",
    strategy,
    "--from",
    from!,
    "--to",
    to!,
    "--benchmark",
    benchmark,
    "--fees-bps",
    String(fees),
  ]);

  if (!run.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: "미완료",
        error: run.stderr || run.stdout || "backtest failed",
        evidence: { command: run.command, cwd: run.cwd, code: run.code },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "완료",
    data: run.json ?? null,
    evidence: {
      command: run.command,
      cwd: run.cwd,
      code: run.code,
      hasJson: Boolean(run.json),
    },
  });
}
