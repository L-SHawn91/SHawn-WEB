#!/usr/bin/env node
// Semi-automated web publish: SHide packages -> MDX -> commit -> push -> Vercel deploy.
//
// Respects the SHide `no_auto_publish` gate: DEFAULT is preview-only. You must
// pass --publish to actually commit & push (the flag is the human approval).
//
//   node scripts/publish-web.mjs            # preview: sync + show what would publish
//   node scripts/publish-web.mjs --publish  # sync + commit + push (Vercel deploys)
//   node scripts/publish-web.mjs --publish --no-push   # commit locally, don't push
//
// package.json: `pnpm publish:web` (preview) / `pnpm publish:web:go` (--publish)
import { spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const doPublish = args.includes("--publish");
const noPush = args.includes("--no-push");

// Content paths the blog sync produces. Only these are staged — never a blanket add.
const CONTENT_PATHS = ["content/posts", "public/shide-blog-assets"];

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { encoding: "utf8", ...opts });
  return { code: r.status ?? 1, out: `${r.stdout || ""}${r.stderr || ""}` };
}

// 1) Package -> MDX (delegates to the existing production sync script).
console.log("▶ SHide 패키지 → MDX 동기화 (pnpm sync:shide-blog)...");
const sync = run("node", ["scripts/sync-shide-blog-packages.mjs"]);
process.stdout.write(sync.out);
if (sync.code !== 0) {
  console.error("✗ 동기화 실패 — 중단.");
  process.exit(sync.code);
}

// 2) Did any content change?
const status = run("git", ["status", "--porcelain", "--", ...CONTENT_PATHS]).out.trim();
if (!status) {
  console.log("\n변경 없음 — 새/수정된 글이 없습니다. 종료.");
  process.exit(0);
}
const postCount = status
  .split("\n")
  .filter((l) => l.includes("content/posts/") && l.trim().endsWith(".mdx")).length;
console.log(`\n변경된 콘텐츠 (${postCount} post 파일 포함):`);
console.log(status);

// 3) Preview mode (default): stop here.
if (!doPublish) {
  console.log("\n[미리보기] 실제 반영하려면:  node scripts/publish-web.mjs --publish");
  console.log("(SHide no_auto_publish: --publish 플래그가 발행 승인 역할)");
  process.exit(0);
}

// 4) Commit only the content paths.
run("git", ["add", "--", ...CONTENT_PATHS]);
const msg = `content(blog): publish ${postCount} post update(s) [web]`;
const commit = run("git", ["commit", "-m", msg]);
process.stdout.write(commit.out);
if (commit.code !== 0) {
  console.error("✗ 커밋 실패 — 중단.");
  process.exit(commit.code);
}

// 5) Push (unless --no-push) -> Vercel auto-deploys.
if (noPush) {
  console.log("\n✅ 커밋 완료. push 생략(--no-push). 수동 배포: git push origin main");
  process.exit(0);
}
console.log("\n▶ push (origin main)...");
const push = run("git", ["push", "origin", "HEAD"]);
process.stdout.write(push.out);
if (push.code !== 0) {
  console.error("\n✗ push 실패 — 인증 확인 후 `git push origin main`. (커밋은 로컬에 있음)");
  process.exit(push.code);
}
console.log("\n✅ 배포 트리거됨 — Vercel이 자동 빌드/배포합니다.");
