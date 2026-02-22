import { BlogPageClient } from "@/components/blog/blog-page-client";
import { getAllPosts } from "@/lib/mdx";

export default function BlogPage() {
  const posts = getAllPosts();

  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));

  return <BlogPageClient posts={posts} categories={categories} />;
}
