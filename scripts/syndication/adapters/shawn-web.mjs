// Hub adapter (role: hub). The hub content is produced by the existing
// production pipeline `scripts/sync-shide-blog-packages.mjs` (package -> MDX).
// This adapter therefore does NOT re-bake; it verifies the MDX exists and
// triggers a Vercel Deploy Hook so the static site rebuilds/redeploys.
import fs from "node:fs";
import path from "node:path";
import { POSTS_DIR, DEFAULTS } from "../config.mjs";

export const shawnWebAdapter = {
  key: "shawn-web",
  role: "hub",
  canonicalPolicy: "self",
  supportsUpdate: true,

  /** @param {import("../lib/content-item.mjs").ContentItem} item */
  async publish(item, ctx) {
    const file = path.join(POSTS_DIR, `${item.slug}.mdx`);
    if (!fs.existsSync(file)) {
      return { channel: "shawn-web", status: "failed", note: `MDX missing: run 'pnpm sync:shide-blog' first (${file})` };
    }

    const hookUrl = process.env[DEFAULTS.vercelDeployHookEnv];
    if (ctx.dryRun) {
      return { channel: "shawn-web", url: item.canonicalUrl, status: "updated",
               note: hookUrl ? "[dry-run] would trigger Vercel deploy hook" : "[dry-run] no deploy hook configured" };
    }
    if (!hookUrl) {
      return { channel: "shawn-web", url: item.canonicalUrl, status: "updated",
               note: "MDX present; deploy on next commit/build (no deploy hook set)" };
    }
    try {
      const res = await fetch(hookUrl, { method: "POST" });
      return { channel: "shawn-web", url: item.canonicalUrl, status: "updated",
               note: `deploy hook triggered (${res.status})` };
    } catch (e) {
      return { channel: "shawn-web", url: item.canonicalUrl, status: "failed", note: `deploy hook failed: ${e.message}` };
    }
  },
};
