#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const forbidden = ["gemini", "sonolbot"];
const pattern = new RegExp(forbidden.join("|"), "i");
const publicCopyForbidden = [
  "노출·수익화",
  "수익화",
  "검색 노출",
  "광고",
  "제휴",
  "문의 전환",
  "monetization",
  "disclosure",
  "affiliate",
  "funnel",
  "ADVERTISEMENT",
  "adsbygoogle",
  "Revenue Discovery",
];
const publicCopyPattern = new RegExp(publicCopyForbidden.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "coverage", ".archive", ".claude"]);
const ignoredFiles = new Set(["scripts/enforce-forbidden-terms.mjs"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

function shouldScan(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  if (ignoredFiles.has(normalized)) return false;
  const ext = normalized.includes(".") ? normalized.slice(normalized.lastIndexOf(".")) : "";
  return textExtensions.has(ext);
}

function walk(dir, matches) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, matches);
      continue;
    }
    if (!stat.isFile()) continue;
    const relPath = relative(process.cwd(), fullPath).replaceAll("\\", "/");
    if (!shouldScan(relPath)) continue;

    const content = readFileSync(fullPath, "utf8");
    const isPublicCopySurface = relPath.startsWith("app/") || relPath.startsWith("components/") || relPath.startsWith("lib/");
    content.split(/\r?\n/).forEach((line, index) => {
      if (pattern.test(line)) matches.push(`${relPath}:${index + 1}:${line}`);
      if (isPublicCopySurface && publicCopyPattern.test(line)) {
        matches.push(`${relPath}:${index + 1}:[public-copy] ${line}`);
      }
    });
  }
}

const matches = [];
walk(process.cwd(), matches);

if (matches.length) {
  console.error("[forbidden-terms] blocked terms detected:");
  console.error(matches.join("\n"));
  process.exit(1);
}

console.log("[forbidden-terms] passed.");
