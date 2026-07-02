"use client"

import { useState, useMemo } from "react";
import { Post } from "@/lib/mdx";
import { PostCard } from "@/components/blog/post-card";
import { BlogHeader } from "@/components/blog/blog-header";
import { CategoryFilter } from "@/components/blog/category-filter";
import { Search } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

interface BlogPageClientProps {
    posts: Post[];
    categories: string[];
}

const copy = {
    ko: {
        searchLabel: "블로그 검색",
        searchPlaceholder: "제목, 설명, 태그, 카테고리 검색",
        countPrefix: "총",
        countSuffix: "개 글",
        reset: "필터 초기화",
        featured: "주요 글",
        allPosts: "모든 글",
        emptyFiltered: "조건에 맞는 글이 없습니다. 검색어 또는 카테고리를 바꿔보세요.",
        empty: "아직 작성된 글이 없습니다.",
        lanesTitle: "노출·수익화 운영 전략",
        lanesDesc: "공개 글은 검색 유입 → 본문 체류 → 관련 글 이동 → 광고/제휴/문의 전환까지 이어지도록 설계합니다.",
        lanes: [
            { title: "검색 노출", body: "제목·설명·OG 이미지·sitemap을 정리해 글 단위 발견 가능성을 높입니다." },
            { title: "본문 체류", body: "상단 이미지 덤프 대신 섹션 사이 inline visual로 읽는 흐름을 유지합니다." },
            { title: "수익화 안전선", body: "광고와 제휴는 공개 disclosure와 교육/해설 경계 안에서만 연결합니다." },
        ],
    },
    en: {
        searchLabel: "Search blog",
        searchPlaceholder: "Search title, description, tags, or category",
        countPrefix: "Showing",
        countSuffix: "posts",
        reset: "Reset filters",
        featured: "Featured posts",
        allPosts: "All posts",
        emptyFiltered: "No posts match this filter. Try another query or category.",
        empty: "No posts yet.",
        lanesTitle: "Visibility & monetization strategy",
        lanesDesc: "Each public post is designed as a funnel: search discovery → reading depth → related posts → ad, affiliate, or inquiry conversion.",
        lanes: [
            { title: "Search visibility", body: "Tight titles, descriptions, OG images, and sitemap entries improve article-level discovery." },
            { title: "Reading depth", body: "Inline visuals keep images in context instead of dumping them at the top." },
            { title: "Safe monetization", body: "Ads and affiliate paths stay inside visible disclosure and education/commentary boundaries." },
        ],
    },
} as const;

export function BlogPageClient({ posts, categories }: BlogPageClientProps) {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const { language } = useLanguage();
    const t = copy[language];

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
            if (!matchesCategory) return false;
            if (!normalizedQuery) return true;

            const searchableText = [post.title, post.description, post.category, ...(post.tags || [])]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(normalizedQuery);
        });
    }, [posts, selectedCategory, normalizedQuery]);

    const featuredPosts = filteredPosts.filter((post: Post) => post.featured);
    const regularPosts = filteredPosts.filter((post: Post) => !post.featured);

    return (
        <main className="container relative mx-auto max-w-screen-xl flex-1 px-4 py-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(42,157,143,0.16),transparent_56%)] dark:bg-[radial-gradient(circle_at_top,rgba(78,198,185,0.12),transparent_56%)]" />
            <BlogHeader />

            <section className="mb-8 rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur md:p-6" aria-labelledby="blog-strategy-heading">
                <div className="grid gap-5 lg:grid-cols-[0.95fr_1.45fr] lg:items-center">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2A9D8F]">SHawn-WEB</p>
                        <h2 id="blog-strategy-heading" className="mt-2 font-heading text-2xl font-bold text-foreground md:text-3xl">
                            {t.lanesTitle}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">{t.lanesDesc}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        {t.lanes.map((lane) => (
                            <div key={lane.title} className="rounded-2xl border border-border bg-background/80 p-4">
                                <h3 className="font-heading text-lg font-bold text-foreground">{lane.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{lane.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="mx-auto mb-6 max-w-2xl">
                <label htmlFor="blog-search" className="sr-only">
                    {t.searchLabel}
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        id="blog-search"
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full rounded-full border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    />
                </div>
            </div>

            <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

            <div className="mb-8 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                    {t.countPrefix} <span className="font-semibold text-foreground">{filteredPosts.length}</span>{" "}{t.countSuffix}
                </p>
                {(selectedCategory !== "All" || normalizedQuery) && (
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCategory("All");
                            setSearchQuery("");
                        }}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground"
                    >
                        {t.reset}
                    </button>
                )}
            </div>

            {filteredPosts.length > 0 ? (
                <>
                    {featuredPosts.length > 0 && (
                        <div className="mb-12">
                            <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">{t.featured}</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {featuredPosts.map((post, index) => <PostCard key={post.slug} post={post} index={index} />)}
                            </div>
                        </div>
                    )}

                    {regularPosts.length > 0 && (
                        <div>
                            {featuredPosts.length > 0 && <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">{t.allPosts}</h2>}
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {regularPosts.map((post, index) => (
                                    <PostCard key={post.slug} post={post} index={featuredPosts.length + index} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="py-20 text-center">
                    <p className="text-lg text-muted-foreground">
                        {(selectedCategory !== "All" || normalizedQuery) ? t.emptyFiltered : t.empty}
                    </p>
                </div>
            )}
        </main>
    );
}
