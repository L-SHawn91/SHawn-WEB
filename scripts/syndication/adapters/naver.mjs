// Naver adapter (role: spoke). Naver's blog write API was terminated 2020-05-06,
// so there is NO official programmatic publish. This adapter is semi-automated:
// it generates a ready-to-paste draft bundle; a human publishes it manually.
// See docs/NAVER_BLOG_ADAPTER_SPEC.md.
import fs from "node:fs";
import path from "node:path";
import { NAVER_DRAFTS_DIR } from "../config.mjs";
import { markdownToHtml } from "../lib/markdown.mjs";
import { scrubText } from "../lib/safety.mjs";
import { hubCta } from "../config.mjs";

// Slight title variation to reduce duplicate-content overlap with the hub.
function variantTitle(title) {
  return title; // hook point: apply channel-specific variation policy here
}

export const naverAdapter = {
  key: "naver",
  role: "spoke",
  canonicalPolicy: "unsupported", // Naver ignores external rel=canonical
  supportsUpdate: false,

  /** @param {import("../lib/content-item.mjs").ContentItem} item */
  async publish(item, ctx) {
    const outDir = path.join(NAVER_DRAFTS_DIR, item.slug);
    const cta = hubCta(item.canonicalUrl);
    const bodyMd = `${scrubText(item.bodyMarkdown)}${cta.markdown}`;
    const bodyHtml = `${markdownToHtml(scrubText(item.bodyMarkdown))}\n${cta.html}`;

    if (ctx.dryRun) {
      return { channel: "naver", status: "manual-required",
               note: `[dry-run] would write draft bundle to ${path.relative(process.cwd(), outDir)}/` };
    }

    fs.mkdirSync(path.join(outDir, "images"), { recursive: true });
    fs.writeFileSync(path.join(outDir, "title.txt"), variantTitle(item.title), "utf8");
    fs.writeFileSync(path.join(outDir, "body.md"), bodyMd, "utf8");
    fs.writeFileSync(path.join(outDir, "body.html"), bodyHtml, "utf8");
    fs.writeFileSync(path.join(outDir, "tags.txt"), item.tags.join(", "), "utf8");

    // Copy image files so the user uploads them directly (Naver blocks hotlinks).
    let copied = 0;
    for (const img of item.images) {
      try {
        if (img.absPath && fs.existsSync(img.absPath)) {
          fs.copyFileSync(img.absPath, path.join(outDir, "images", path.basename(img.absPath)));
          copied += 1;
        }
      } catch { /* skip unreadable */ }
    }

    fs.writeFileSync(
      path.join(outDir, "checklist.md"),
      [
        `# 네이버 게시 체크리스트 — ${item.title}`,
        "",
        "1. `title.txt` 제목 붙여넣기 (필요 시 부분 변형)",
        "2. `body.html`(또는 `body.md`) 본문 붙여넣기",
        `3. \`images/\`의 이미지를 순서대로 업로드 (${copied}개)`,
        "4. `tags.txt` 태그 입력",
        "5. 하단 허브 링크(CTA) 유지 확인",
        "6. 공개범위/카테고리 설정 후 게시",
        "",
        "> SHide 정책: draft-first, 사이트당 1일 1공개 상한 준수.",
        "> 자동 로그인/매크로 게시는 ToS 위반·계정 정지 위험 — 금지.",
      ].join("\n"),
      "utf8",
    );

    return { channel: "naver", url: null, status: "manual-required",
             note: `draft bundle ready: ${path.relative(process.cwd(), outDir)}/ (${copied} images)` };
  },
};
