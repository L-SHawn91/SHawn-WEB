// i18n-exempt: user-facing blog shell copy is delegated to BlogPageClient.
import { Suspense } from "react";
import { BlogPageClient } from "@/components/blog/blog-page-client";
import { getAllPostMeta } from "@/lib/mdx";
import { getPublicCategoryLabel, getPublicTagLabels } from "@/lib/public-labels";
import { SITE_URL } from "@/lib/site-url";
import type { Metadata } from "next";

const BLOG_URL = `${SITE_URL}/blog`;

export const metadata: Metadata = {
  title: "블로그 - AI, Bio & Asset Signals",
  description: "AI 시스템, 바이오 근거, 시장·생활비 신호를 근거 중심 글과 읽기 흐름으로 정리하는 SHawn_LAB 블로그",
  alternates: {
    canonical: BLOG_URL,
  },
  openGraph: {
    type: "website",
    url: BLOG_URL,
    title: "SHawn_LAB 블로그",
    description: "AI 시스템, 바이오 근거, 시장·생활비 신호를 근거 중심 글과 읽기 흐름으로 정리하는 SHawn_LAB 블로그",
    siteName: "SHawn_LAB",
    locale: "ko_KR",
  },
};

function BlogPageFallback() {
  return (
    <main className="container mx-auto max-w-screen-xl flex-1 px-4 py-12 md:py-16" aria-hidden="true">
      <div className="mx-auto h-40 max-w-3xl animate-pulse rounded-3xl bg-muted" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </main>
  );
}

export default function BlogPage() {
  const posts = getAllPostMeta().map((post) => ({
    ...post,
    category: getPublicCategoryLabel(post.category),
    tags: getPublicTagLabels(post.tags),
  }));

  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));

  return (
    <Suspense fallback={<BlogPageFallback />}>
      <BlogPageClient posts={posts} categories={categories} />
    </Suspense>
  );
}
