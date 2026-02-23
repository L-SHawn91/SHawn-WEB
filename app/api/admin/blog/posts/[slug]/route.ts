import { NextResponse } from "next/server";
import { getAuthenticatedAdminUserId } from "@/lib/admin-auth";
import { deletePost, readPost, toSlug, writePost, type BlogEditorInput } from "@/lib/blog-admin";

export async function GET(_: Request, context: { params: { slug: string } }) {
  const adminUserId = await getAuthenticatedAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const slug = toSlug(context.params.slug || "");
    const post = await readPost(slug);
    return NextResponse.json({ post });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: { slug: string } }) {
  const adminUserId = await getAuthenticatedAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const slug = toSlug(context.params.slug || "");
    const payload = (await req.json()) as Partial<BlogEditorInput>;

    const result = await writePost({
      title: String(payload.title || ""),
      slug,
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

export async function DELETE(_: Request, context: { params: { slug: string } }) {
  const adminUserId = await getAuthenticatedAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const slug = toSlug(context.params.slug || "");
    await deletePost(slug);
    return NextResponse.json({ success: true, slug });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "failed" }, { status: 500 });
  }
}
