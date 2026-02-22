"use client"

import { useState, useMemo } from "react";
import { Post } from "@/lib/mdx";
import { PostCard } from "@/components/blog/post-card";
import { BlogHeader } from "@/components/blog/blog-header";
import { CategoryFilter } from "@/components/blog/category-filter";
import { Search } from "lucide-react";

interface BlogPageClientProps {
    posts: Post[];
    categories: string[];
}

export function BlogPageClient({ posts, categories }: BlogPageClientProps) {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Apply category + query filter together for better post discoverability.
    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
            if (!matchesCategory) return false;
            if (!normalizedQuery) return true;

            const searchableText = [
                post.title,
                post.description,
                post.category,
                ...(post.tags || []),
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(normalizedQuery);
        });
    }, [posts, selectedCategory, normalizedQuery]);

    // Separate featured posts
    const featuredPosts = filteredPosts.filter(post => post.featured);
    const regularPosts = filteredPosts.filter(post => !post.featured);

    return (
        <main className="container relative mx-auto flex-1 max-w-screen-xl px-4 py-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.08),transparent_56%)]" />
            <BlogHeader />

            <div className="mb-6 mx-auto max-w-2xl">
                <label htmlFor="blog-search" className="sr-only">
                    블로그 검색
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        id="blog-search"
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="제목, 설명, 태그, 카테고리 검색"
                        className="w-full rounded-lg border border-black/30 bg-white py-2.5 pl-9 pr-3 text-sm text-black outline-none transition-colors placeholder:text-black/45 focus:border-black"
                    />
                </div>
            </div>

            <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
            />

            <div className="mb-8 flex items-center justify-between gap-3 text-sm text-black/65">
                <p>
                    총 <span className="font-semibold text-black">{filteredPosts.length}</span>개 글
                </p>
                {(selectedCategory !== "All" || normalizedQuery) && (
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCategory("All");
                            setSearchQuery("");
                        }}
                        className="rounded-md border border-black/25 bg-white px-3 py-1.5 text-xs font-medium text-black hover:border-black"
                    >
                        필터 초기화
                    </button>
                )}
            </div>

            {filteredPosts.length > 0 ? (
                <>
                    {/* Featured Posts Section */}
                    {featuredPosts.length > 0 && (
                        <div className="mb-12">
                            <h2 className="mb-6 font-heading text-2xl font-bold text-black">주요 글</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {featuredPosts.map((post, index) => (
                                    <PostCard key={post.slug} post={post} index={index} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regular Posts Grid */}
                    {regularPosts.length > 0 && (
                        <div>
                            {featuredPosts.length > 0 && (
                                <h2 className="mb-6 font-heading text-2xl font-bold text-black">모든 글</h2>
                            )}
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {regularPosts.map((post, index) => (
                                    <PostCard
                                        key={post.slug}
                                        post={post}
                                        index={featuredPosts.length + index}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20">
                    <p className="text-lg text-black/60">
                        {(selectedCategory !== "All" || normalizedQuery)
                            ? "조건에 맞는 글이 없습니다. 검색어 또는 카테고리를 바꿔보세요."
                            : "아직 작성된 글이 없습니다."}
                    </p>
                </div>
            )}
        </main>
    );
}
