"use client"

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PostMeta } from "@/lib/mdx";
import { getAssetPostKind, isBlogLane } from "@/lib/public-labels";
import { PostCard } from "@/components/blog/post-card";
import { BlogHeader } from "@/components/blog/blog-header";
import { CategoryFilter } from "@/components/blog/category-filter";
import { Search } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

type AssetView = "all" | "explainers" | "signals";

interface BlogPageClientProps {
    posts: PostMeta[];
    categories: string[];
}

const PAGE_SIZE = 24;

const copy = {
    ko: {
        searchLabel: "블로그 검색",
        searchPlaceholder: "제목, 설명, 태그, 분야 검색",
        countPrefix: "총",
        countSuffix: "개 글",
        reset: "필터 초기화",
        featured: "주요 글",
        allPosts: "모든 글",
        emptyFiltered: "조건에 맞는 글이 없습니다. 검색어 또는 분야를 바꿔보세요.",
        empty: "아직 작성된 글이 없습니다.",
        lanesTitle: "세 가지 공개 인텔리전스",
        lanesDesc: "최근 글 전체를 한 피드에 섞지 않고, 독자가 필요한 판단 방식에 따라 세 분야로 연결합니다.",
        lanes: [
            {
                category: "AI Notes",
                title: "AI Systems",
                body: "새 도구 발표를 배포·평가·보안·운영 기준으로 번역합니다.",
                focus: "인프라 · 에이전트 · 검증 · 크리에이터 도구",
            },
            {
                category: "Bio Notes",
                title: "Bio Evidence",
                body: "승인, 임상 결과, 바이오마커에서 확인된 것과 아직 모르는 것을 분리합니다.",
                focus: "FDA · 임상 endpoint · 세포·유전자 치료",
            },
            {
                category: "Asset Signals",
                title: "Asset Intelligence",
                body: "시간대별 시장 신호와 오래 읽는 생활비·공급망 설명을 분리해 제공합니다.",
                focus: "시장 스트림 · 반도체 · 에너지 · 생활비",
            },
        ],
        assetTitle: "Asset 글 형식",
        assetViews: {
            all: "전체",
            explainers: "해설",
            signals: "시장 스트림",
        },
        loadMore: "글 더 보기",
        remaining: "개 남음",
    },
    en: {
        searchLabel: "Search blog",
        searchPlaceholder: "Search title, description, tags, or lane",
        countPrefix: "Showing",
        countSuffix: "posts",
        reset: "Reset filters",
        featured: "Featured posts",
        allPosts: "All posts",
        emptyFiltered: "No posts match this filter. Try another query or lane.",
        empty: "No posts yet.",
        lanesTitle: "Three public intelligence lanes",
        lanesDesc: "The full archive is organized by the kind of decision a reader needs, rather than mixed into one undifferentiated feed.",
        lanes: [
            {
                category: "AI Notes",
                title: "AI Systems",
                body: "Translate product news into deployment, evaluation, security, and operating criteria.",
                focus: "Infrastructure · agents · verification · creator tools",
            },
            {
                category: "Bio Notes",
                title: "Bio Evidence",
                body: "Separate what approvals, trials, and biomarkers show from what remains unknown.",
                focus: "FDA · clinical endpoints · cell and gene therapy",
            },
            {
                category: "Asset Signals",
                title: "Asset Intelligence",
                body: "Separate time-stamped market signals from durable explainers on costs and supply chains.",
                focus: "Market stream · semiconductors · energy · living costs",
            },
        ],
        assetTitle: "Asset article format",
        assetViews: {
            all: "All",
            explainers: "Explainers",
            signals: "Market stream",
        },
        loadMore: "Load more",
        remaining: "remaining",
    },
} as const;

export function BlogPageClient({ posts, categories }: BlogPageClientProps) {
    const searchParams = useSearchParams();
    const requestedCategory = searchParams.get("category") || "";
    const initialCategory = isBlogLane(requestedCategory) && categories.includes(requestedCategory)
        ? requestedCategory
        : "All";
    const requestedFormat = searchParams.get("format");
    const initialAssetView: AssetView = requestedFormat === "signals" || requestedFormat === "explainers"
        ? requestedFormat
        : "all";
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [assetView, setAssetView] = useState<AssetView>(initialAssetView);
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const { language } = useLanguage();
    const t = copy[language];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const categoryCounts = useMemo(() => posts.reduce<Record<string, number>>((counts, post) => {
        counts[post.category] = (counts[post.category] || 0) + 1;
        return counts;
    }, {}), [posts]);

    const assetCounts = useMemo(() => {
        const assetPosts = posts.filter((post) => post.category === "Asset Signals");
        return assetPosts.reduce(
            (counts, post) => {
                counts[getAssetPostKind(post)] += 1;
                return counts;
            },
            { explainer: 0, signal: 0 },
        );
    }, [posts]);

    const filteredPosts = useMemo(() => posts.filter((post) => {
        const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
        if (!matchesCategory) return false;
        if (selectedCategory === "Asset Signals" && assetView !== "all") {
            const expectedKind = assetView === "signals" ? "signal" : "explainer";
            if (getAssetPostKind(post) !== expectedKind) return false;
        }
        if (!normalizedQuery) return true;

        const searchableText = [post.title, post.description, post.category, ...(post.tags || [])]
            .join(" ")
            .toLowerCase();
        return searchableText.includes(normalizedQuery);
    }), [posts, selectedCategory, assetView, normalizedQuery]);

    const featuredPosts = filteredPosts.filter((post) => post.featured);
    const regularPosts = filteredPosts.filter((post) => !post.featured);
    const visibleRegularPosts = regularPosts.slice(0, visibleCount);
    const remainingCount = Math.max(0, regularPosts.length - visibleRegularPosts.length);


    const updateUrl = (category: string, format: AssetView) => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        if (category === "All") url.searchParams.delete("category");
        else url.searchParams.set("category", category);
        if (category === "Asset Signals" && format !== "all") url.searchParams.set("format", format);
        else url.searchParams.delete("format");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    };

    const selectCategory = (category: string, nextAssetView: AssetView = "all") => {
        setSelectedCategory(category);
        setAssetView(nextAssetView);
        setVisibleCount(PAGE_SIZE);
        updateUrl(category, nextAssetView);
    };

    const selectAssetView = (nextAssetView: AssetView) => {
        setAssetView(nextAssetView);
        setVisibleCount(PAGE_SIZE);
        updateUrl("Asset Signals", nextAssetView);
    };

    const resetFilters = () => {
        setSelectedCategory("All");
        setAssetView("all");
        setSearchQuery("");
        setVisibleCount(PAGE_SIZE);
        updateUrl("All", "all");
    };

    return (
        <main className="container relative mx-auto max-w-screen-xl flex-1 px-4 py-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(42,157,143,0.16),transparent_56%)] dark:bg-[radial-gradient(circle_at_top,rgba(78,198,185,0.12),transparent_56%)]" />
            <BlogHeader />

            <section className="mb-8 rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur md:p-6" aria-labelledby="blog-strategy-heading">
                <div className="mb-5 max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2A9D8F]">SHawn-WEB</p>
                    <h2 id="blog-strategy-heading" className="mt-2 font-heading text-2xl font-bold text-foreground md:text-3xl">
                        {t.lanesTitle}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">{t.lanesDesc}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    {t.lanes.map((lane) => (
                        <button
                            key={lane.category}
                            type="button"
                            onClick={() => selectCategory(lane.category)}
                            className="rounded-2xl border border-border bg-background/80 p-5 text-left transition hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-heading text-lg font-bold text-foreground">{lane.title}</h3>
                                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                                    {categoryCounts[lane.category] || 0}
                                </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{lane.body}</p>
                            <p className="mt-3 text-xs font-semibold text-foreground/70">{lane.focus}</p>
                        </button>
                    ))}
                </div>
            </section>

            <div className="mx-auto mb-6 max-w-2xl">
                <label htmlFor="blog-search" className="sr-only">{t.searchLabel}</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        id="blog-search"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setVisibleCount(PAGE_SIZE);
                        }}
                        placeholder={t.searchPlaceholder}
                        className="w-full rounded-full border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    />
                </div>
            </div>

            <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                categoryCounts={categoryCounts}
                totalCount={posts.length}
                onSelectCategory={selectCategory}
            />

            {selectedCategory === "Asset Signals" && (
                <div className="mb-8 flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t.assetTitle}>
                    <span className="mr-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t.assetTitle}</span>
                    {(["all", "explainers", "signals"] as const).map((view) => {
                        const count = view === "all" ? categoryCounts["Asset Signals"] || 0 : assetCounts[view === "signals" ? "signal" : "explainer"];
                        return (
                            <button
                                key={view}
                                type="button"
                                onClick={() => selectAssetView(view)}
                                aria-pressed={assetView === view}
                                className={assetView === view
                                    ? "rounded-full border border-foreground bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                                    : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-foreground/50"}
                            >
                                {t.assetViews[view]} {count}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="mb-8 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>{t.countPrefix} <span className="font-semibold text-foreground">{filteredPosts.length}</span>{" "}{t.countSuffix}</p>
                {(selectedCategory !== "All" || normalizedQuery) && (
                    <button type="button" onClick={resetFilters} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground">
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
                                {featuredPosts.map((post) => <PostCard key={post.slug} post={post} />)}
                            </div>
                        </div>
                    )}

                    {regularPosts.length > 0 && (
                        <div>
                            {featuredPosts.length > 0 && <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">{t.allPosts}</h2>}
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {visibleRegularPosts.map((post) => (
                                    <PostCard key={post.slug} post={post} />
                                ))}
                            </div>
                            {remainingCount > 0 && (
                                <div className="mt-10 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                                        className="rounded-full border border-foreground bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:bg-background hover:text-foreground"
                                    >
                                        {t.loadMore} · {remainingCount} {t.remaining}
                                    </button>
                                </div>
                            )}
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
