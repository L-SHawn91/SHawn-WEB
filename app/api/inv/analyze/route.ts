import { NextRequest, NextResponse } from "next/server";
import { runInvTool } from "@/lib/invRunner";

type AnalyzeBody = {
  ticker?: string;
  horizon?: "swing" | "position" | "long";
  risk_profile?: "low" | "mid" | "high";
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

export async function POST(req: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return bad("Invalid JSON body");
  }

  const ticker = normTicker(body.ticker);
  if (!ticker) return bad("Invalid ticker");

  const horizon = body.horizon || "swing";
  const risk = body.risk_profile || "mid";

  const run = await runInvTool("analyze_ticker.py", [
    "--ticker",
    ticker,
    "--horizon",
    horizon,
    "--risk-profile",
    risk,
    "--json",
  ]);

  if (!run.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: "미완료",
        error: run.stderr || run.stdout || "analyze failed",
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
