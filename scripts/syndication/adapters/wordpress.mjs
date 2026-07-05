// WordPress adapter (role: spoke). Targets WordPress.com-hosted sites via the
// WordPress.com REST API with an OAuth2 bearer token per site.
// See docs/WORDPRESS_ADAPTER_SPEC.md.
import fs from "node:fs";
import path from "node:path";
import { WORDPRESS_SITES, hubCta } from "../config.mjs";
import { markdownToHtml } from "../lib/markdown.mjs";
import { scrubText } from "../lib/safety.mjs";
import { getRecord, setRecord } from "../lib/state.mjs";

const API = "https://public-api.wordpress.com/rest/v1.1";

function tokenFor(site) {
  return process.env[site.tokenEnv];
}

async function wpPost(site, endpoint, body, { json = true } = {}) {
  const res = await fetch(`${API}/sites/${site.siteId}${endpoint}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${tokenFor(site)}`,
      ...(json ? { "content-type": "application/json" } : {}),
    },
    body: json ? JSON.stringify(body) : body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WP ${endpoint} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function uploadMedia(site, absPath) {
  const data = fs.readFileSync(absPath);
  const form = new FormData();
  form.append("media[]", new Blob([data]), path.basename(absPath));
  const res = await fetch(`${API}/sites/${site.siteId}/media/new`, {
    method: "POST",
    headers: { authorization: `Bearer ${tokenFor(site)}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WP media ${res.status}: ${text.slice(0, 200)}`);
  const media = JSON.parse(text)?.media?.[0];
  return media?.URL || null;
}

function renderHtml(item, canonicalUrl) {
  const cta = hubCta(canonicalUrl);
  return `${markdownToHtml(scrubText(item.bodyMarkdown))}\n${cta.html}`;
}

export const wordpressAdapter = {
  key: "wordpress",
  role: "spoke",
  canonicalPolicy: "point-to-hub",
  supportsUpdate: true,

  /** @param {import("../lib/content-item.mjs").ContentItem} item */
  async publish(item, ctx) {
    const lane = item.lane;
    const site = lane ? WORDPRESS_SITES[lane] : null;
    if (!site) {
      return { channel: "wordpress", status: "skipped", note: `no site mapping for lane=${lane ?? "unknown"}` };
    }
    if (!ctx.dryRun && !tokenFor(site)) {
      return { channel: "wordpress", status: "failed", note: `missing token env ${site.tokenEnv}` };
    }

    const prior = getRecord(ctx.state, item.packageId, "wordpress", lane);
    const action = prior?.postId ? "update" : "create";

    if (ctx.dryRun) {
      return { channel: "wordpress", status: action === "update" ? "updated" : "created",
               note: `[dry-run] would ${action} on ${site.host} (lane=${lane}, images=${item.images.length})` };
    }

    // Upload images (idempotent-ish: only if not previously uploaded).
    const mediaUrls = prior?.mediaUrls ?? [];
    if (mediaUrls.length === 0) {
      for (const img of item.images) {
        if (img.absPath && fs.existsSync(img.absPath)) {
          try { const url = await uploadMedia(site, img.absPath); if (url) mediaUrls.push(url); } catch { /* continue */ }
        }
      }
    }

    const body = {
      title: item.title,
      content: renderHtml(item, item.canonicalUrl),
      tags: item.tags.join(","),
      categories: item.category || undefined,
      status: ctx.draftFirst ? "draft" : "publish",
      // WordPress.com honors canonical via SEO settings on paid plans; sent as
      // metadata hint. On free plans this may be ignored (see spec §4).
      metadata: [{ key: "advanced_seo_description", value: item.excerpt }],
    };

    const endpoint = prior?.postId ? `/posts/${prior.postId}` : "/posts/new";
    const res = await wpPost(site, endpoint, body);

    setRecord(ctx.state, item.packageId, "wordpress", lane, {
      postId: res.ID, url: res.URL, mediaUrls, status: body.status,
    });

    return { channel: "wordpress", externalId: String(res.ID), url: res.URL,
             status: action === "update" ? "updated" : "created", note: `${site.host} (${body.status})` };
  },
};
