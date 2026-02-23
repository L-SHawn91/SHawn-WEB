"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PostSummary = {
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

type PostEditor = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tagsText: string;
  featured: boolean;
  author: string;
  content: string;
};

const emptyEditor: PostEditor = {
  slug: "",
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  category: "General",
  tagsText: "",
  featured: false,
  author: "Dr.SHawn",
  content: "",
};

function toSlug(raw: string) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function AdminBlogBoardPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [editor, setEditor] = useState<PostEditor>(emptyEditor);
  const [message, setMessage] = useState<string>("");

  const editingExisting = Boolean(selectedSlug);

  const fetchPosts = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/blog/posts", { cache: "no-store" });
      if (res.status === 403) {
        setAuthorized(false);
        return;
      }
      if (!res.ok) throw new Error("게시글 목록을 불러오지 못했습니다.");
      setAuthorized(true);
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (error: any) {
      setMessage(error?.message || "로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, []);

  const handleSelect = async (slug: string) => {
    setSelectedSlug(slug);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/blog/posts?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("게시글을 불러오지 못했습니다.");
      const data = await res.json();
      const p = data.post || {};
      setEditor({
        slug: p.slug || slug,
        title: p.title || "",
        description: p.description || "",
        date: p.date || new Date().toISOString().slice(0, 10),
        category: p.category || "General",
        tagsText: Array.isArray(p.tags) ? p.tags.join(", ") : "",
        featured: Boolean(p.featured),
        author: p.author || "Dr.SHawn",
        content: p.content || "",
      });
    } catch (error: any) {
      setMessage(error?.message || "상세 로드 실패");
    }
  };

  const resetEditor = () => {
    setSelectedSlug("");
    setEditor({ ...emptyEditor, date: new Date().toISOString().slice(0, 10) });
    setMessage("");
  };

  const effectiveSlug = useMemo(() => {
    return toSlug(editor.slug || editor.title);
  }, [editor.slug, editor.title]);

  const savePost = async () => {
    if (!editor.title.trim() || !editor.content.trim()) {
      setMessage("제목과 본문은 필수입니다.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const body = {
        title: editor.title,
        slug: effectiveSlug,
        description: editor.description,
        date: editor.date,
        category: editor.category,
        tags: editor.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        featured: editor.featured,
        author: editor.author,
        content: editor.content,
      };

      const res = editingExisting
        ? await fetch(`/api/admin/blog/posts/${encodeURIComponent(selectedSlug)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/blog/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) throw new Error("같은 slug의 글이 이미 있습니다. slug를 수정하세요.");
        throw new Error(data?.error || "저장 실패");
      }

      setMessage("저장/게시 완료");
      await fetchPosts();
      if (data.slug) {
        await handleSelect(data.slug);
      }
    } catch (error: any) {
      setMessage(error?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const removePost = async () => {
    if (!selectedSlug) return;
    if (!window.confirm(`정말 삭제할까요? (${selectedSlug})`)) return;

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/blog/posts/${encodeURIComponent(selectedSlug)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "삭제 실패");

      setMessage("삭제 완료");
      resetEditor();
      await fetchPosts();
    } catch (error: any) {
      setMessage(error?.message || "삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  if (authorized === false) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <h1 className="text-2xl font-bold">Admin Blog Board</h1>
        <p className="mt-3 rounded-lg border border-rose-600/40 bg-rose-900/20 p-3 text-sm text-rose-200">
          접근 권한이 없습니다. 본인 인증 계정으로 로그인한 뒤 다시 시도하세요.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-sky-300 underline">홈으로 이동</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-12">
        <section className="lg:col-span-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-bold">Admin Blog Board</h1>
            <button onClick={resetEditor} className="rounded border border-white/20 px-2 py-1 text-xs">새 글</button>
          </div>
          <p className="mb-3 text-xs text-gray-400">총 {posts.length}개</p>
          <div className="space-y-2">
            {posts.map((post) => (
              <button
                key={post.slug}
                onClick={() => void handleSelect(post.slug)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${selectedSlug === post.slug ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-black/20"}`}
              >
                <p className="line-clamp-1 text-sm font-semibold">{post.title}</p>
                <p className="mt-1 text-[11px] text-gray-400">/{post.slug} · {post.date}</p>
              </button>
            ))}
            {!posts.length && !loading ? <p className="text-sm text-gray-500">게시글이 없습니다.</p> : null}
          </div>
        </section>

        <section className="lg:col-span-8 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">제목
              <input className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.title} onChange={(e) => setEditor((prev) => ({ ...prev, title: e.target.value }))} />
            </label>
            <label className="text-sm">slug
              <input className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.slug} onChange={(e) => setEditor((prev) => ({ ...prev, slug: toSlug(e.target.value) }))} placeholder={effectiveSlug} />
            </label>
            <label className="text-sm">날짜
              <input type="date" className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.date} onChange={(e) => setEditor((prev) => ({ ...prev, date: e.target.value }))} />
            </label>
            <label className="text-sm">카테고리
              <input className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.category} onChange={(e) => setEditor((prev) => ({ ...prev, category: e.target.value }))} />
            </label>
            <label className="text-sm">작성자
              <input className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.author} onChange={(e) => setEditor((prev) => ({ ...prev, author: e.target.value }))} />
            </label>
            <label className="text-sm">태그(쉼표)
              <input className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.tagsText} onChange={(e) => setEditor((prev) => ({ ...prev, tagsText: e.target.value }))} />
            </label>
          </div>

          <label className="mt-3 block text-sm">요약
            <input className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.description} onChange={(e) => setEditor((prev) => ({ ...prev, description: e.target.value }))} />
          </label>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editor.featured} onChange={(e) => setEditor((prev) => ({ ...prev, featured: e.target.checked }))} />
            Featured
          </label>

          <label className="mt-3 block text-sm">본문(MDX)
            <textarea className="mt-1 min-h-[320px] w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm" value={editor.content} onChange={(e) => setEditor((prev) => ({ ...prev, content: e.target.value }))} />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={savePost} disabled={saving} className="rounded bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
              {saving ? "처리 중..." : editingExisting ? "수정 저장" : "즉시 게시"}
            </button>
            {editingExisting ? (
              <>
                <button onClick={removePost} disabled={saving} className="rounded border border-rose-500/50 bg-rose-900/20 px-4 py-2 text-sm text-rose-200 disabled:opacity-50">삭제</button>
                <Link href={`/blog/${selectedSlug}`} target="_blank" className="rounded border border-sky-500/40 bg-sky-900/20 px-4 py-2 text-sm text-sky-200">미리보기</Link>
              </>
            ) : null}
          </div>

          {message ? <p className="mt-3 text-sm text-amber-200">{message}</p> : null}
        </section>
      </div>
    </main>
  );
}
