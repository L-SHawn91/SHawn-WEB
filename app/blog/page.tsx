// i18n-exempt: user-facing blog shell copy is delegated to BlogPageClient.
import { BlogPageClient } from "@/components/blog/blog-page-client";
import { getAllPosts } from "@/lib/mdx";
import { getPublicCategoryLabel, getPublicTagLabels } from "@/lib/public-labels";
import { SITE_URL } from "@/lib/site-url";
import type { Metadata } from "next";

const BLOG_URL = `${SITE_URL}/blog`;

export const metadata: Metadata = {
  title: "블로그 - AI, Bio & Asset Signals",
  description: "AI, Bio, Asset Signals를 공개 글·이미지·읽기 흐름으로 정리하는 SHawn_LAB 블로그",
  alternates: {
    canonical: BLOG_URL,
  },
  openGraph: {
    type: "website",
    url: BLOG_URL,
    title: "SHawn_LAB 블로그",
    description: "AI, Bio, Asset Signals를 공개 글·이미지·읽기 흐름으로 정리하는 SHawn_LAB 블로그",
    siteName: "SHawn_LAB",
    locale: "ko_KR",
  },
};

export default function BlogPage() {
  const posts = getAllPosts().map((post) => ({
    ...post,
    category: getPublicCategoryLabel(post.category),
    tags: getPublicTagLabels(post.tags),
  }));

  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));

  return <BlogPageClient posts={posts} categories={categories} />;
}
