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

const alwaysRequired = [
  "app/invest/page.tsx",
  "components/invest/invest-hub-page.tsx",
  "app/market-intelligence/page.tsx",
  "app/market-intelligence/archive/page.tsx",
  "app/cartridges/invest/page.tsx",
];

const violations = [];
for (const file of [...new Set([...targets, ...alwaysRequired])]) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, "utf8");
  const hasI18nHook = src.includes("useLanguage(") || src.includes("translations[") || src.includes("useI18n(");
  const delegatesToI18nClient = src.includes("HomePageClient");
  const exempt = src.includes("i18n-exempt");
  if (!hasI18nHook && !delegatesToI18nClient && !exempt) {
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

if (!targets.length) {
  console.log("[i18n-check] no changed app pages; verified investment/report critical pages.");
} else {
  console.log("[i18n-check] passed.");
}
