#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

function changedFiles() {
  try {
    const out = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" }).trim();
    if (!out) return [];
    return out.split("\n").map((v) => v.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const targets = changedFiles().filter((file) => {
  if (!file.endsWith("/page.tsx")) return false;
  return file.startsWith("app/");
});

if (!targets.length) {
  console.log("[i18n-check] no changed app pages.");
  process.exit(0);
}

const violations = [];
for (const file of targets) {
  const src = fs.readFileSync(file, "utf8");
  const hasI18nHook = src.includes("useLanguage(") || src.includes("translations[") || src.includes("useI18n(");
  const exempt = src.includes("i18n-exempt");
  if (!hasI18nHook && !exempt) {
    violations.push(file);
  }
}

if (violations.length) {
  console.error("[i18n-check] i18n integration is required for changed pages.");
  for (const file of violations) {
    console.error(` - ${file}`);
  }
  console.error("Add language wiring (useLanguage/useI18n/translations) or explicit 'i18n-exempt' comment.");
  process.exit(1);
}

console.log("[i18n-check] passed.");
