import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";
import fs from "fs";

const execPromise = util.promisify(exec);

// Path to SHawn-INV repo
const INV_REPO_PATH = process.env.INV_REPO_PATH || "/Users/soohyunglee/GitHub/SHawn-INV";
const SCRIPT_PATH = path.join(INV_REPO_PATH, "tools/analyze_ticker.py");

async function callRemoteAnalyzer(endpoint: string, ticker: string) {
  const url = new URL(endpoint);
  url.searchParams.set("ticker", ticker);
  const token = process.env.INV_ANALYZE_TOKEN;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  const text = await response.text();
  const data = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  })();

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Remote analysis failed",
        status: response.status,
        details: data,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(data);
}

async function callLocalAnalyzer(ticker: string) {
  const UV_PATH = process.env.UV_PATH || "/Users/soohyunglee/.local/bin/uv";
  if (!fs.existsSync(INV_REPO_PATH) || !fs.existsSync(SCRIPT_PATH) || !fs.existsSync(UV_PATH)) {
    return NextResponse.json(
      {
        error: "Analyzer is not configured",
        details:
          "Set INV_ANALYZE_ENDPOINT for production, or configure INV_REPO_PATH/UV_PATH on this host.",
      },
      { status: 503 }
    );
  }

  const command = `cd "${INV_REPO_PATH}" && "${UV_PATH}" run python "${SCRIPT_PATH}" "${ticker}"`;
  const { stdout, stderr } = await execPromise(command);
  if (stderr) {
    console.warn(`[InvestAPI] Stderr warning for ${ticker}:`, stderr);
  }

  try {
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (parseError) {
    console.error("[InvestAPI] JSON parse error:", parseError, stdout);
    return NextResponse.json(
      { error: "Failed to parse analysis result", details: stdout },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { error: "Ticker parameter is required" },
      { status: 400 }
    );
  }

  // Basic sanitization
  const safeTicker = ticker.replace(/[^a-zA-Z0-9\.\-\^]/g, "").toUpperCase();

  try {
    const remoteEndpoint = process.env.INV_ANALYZE_ENDPOINT?.trim();
    if (remoteEndpoint) {
      return await callRemoteAnalyzer(remoteEndpoint, safeTicker);
    }
    return await callLocalAnalyzer(safeTicker);
  } catch (error: any) {
    console.error("[InvestAPI] Execution error:", error);
    return NextResponse.json(
      { error: "Analysis execution failed", details: error.message },
      { status: 500 }
    );
  }
}
