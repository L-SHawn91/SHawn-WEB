#!/usr/bin/env node
import { execSync } from "node:child_process";

const forbidden = ["gemini", "sonolbot"];
const pattern = forbidden.join("|");

function run() {
  const cmd = [
    "rg",
    "-n",
    "-i",
    `\"${pattern}\"`,
    ".",
    "--glob",
    "!.git/**",
    "--glob",
    "!node_modules/**",
    "--glob",
    "!.next/**",
    "--glob",
    "!dist/**",
    "--glob",
    "!coverage/**",
    "--glob",
    "!scripts/enforce-forbidden-terms.mjs",
  ].join(" ");

  try {
    const output = execSync(cmd, { encoding: "utf8" }).trim();
    if (output) {
      console.error("[forbidden-terms] blocked terms detected:");
      console.error(output);
      process.exit(1);
    }
  } catch (error) {
    // rg exits 1 when no matches; that's the success path for this check.
    const exitCode = error?.status;
    if (exitCode === 1) {
      console.log("[forbidden-terms] passed.");
      process.exit(0);
    }
    console.error("[forbidden-terms] check failed unexpectedly.");
    console.error(String(error?.message || error));
    process.exit(1);
  }

  console.log("[forbidden-terms] passed.");
}

run();
