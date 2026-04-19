import { spawn } from "node:child_process";
import path from "node:path";

export type InvRunResult<T = unknown> = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  json?: T;
  command: string[];
  cwd: string;
};

function resolveWorkspaceRoot(): string {
  // SHawn-WEB is expected at <workspace>/SHawn-WEB
  return path.resolve(process.cwd(), "..");
}

function resolveToolPath(toolFile: string): string {
  return path.join(resolveWorkspaceRoot(), "tools", toolFile);
}

export async function runInvTool<T = unknown>(toolFile: string, args: string[]): Promise<InvRunResult<T>> {
  const cwd = resolveWorkspaceRoot();
  const script = resolveToolPath(toolFile);
  const command = ["python3", script, ...args];

  return await new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { cwd, env: process.env });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });

    child.on("close", (code) => {
      let parsed: T | undefined;
      if (code === 0) {
        try {
          parsed = JSON.parse(stdout);
        } catch {
          parsed = undefined;
        }
      }
      resolve({ ok: code === 0, code, stdout, stderr, json: parsed, command, cwd });
    });
  });
}
