import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { getAuthenticatedAdminUserId } from "@/lib/admin-auth";
import { getPostFilePath, listPosts, readPost, toSlug, writePost, type BlogEditorInput } from "@/lib/blog-admin";

export async function GET(req: Request) {
  const adminUserId = await getAuthenticatedAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const slug = String(url.searchParams.get("slug") || "").trim();

  try {
    if (slug) {
      const post = await readPost(slug);
      return NextResponse.json({ post });
    }

    const posts = await listPosts();
    return NextResponse.json({ posts });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminUserId = await getAuthenticatedAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const payload = (await req.json()) as Partial<BlogEditorInput> & { overwrite?: boolean };
    const normalizedSlug = toSlug(payload.slug || payload.title || "");
    if (!normalizedSlug) {
      return NextResponse.json({ error: "slug_or_title_required" }, { status: 400 });
    }

    const filePath = getPostFilePath(normalizedSlug);
    const shouldOverwrite = Boolean(payload.overwrite);
    const exists = await fs
      .stat(filePath)
      .then(() => true)
      .catch(() => false);

    if (exists && !shouldOverwrite) {
      return NextResponse.json({ error: "post_exists", slug: normalizedSlug }, { status: 409 });
    }

    const result = await writePost({
      title: String(payload.title || ""),
      slug: normalizedSlug,
      description: String(payload.description || ""),
      date: String(payload.date || ""),
      category: String(payload.category || "General"),
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      featured: Boolean(payload.featured),
      author: String(payload.author || "Dr.SHawn"),
      content: String(payload.content || ""),
    });

    return NextResponse.json({ success: true, slug: result.slug, path: result.path });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "failed" }, { status: 500 });
  }
}
