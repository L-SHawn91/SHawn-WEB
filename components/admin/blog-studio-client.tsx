"use client";

/* eslint-disable @next/next/no-img-element -- editor previews use browser object URLs before publishing */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Save, ShieldCheck, WandSparkles } from "lucide-react";

type StudioMedia = {
  id: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  previewUrl: string;
  alt: string;
  caption: string;
  role: "hero" | "inline" | "support";
  originalName: string;
  originalSize: number;
  outputSize: number;
};

type PublishResult = {
  success?: boolean;
  dryRun?: boolean;
  slug?: string;
  url?: string;
  files?: string[];
  mdx?: string;
  commitSha?: string;
  error?: string;
};

const today = new Date().toISOString().slice(0, 10);
const initialBody = `첫 문단에 독자가 바로 이해할 수 있는 핵심 메시지를 씁니다.\n\n## 왜 중요한가\n\n- 배경\n- 사례\n- 실행 포인트\n\n## SHawn_LAB 메모\n\n공개 독자에게 필요한 설명만 남기고 내부 작업명은 숨깁니다.`;

function toSlug(raw: string) {
  const slug = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
  return slug || `post-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function prepareImageForPublish(file: File): Promise<StudioMedia> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 변환 캔버스를 만들 수 없습니다.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("WebP 변환 실패"))), "image/webp", 0.86);
  });
  const dataBase64 = await blobToBase64(blob);
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "image";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fileName: `${base}.webp`,
    mimeType: "image/webp",
    dataBase64,
    previewUrl: URL.createObjectURL(blob),
    alt: file.name.replace(/\.[^.]+$/, ""),
    caption: "",
    role: "inline",
    originalName: file.name,
    originalSize: file.size,
    outputSize: blob.size,
  };
}

function sizeKb(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString()} KB`;
}

export function BlogStudioClient() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("AI Notes");
  const [tagsText, setTagsText] = useState("AI, SHawn_LAB");
  const [featured, setFeatured] = useState(true);
  const [body, setBody] = useState(initialBody);
  const [media, setMedia] = useState<StudioMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  const effectiveSlug = useMemo(() => toSlug(slug || title), [slug, title]);
  const tags = useMemo(() => tagsText.split(",").map((tag) => tag.trim()).filter(Boolean), [tagsText]);

  const payload = useMemo(() => ({
    title,
    slug: effectiveSlug,
    description,
    date,
    category,
    tags,
    featured,
    author: "Dr.SHawn",
    body,
    media: media.map(({ fileName, mimeType, dataBase64, alt, caption, role }) => ({
      fileName,
      mimeType,
      dataBase64,
      alt,
      caption,
      role,
    })),
  }), [title, effectiveSlug, description, date, category, tags, featured, body, media]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMessage("이미지를 SHawn-WEB용 WebP로 변환하는 중...");
    try {
      const converted = await Promise.all(Array.from(files).map(prepareImageForPublish));
      const next = [...media, ...converted].slice(0, 12);
      const totalPayloadBytes = next.reduce((sum, item) => sum + item.outputSize, 0);
      if (totalPayloadBytes > 3_400_000) {
        converted.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        throw new Error("이미지 변환본 총량이 큽니다. 3.4MB 이하로 줄여서 나눠 올리세요.");
      }
      if (!next.some((item) => item.role === "hero") && next[0]) next[0] = { ...next[0], role: "hero" };
      setMedia(next);
      setMessage(`이미지 ${converted.length}개 변환 완료. 원본은 저장하지 않고 WebP 변환본만 게시됩니다.`);
    } catch (error: any) {
      setMessage(error?.message || "이미지 변환 실패");
    } finally {
      setBusy(false);
    }
  };

  const updateMedia = (id: string, patch: Partial<StudioMedia>) => {
    setMedia((prev) => prev.map((item) => {
      if (item.id !== id) return patch.role === "hero" ? { ...item, role: item.role === "hero" ? "inline" : item.role } : item;
      return { ...item, ...patch };
    }));
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((item) => item.id !== id);
      if (target?.role === "hero" && next[0] && !next.some((item) => item.role === "hero")) {
        next[0] = { ...next[0], role: "hero" };
      }
      return next;
    });
  };

  const callPublish = async (dryRun: boolean): Promise<PublishResult | null> => {
    if (!title.trim() || !body.trim()) {
      setMessage("제목과 본문은 필수입니다.");
      return null;
    }
    setBusy(true);
    setMessage(dryRun ? "게시 전 검증 중..." : "GitHub 커밋으로 게시 중...");
    setResult(null);
    try {
      const response = await fetch("/api/admin/blog/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shawn-blog-studio": "1" },
        body: JSON.stringify({ ...payload, dryRun }),
      });
      const data = await response.json();
      setResult(data);
      if (!response.ok) throw new Error(data?.error || "요청 실패");
      setMessage(dryRun ? "검증 완료: MDX와 이미지 경로가 준비되었습니다." : `게시 커밋 완료: ${data.commitSha || data.slug}`);
      return data;
    } catch (error: any) {
      setMessage(error?.message || "게시 실패");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const downloadMdx = async () => {
    const data = await callPublish(true);
    if (!data?.mdx) return;
    const blob = new Blob([data.mdx], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${effectiveSlug}.mdx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-4 py-8 text-[#263238] dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D8DEE6] bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#2A9D8F]">SHawn-WEB authoring</p>
              <h1 className="mt-2 text-3xl font-black text-[#10243A] dark:text-slate-50">SHawn Blog Studio</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#263238]/70 dark:text-slate-400">
                WordPress처럼 숀웹 안에서 글을 쓰고, 이미지는 업로드 즉시 1600px 이하 WebP로 재인코딩합니다. 원본 이미지를 그대로 복사하지 않습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void callPublish(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-[#2A9D8F]/40 bg-white px-4 py-2 text-sm font-bold text-[#10243A] shadow-sm hover:bg-[#2A9D8F]/10 disabled:opacity-50 dark:bg-slate-950 dark:text-slate-100">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 검증
              </button>
              <button onClick={() => void callPublish(false)} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#10243A] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1b3654] disabled:opacity-50">
                <Save className="h-4 w-4" /> GitHub 커밋 게시
              </button>
              <button onClick={() => void downloadMdx()} disabled={busy} className="rounded-full border border-[#D8DEE6] bg-[#F7F3EA] px-4 py-2 text-sm font-bold hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800">
                MDX 내보내기
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#263238]/65 dark:text-slate-400">
            <span className="rounded-full bg-[#2A9D8F]/10 px-3 py-1">Draft → dry-run → commit publish</span>
            <span className="rounded-full bg-[#E76F51]/10 px-3 py-1">No raw image copy</span>
            <span className="rounded-full bg-[#7B6BA8]/10 px-3 py-1">/blog/{effectiveSlug}</span>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <section className="space-y-5 rounded-3xl border border-[#D8DEE6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">제목
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="블로그 제목" className="mt-1 w-full rounded-2xl border border-[#D8DEE6] bg-white px-4 py-3 text-sm outline-none focus:border-[#2A9D8F] dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <label className="text-sm font-semibold">Slug
                <input value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} placeholder={effectiveSlug} className="mt-1 w-full rounded-2xl border border-[#D8DEE6] bg-white px-4 py-3 text-sm outline-none focus:border-[#2A9D8F] dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <label className="text-sm font-semibold">날짜
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#D8DEE6] bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <label className="text-sm font-semibold">카테고리
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#D8DEE6] bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
              </label>
            </div>
            <label className="block text-sm font-semibold">요약
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="목록/OG에 들어갈 1문장 요약" className="mt-1 w-full rounded-2xl border border-[#D8DEE6] bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="block text-sm font-semibold">태그
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="AI, workflow, blog" className="mt-1 w-full rounded-2xl border border-[#D8DEE6] bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
            </label>
            <label className="block text-sm font-semibold">본문 편집기(MDX)
              <textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 min-h-[460px] w-full rounded-2xl border border-[#D8DEE6] bg-[#F7F3EA]/50 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-[#2A9D8F] dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-[#D8DEE6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#10243A] dark:text-slate-50">Media</h2>
                  <p className="mt-1 text-xs text-[#263238]/60 dark:text-slate-400">원본 저장 금지 · 브라우저에서 WebP 변환 후 게시</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#E76F51] px-3 py-2 text-xs font-bold text-white hover:bg-[#d96045]">
                  <ImagePlus className="h-4 w-4" /> 이미지 추가
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
                </label>
              </div>
              <div className="mt-4 space-y-3">
                {media.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[#D8DEE6] bg-[#F7F3EA]/60 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                    <img src={item.previewUrl} alt={item.alt} className="aspect-video w-full rounded-xl object-cover" />
                    <div className="mt-3 grid gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#263238]/60 dark:text-slate-400">
                        <span>{item.originalName} → {item.fileName}</span>
                        <span>{sizeKb(item.originalSize)} → {sizeKb(item.outputSize)}</span>
                      </div>
                      <select value={item.role} onChange={(e) => updateMedia(item.id, { role: e.target.value as StudioMedia["role"] })} className="rounded-xl border border-[#D8DEE6] bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                        <option value="hero">Hero image</option>
                        <option value="inline">Inline body image</option>
                        <option value="support">Support image</option>
                      </select>
                      <input value={item.alt} onChange={(e) => updateMedia(item.id, { alt: e.target.value })} className="rounded-xl border border-[#D8DEE6] bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="alt text" />
                      <input value={item.caption} onChange={(e) => updateMedia(item.id, { caption: e.target.value })} className="rounded-xl border border-[#D8DEE6] bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="caption" />
                      <button type="button" onClick={() => removeMedia(item.id)} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300">
                        이미지 제거
                      </button>
                    </div>
                  </article>
                ))}
                {!media.length && <p className="rounded-2xl border border-dashed border-[#D8DEE6] p-5 text-center text-sm text-[#263238]/50 dark:border-slate-700 dark:text-slate-500">아직 이미지가 없습니다.</p>}
              </div>
            </section>

            <section className="rounded-3xl border border-[#D8DEE6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#2A9D8F]"><WandSparkles className="h-4 w-4" /> Preview</div>
              <article className="overflow-hidden rounded-2xl border border-[#D8DEE6] bg-[#F7F3EA]/70 dark:border-slate-700 dark:bg-slate-950">
                {media[0] && <img src={(media.find((item) => item.role === "hero") || media[0]).previewUrl} alt="Preview hero" className="aspect-video w-full object-cover" />}
                <div className="p-5">
                  <p className="text-xs font-semibold text-[#2A9D8F]">{category} · {date}</p>
                  <h2 className="mt-2 text-xl font-black text-[#10243A] dark:text-slate-50">{title || "제목을 입력하세요"}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#263238]/70 dark:text-slate-400">{description || body.slice(0, 140)}</p>
                  <div className="mt-3 flex flex-wrap gap-1">{tags.map((tag) => <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] dark:bg-slate-800">{tag}</span>)}</div>
                </div>
              </article>
            </section>

            {message && <p className="rounded-2xl border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{message}</p>}
            {result?.files && (
              <section className="rounded-3xl border border-[#D8DEE6] bg-white p-5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-bold">Publish output</h2>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#263238]/70 dark:text-slate-400">
                  {result.files.map((file) => <li key={file}>{file}</li>)}
                </ul>
                {result.url && <Link href={result.url} className="mt-3 inline-block text-sm font-bold text-[#E76F51] underline">게시 글 열기</Link>}
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
