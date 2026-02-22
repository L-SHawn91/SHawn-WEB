import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

// Path to SHawn-INV repo
const INV_REPO_PATH = process.env.INV_REPO_PATH || "/Users/soohyunglee/GitHub/SHawn-INV";
const SCRIPT_PATH = path.join(INV_REPO_PATH, "tools/analyze_ticker.py");

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
    // Run the Python script using uv
    // We cd into the repo directory first to ensure relative imports work if needed
    // And use the full path to python/uv
    const UV_PATH = process.env.UV_PATH || "/Users/soohyunglee/.local/bin/uv";
    const command = `cd "${INV_REPO_PATH}" && "${UV_PATH}" run python "${SCRIPT_PATH}" "${safeTicker}"`;

    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.warn(`[InvestAPI] Stderr warning for ${safeTicker}:`, stderr);
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
  } catch (error: any) {
    console.error("[InvestAPI] Execution error:", error);
    return NextResponse.json(
      { error: "Analysis execution failed", details: error.message },
      { status: 500 }
    );
  }
}
