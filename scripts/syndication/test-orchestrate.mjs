#!/usr/bin/env node
// Offline smoke test for the syndication module. Creates a fixture MDX + image,
// runs the orchestrator in dry-run (all channels) and real Naver draft mode,
// asserts expected outputs, then cleans up. No network required.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SLUG = "assets-29991231-syndication-selftest";
const mdxPath = path.join(ROOT, "content/posts", `${SLUG}.mdx`);
const assetDir = path.join(ROOT, "public/shide-blog-assets", SLUG);
const naverDir = path.join(ROOT, "content/naver-drafts", SLUG);

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"} — ${msg}`); if (!cond) failures++; };

function setup() {
  fs.mkdirSync(path.dirname(mdxPath), { recursive: true });
  fs.writeFileSync(mdxPath, `---
title: "셀프테스트: 반도체 신호 읽기"
date: "2999-12-31"
description: "테스트용 자산 신호 해설 초안입니다."
category: "assets"
tags:
  - "Assets"
  - "Semiconductor"
---

# 셀프테스트: 반도체 신호 읽기

이것은 배포 파이프라인 검증용 본문입니다.

- 항목 하나
- 항목 둘

> 인용 문단 예시.
`, "utf8");
  fs.mkdirSync(assetDir, { recursive: true });
  fs.writeFileSync(path.join(assetDir, "image-01.webp"), "fake-bytes", "utf8");
}

function cleanup() {
  for (const p of [mdxPath, assetDir, naverDir]) fs.rmSync(p, { recursive: true, force: true });
}

function run(extra) {
  const r = spawnSync("node", [path.join(HERE, "orchestrate.mjs"), "--slug", SLUG, ...extra],
    { cwd: ROOT, encoding: "utf8" });
  return `${r.stdout || ""}${r.stderr || ""}`;
}

try {
  cleanup();
  setup();

  const dry = run(["--dry-run"]);
  console.log(dry);
  ok(/lane=assets/.test(dry), "WordPress dry-run resolves lane=assets");
  ok(/shawn-web: updated/.test(dry), "hub adapter reports updated");
  ok(/naver: manual-required/.test(dry), "naver reports manual-required");
  ok(!fs.existsSync(naverDir), "dry-run wrote no naver files");

  const real = run(["--channels", "naver"]);
  console.log(real);
  ok(fs.existsSync(path.join(naverDir, "body.html")), "naver body.html generated");
  ok(fs.existsSync(path.join(naverDir, "checklist.md")), "naver checklist generated");
  ok(fs.existsSync(path.join(naverDir, "images", "image-01.webp")), "naver image copied");
  const html = fs.readFileSync(path.join(naverDir, "body.html"), "utf8");
  ok(/phdshawn\.com\/blog\/assets-29991231/.test(html), "hub CTA canonical present in naver body");
  ok(/<ul><li>/.test(html), "markdown list converted to HTML");
} finally {
  cleanup();
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
