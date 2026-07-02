export type BlogStudioMediaRole = "hero" | "inline" | "support";

export type BlogStudioMediaInput = {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  alt?: string;
  caption?: string;
  role?: BlogStudioMediaRole;
};

export type BlogStudioMedia = BlogStudioMediaInput & {
  role: BlogStudioMediaRole;
  publicPath: string;
};

export type BlogStudioInput = {
  title: string;
  slug?: string;
  description?: string;
  date?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  author?: string;
  body: string;
  media?: BlogStudioMediaInput[];
};

export type BlogStudioPayload = Omit<Required<BlogStudioInput>, "media" | "slug"> & {
  slug: string;
  tags: string[];
  media: BlogStudioMedia[];
  heroImage?: string;
};

export type BlogStudioFile = {
  path: string;
  content?: string;
  base64?: string;
  encoding: "utf-8" | "base64";
};

const MAX_TAGS = 12;
const MAX_MEDIA = 12;
const ALLOWED_MEDIA_TYPES = new Set(["image/webp", "image/png", "image/jpeg"]);
const MAX_TOTAL_MEDIA_BASE64_CHARS = 4_500_000;

export function toBlogSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function fallbackSlug() {
  return `post-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
}

function escapeYaml(value: string): string {
  return value.replace(/[\n\r]/g, " ").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of tags) {
    const tag = String(raw || "").trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    normalized.push(tag.slice(0, 40));
    if (normalized.length >= MAX_TAGS) break;
  }
  return normalized;
}

function sanitizeAssetName(fileName: string, index: number): string {
  const extFromName = String(fileName || "").toLowerCase().match(/\.(webp|png|jpe?g)$/)?.[1];
  const ext = extFromName === "jpg" ? "jpeg" : extFromName || "webp";
  const base = String(fileName || `image-${index + 1}`)
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `image-${String(index + 1).padStart(2, "0")}`;
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  return `${base.slice(0, 70)}.${safeExt}`;
}

export function normalizeBlogStudioPayload(input: BlogStudioInput): BlogStudioPayload {
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  if (!title) throw new Error("title_required");
  if (!body) throw new Error("body_required");

  const slug = toBlogSlug(input.slug || title) || fallbackSlug();
  const date = String(input.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const category = String(input.category || "Blog").trim().slice(0, 60) || "Blog";
  const author = String(input.author || "Dr.SHawn").trim().slice(0, 80) || "Dr.SHawn";
  const description = String(input.description || "").trim().slice(0, 280);
  const mediaInputs = Array.isArray(input.media) ? input.media.slice(0, MAX_MEDIA) : [];
  const usedNames = new Set<string>();

  let totalBase64Chars = 0;
  const media = mediaInputs.map((item, index) => {
    const mimeType = String(item.mimeType || "").toLowerCase();
    if (!ALLOWED_MEDIA_TYPES.has(mimeType)) {
      throw new Error(`unsupported_media_type:${mimeType || "unknown"}`);
    }
    const dataBase64 = String(item.dataBase64 || "").replace(/^data:[^;]+;base64,/, "").trim();
    if (!dataBase64) throw new Error("media_base64_required");
    totalBase64Chars += dataBase64.length;
    if (totalBase64Chars > MAX_TOTAL_MEDIA_BASE64_CHARS) {
      throw new Error("media_payload_too_large");
    }
    let fileName = sanitizeAssetName(item.fileName, index);
    while (usedNames.has(fileName)) {
      fileName = fileName.replace(/\.(webp|png|jpe?g)$/i, `-${index + 1}.$1`);
    }
    usedNames.add(fileName);
    const role = item.role === "hero" || item.role === "support" ? item.role : "inline";
    return {
      ...item,
      fileName,
      mimeType,
      dataBase64,
      role,
      alt: String(item.alt || title).trim().slice(0, 140),
      caption: String(item.caption || "").trim().slice(0, 220),
      publicPath: `/blog-assets/${slug}/${fileName}`,
    } satisfies BlogStudioMedia;
  });

  const heroImage = media.find((item) => item.role === "hero")?.publicPath || media[0]?.publicPath;

  return {
    title,
    slug,
    description,
    date,
    category,
    tags: normalizeTags(input.tags),
    featured: Boolean(input.featured),
    author,
    body,
    media,
    heroImage,
  };
}

function buildInlineMediaSection(media: BlogStudioMedia[]): string {
  const inline = media.filter((item) => item.role !== "hero");
  if (!inline.length) return "";
  const blocks = inline.map((item) => {
    const caption = item.caption ? `\n\n_${item.caption}_` : "";
    return `![${item.alt || "Blog image"}](${item.publicPath})${caption}`;
  });
  return `\n\n## Visual notes\n\n${blocks.join("\n\n")}`;
}

export function buildBlogStudioMdx(payload: BlogStudioPayload): string {
  const frontmatter = [
    "---",
    `title: "${escapeYaml(payload.title)}"`,
    `description: "${escapeYaml(payload.description)}"`,
    `date: "${payload.date}"`,
    `category: "${escapeYaml(payload.category)}"`,
    `author: "${escapeYaml(payload.author)}"`,
    `featured: ${payload.featured ? "true" : "false"}`,
    payload.heroImage ? `image: "${payload.heroImage}"` : undefined,
    `tags: [${payload.tags.map((tag) => `"${escapeYaml(tag)}"`).join(", ")}]`,
    "---",
    "",
  ].filter((line): line is string => typeof line === "string");

  return `${frontmatter.join("\n")}${payload.body}${buildInlineMediaSection(payload.media)}\n`;
}

export function buildBlogStudioFiles(payload: BlogStudioPayload): BlogStudioFile[] {
  const mdx = buildBlogStudioMdx(payload);
  const files: BlogStudioFile[] = [
    {
      path: `content/posts/${payload.slug}.mdx`,
      content: mdx,
      encoding: "utf-8",
    },
  ];

  for (const item of payload.media) {
    files.push({
      path: `public${item.publicPath}`.replace(/^\/+/, ""),
      base64: item.dataBase64,
      encoding: "base64",
    });
  }

  return files;
}
