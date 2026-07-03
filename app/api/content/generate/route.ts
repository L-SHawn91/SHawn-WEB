import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { type, topic, style } = await req.json();
    const botRepoPath = process.env.CONTENT_ENGINE_REPO_PATH;

    if (!botRepoPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Content engine unavailable: set CONTENT_ENGINE_REPO_PATH on the server.",
        },
        { status: 503 },
      );
    }

    const scriptPath = path.join(botRepoPath, "engines", "content_engine.py");
    const pythonPath = process.env.CONTENT_ENGINE_PYTHON || path.join(botRepoPath, "venv", "bin", "python3");
    const args = [scriptPath, "--type", type || "quote", "--style", style || "sovereign"];
    if (topic) args.push("--topic", String(topic));

    return new Promise<Response>((resolve) => {
      execFile(pythonPath, args, { cwd: botRepoPath }, (error, stdout) => {
        if (error) {
          resolve(NextResponse.json({ success: false, error: error.message }, { status: 500 }));
          return;
        }

        if (stdout.includes("SUCCESS|")) {
          const parts = stdout.trim().split("|");
          resolve(
            NextResponse.json({
              success: true,
              type: parts[1],
              path: parts[2],
            }),
          );
        } else {
          resolve(
            NextResponse.json({
              success: false,
              error: "Engine failed to produce successful output",
            }),
          );
        }
      });
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
