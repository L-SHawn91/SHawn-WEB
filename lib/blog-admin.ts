import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type BlogEditorInput = {
  title: string;
  slug: string;
  description?: string;
  date?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  author?: string;
  content: string;
};

export type BlogPostSummary = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  featured: boolean;
  author: string;
  updatedAt: string;
};

export function toSlug(raw: string): string {
  const normalized = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.slice(0, 80);
}

export function assertSafeSlug(slug: string): string {
  const normalized = toSlug(slug);
  if (!normalized) {
    throw new Error("Invalid slug");
  }
  if (normalized.includes("..") || normalized.includes("/")) {
    throw new Error("Unsafe slug");
  }
  return normalized;
}

export function getPostFilePath(slug: string): string {
  const safeSlug = assertSafeSlug(slug);
  return path.join(POSTS_DIR, `${safeSlug}.mdx`);
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function buildMdx(input: BlogEditorInput): string {
  const nowDate = new Date().toISOString().slice(0, 10);
  const title = String(input.title || "").trim();
  const slug = assertSafeSlug(input.slug || title);
  const description = String(input.description || "").trim();
  const date = String(input.date || nowDate).trim();
  const category = String(input.category || "General").trim() || "General";
  const author = String(input.author || "Dr.SHawn").trim() || "Dr.SHawn";
  const featured = Boolean(input.featured);
  const tags = normalizeTags(input.tags);
  const body = String(input.content || "").trim();

  if (!title) throw new Error("Title is required");
  if (!body) throw new Error("Content is required");

  const frontmatter = [
    "---",
    `title: \"${title.replace(/\"/g, '\\\"')}\"`,
    `description: \"${description.replace(/\"/g, '\\\"')}\"`,
    `date: \"${date}\"`,
    `category: \"${category.replace(/\"/g, '\\\"')}\"`,
    `author: \"${author.replace(/\"/g, '\\\"')}\"`,
    `featured: ${featured ? "true" : "false"}`,
    `tags: [${tags.map((tag) => `\"${tag.replace(/\"/g, '\\\"')}\"`).join(", ")}]`,
    "---",
    "",
  ].join("\n");

  return `${frontmatter}${body}\n`;
}

export async function ensurePostsDir() {
  await fs.mkdir(POSTS_DIR, { recursive: true });
}

export async function listPosts(): Promise<BlogPostSummary[]> {
  await ensurePostsDir();
  const files = await fs.readdir(POSTS_DIR);
  const mdxFiles = files.filter((name) => name.endsWith(".mdx"));

  const entries = await Promise.all(
    mdxFiles.map(async (name) => {
      const fullPath = path.join(POSTS_DIR, name);
      const raw = await fs.readFile(fullPath, "utf8");
      const st = await fs.stat(fullPath);
      const parsed = matter(raw);
      const slug = name.replace(/\.mdx$/, "");
      return {
        slug,
        title: String(parsed.data?.title || slug),
        description: String(parsed.data?.description || ""),
        date: String(parsed.data?.date || ""),
        category: String(parsed.data?.category || "General"),
        tags: normalizeTags(parsed.data?.tags),
        featured: Boolean(parsed.data?.featured),
        author: String(parsed.data?.author || "Dr.SHawn"),
        updatedAt: st.mtime.toISOString(),
      } as BlogPostSummary;
    })
  );

  return entries.sort((a, b) => String(b.date || b.updatedAt).localeCompare(String(a.date || a.updatedAt)));
}

export async function readPost(slug: string): Promise<BlogEditorInput> {
  const filePath = getPostFilePath(slug);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  return {
    slug,
    title: String(parsed.data?.title || slug),
    description: String(parsed.data?.description || ""),
    date: String(parsed.data?.date || ""),
    category: String(parsed.data?.category || "General"),
    tags: normalizeTags(parsed.data?.tags),
    featured: Boolean(parsed.data?.featured),
    author: String(parsed.data?.author || "Dr.SHawn"),
    content: String(parsed.content || "").trim(),
  };
}

export async function writePost(input: BlogEditorInput): Promise<{ slug: string; path: string }> {
  const slug = assertSafeSlug(input.slug || input.title);
  const filePath = getPostFilePath(slug);
  const body = buildMdx({ ...input, slug });

  await ensurePostsDir();
  await fs.writeFile(filePath, body, "utf8");

  return { slug, path: filePath };
}

export async function deletePost(slug: string): Promise<void> {
  const filePath = getPostFilePath(slug);
  await fs.unlink(filePath);
}
