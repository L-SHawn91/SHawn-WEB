// Central config for the content syndication orchestrator.
// See docs/SYNDICATION_ORCHESTRATOR_SPEC.md and the per-adapter specs.
import path from "node:path";

export const HUB_BASE_URL = process.env.SYNDICATION_HUB_BASE_URL || "https://phdshawn.com";
export const HUB_BLOG_PATH = "/blog"; // canonical: {HUB_BASE_URL}{HUB_BLOG_PATH}/{slug}

export const REPO_ROOT = process.cwd();
export const POSTS_DIR = path.join(REPO_ROOT, "content/posts");
export const ASSETS_PUBLIC_DIR = path.join(REPO_ROOT, "public/shide-blog-assets");
export const NAVER_DRAFTS_DIR = path.join(REPO_ROOT, "content/naver-drafts");
export const STATE_FILE = path.join(REPO_ROOT, "content/syndication-state.json");

// lane -> WordPress.com site (registry: SHide-BLOG/WORDPRESS_SITES.md).
// tokenEnv holds the OAuth2 bearer token for that site's account.
export const WORDPRESS_SITES = {
  ai: { siteId: "255886652", host: "shawnaiintelligence.wordpress.com", label: "SHawn AI", tokenEnv: "WP_TOKEN_AI" },
  assets: { siteId: "255885793", host: "shawnassets.wordpress.com", label: "SHawn Assets", tokenEnv: "WP_TOKEN_ASSETS" },
  bio: { siteId: "255887381", host: "shawnbiohub.wordpress.com", label: "SHawn Bio", tokenEnv: "WP_TOKEN_BIO" },
};

// Derive the lane from a baked MDX slug/category. Slugs are brand-prefixed
// (e.g. "shide-ai-...", "assets-...", "bio-..."); category is a fallback.
export function laneFromSlug(slug = "", category = "") {
  const s = `${slug}`.toLowerCase();
  const c = `${category}`.toLowerCase();
  if (/(^|[-_])ai([-_]|$)|shide-ai|\bai\b/.test(s) || c.includes("ai")) return "ai";
  if (/(^|[-_])assets?([-_]|$)|market|invest/.test(s) || c.includes("asset") || c.includes("market")) return "assets";
  if (/(^|[-_])bio([-_]|$)|science|organoid|autophagy/.test(s) || c.includes("bio") || c.includes("science")) return "bio";
  return null; // unknown -> caller decides (skip WordPress fan-out)
}

// Informational hub CTA (public-safety scrub strips overt monetization framing,
// so keep this purely informational — no buy/earn/subscribe-for-money language).
export function hubCta(canonicalUrl) {
  return {
    markdown: `\n\n---\n\n> 전체 데이터·차트와 최신 업데이트는 [phdshawn.com](${canonicalUrl})에서 확인하실 수 있습니다.\n`,
    html: `<hr/><p>전체 데이터·차트와 최신 업데이트는 <a href="${canonicalUrl}" rel="noopener">phdshawn.com</a>에서 확인하실 수 있습니다.</p>`,
  };
}

// SHide operating policy: draft-first, and during probe at most 1 public post
// per site per day. Orchestrator defaults reflect this.
export const DEFAULTS = {
  draftFirst: true,
  spokeDelayHours: 0, // optional stagger before publishing spokes
  vercelDeployHookEnv: "VERCEL_DEPLOY_HOOK_URL",
};
