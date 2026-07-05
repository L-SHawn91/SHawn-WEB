// Normalize a baked hub MDX post into a channel-neutral ContentItem.
// Using the hub's committed MDX as the source of truth guarantees the slug and
// canonical URL match production exactly (no slug-logic re-implementation).
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { POSTS_DIR, ASSETS_PUBLIC_DIR, HUB_BASE_URL, HUB_BLOG_PATH, laneFromSlug } from "../config.mjs";

/**
 * @typedef {Object} ContentImage
 * @property {string} publicPath  web path, e.g. /shide-blog-assets/{slug}/image-01.webp
 * @property {string} absPath     absolute file path on disk
 * @property {"hero"|"inline"} role
 * @property {string} alt
 *
 * @typedef {Object} ContentItem
 * @property {string} slug
 * @property {string} packageId    stable idempotency key (= slug)
 * @property {("ai"|"assets"|"bio"|null)} lane
 * @property {string} title
 * @property {string} excerpt
 * @property {string} category
 * @property {string[]} tags
 * @property {string} date
 * @property {string} bodyMarkdown
 * @property {ContentImage[]} images
 * @property {string} canonicalUrl
 */

function collectImages(slug, bodyMarkdown) {
  const dir = path.join(ASSETS_PUBLIC_DIR, slug);
  /** @type {ContentImage[]} */
  const images = [];
  if (fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(webp|png|jpe?g|gif|svg)$/i.test(f))
      .sort();
    files.forEach((f, i) => {
      images.push({
        publicPath: `/shide-blog-assets/${slug}/${f}`,
        absPath: path.join(dir, f),
        role: i === 0 ? "hero" : "inline",
        alt: "",
      });
    });
  }
  if (images.length === 0) {
    // Fallback: parse image refs from the markdown body.
    const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let m;
    let i = 0;
    while ((m = re.exec(bodyMarkdown))) {
      const rel = m[2].trim();
      images.push({
        publicPath: rel,
        absPath: rel.startsWith("/") ? path.join(process.cwd(), "public", rel) : rel,
        role: i === 0 ? "hero" : "inline",
        alt: m[1] || "",
      });
      i += 1;
    }
  }
  return images;
}

/** Read one baked MDX post by slug into a ContentItem. */
export function readContentItem(slug) {
  const file = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) throw new Error(`post not found: ${file}`);
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);

  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const category = String(data.category ?? "");
  const canonicalUrl = `${HUB_BASE_URL}${HUB_BLOG_PATH}/${slug}`;

  return {
    slug,
    packageId: slug,
    lane: laneFromSlug(slug, category),
    title: String(data.title ?? slug),
    excerpt: String(data.description ?? ""),
    category,
    tags,
    date: String(data.date ?? ""),
    bodyMarkdown: content.trim(),
    images: collectImages(slug, content),
    canonicalUrl,
  };
}

/** List all baked post slugs (optionally filter by a date prefix like 20260702). */
export function listPostSlugs(filter) {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .filter((slug) => (filter ? slug.includes(filter) : true))
    .sort();
}
