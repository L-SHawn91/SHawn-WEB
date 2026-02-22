import { BlogPageClient } from "@/components/blog/blog-page-client";
import { getAllPosts } from "@/lib/mdx";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "블로그",
  description: "바이오 리서치, 자동화 운영, 마켓 인텔리전스 실전 아카이브",
  alternates: {
    canonical: "https://phdshawn.com/blog",
  },
  openGraph: {
    type: "website",
    url: "https://phdshawn.com/blog",
    title: "SHawn_LAB 블로그",
    description: "바이오 리서치, 자동화 운영, 마켓 인텔리전스 실전 아카이브",
    siteName: "SHawn_LAB",
    locale: "ko_KR",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));

  return <BlogPageClient posts={posts} categories={categories} />;
}
