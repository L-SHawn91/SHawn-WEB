"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { trackEngagement } from "@/components/seo/engagement-events";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

export type HomePost = {
  slug: string;
  title: string;
  date: string;
  description: string;
  category: string;
  image?: string;
};

type HomePageClientProps = {
  recentPosts: HomePost[];
};

type DesignMode = "ai" | "assets" | "bio";

const CACHE_LIMIT = 6;

const SEARCH_SOURCES: Record<DesignMode, string[]> = {
  ai: ["semantic", "openalex", "arxiv"],
  assets: ["datagov", "dataeu", "kaggle", "huggingface", "openml", "zenodo"],
  bio: ["pubmed", "europepmc", "biorxiv", "openalex"],
};

const copy = {
  ko: {
    eyebrow: "RESEARCH INTELLIGENCE",
    title: "SHawn_LAB",
    lead: "AI 시스템·바이오 근거·시장 신호를 검증 가능한 공개 인텔리전스로 연결합니다.",
    entryLabel: "주요 공개 영역",
    searchIntro: "또는 공개 논문·데이터 검색",
    searchLabel: "검색어",
    searchButton: "검색",
    quickLabel: "캐시 검색",
    cacheHint: "빠른검색은 저장된 캐시만 보여줍니다. 클릭하면 입력창에만 채워집니다.",
    designLabel: "검색 타입",
    designs: [
      {
        key: "ai",
        label: "AI",
        desc: "AI 논문 · arXiv/Semantic",
        placeholder: "예: AI agent benchmark, model evaluation, MCP tools",
        quick: ["AI agent benchmark", "model evaluation", "MCP tools", "computer use AI"],
      },
      {
        key: "assets",
        label: "Assets",
        desc: "공공·시장 데이터셋",
        placeholder: "예: semiconductor cycle, power grid, inflation data",
        quick: ["semiconductor cycle", "power grid", "inflation data", "market signal report"],
      },
      {
        key: "bio",
        label: "Bio",
        desc: "Bio 논문 · PubMed/PMC",
        placeholder: "예: endometrium atlas, Asherman dataset, single-cell fibrosis",
        quick: ["endometrium atlas", "Asherman dataset", "single-cell fibrosis", "organoid engraftment"],
      },
    ],
    menuItems: [
      { title: "Blog", href: "/blog", desc: "공개 글" },
      { title: "Bio", href: "/bio", desc: "연구 근거" },
      { title: "Assets", href: "/invest", desc: "참고 리포트" },
    ],
    latestPrefix: "분야별 최근 공개 글",
  },
  en: {
    eyebrow: "RESEARCH INTELLIGENCE",
    title: "SHawn_LAB",
    lead: "Evidence-aware intelligence across AI systems, biomedical research, and market signals.",
    entryLabel: "Primary public lanes",
    searchIntro: "Or search public papers and datasets",
    searchLabel: "Search query",
    searchButton: "Search",
    quickLabel: "Cached search",
    cacheHint: "Quick searches are cache-only. Selecting one only fills the input.",
    designLabel: "Search type",
    designs: [
      {
        key: "ai",
        label: "AI",
        desc: "AI papers · arXiv/Semantic",
        placeholder: "e.g. AI agent benchmark, model evaluation, MCP tools",
        quick: ["AI agent benchmark", "model evaluation", "MCP tools", "computer use AI"],
      },
      {
        key: "assets",
        label: "Assets",
        desc: "Public/market datasets",
        placeholder: "e.g. semiconductor cycle, power grid, inflation data",
        quick: ["semiconductor cycle", "power grid", "inflation data", "market signal report"],
      },
      {
        key: "bio",
        label: "Bio",
        desc: "Bio papers · PubMed/PMC",
        placeholder: "e.g. endometrium atlas, Asherman dataset, single-cell fibrosis",
        quick: ["endometrium atlas", "Asherman dataset", "single-cell fibrosis", "organoid engraftment"],
      },
    ],
    menuItems: [
      { title: "Blog", href: "/blog", desc: "Articles" },
      { title: "Bio", href: "/bio", desc: "Evidence" },
      { title: "Assets", href: "/invest", desc: "Reference reports" },
    ],
    latestPrefix: "Latest by intelligence lane",
  },
} as const;

function uniqueQueries(items: string[]) {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, CACHE_LIMIT);
}

export function HomePageClient({ recentPosts }: HomePageClientProps) {
  const { language } = useLanguage();
  const t = copy[language];
  const [query, setQuery] = useState("");
  const [design, setDesign] = useState<DesignMode>("ai");
  const activeDesign = t.designs.find((item) => item.key === design) ?? t.designs[0];
  const [cachedQueries, setCachedQueries] = useState<string[]>(activeDesign.quick.slice(0, CACHE_LIMIT));


  useEffect(() => {
    if (typeof window === "undefined") return;
    const cacheKey = `shawn-home-query-cache:${design}`;
    let stored: string[] = [];
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) stored = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      stored = [];
    }
    setCachedQueries(uniqueQueries([...stored, ...activeDesign.quick]));
  }, [activeDesign, design]);

  const rememberQuery = (nextQuery: string) => {
    if (typeof window === "undefined") return;
    const cacheKey = `shawn-home-query-cache:${design}`;
    const nextCache = uniqueQueries([nextQuery, ...cachedQueries]);
    setCachedQueries(nextCache);
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(nextCache));
    } catch {
      // localStorage can be unavailable in private or locked-down contexts.
    }
  };

  const runSearch = (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    rememberQuery(trimmed);
    trackEngagement("home_search_submitted", { lane: design, query_length: trimmed.length });
    const params = new URLSearchParams({
      query: trimmed,
      q: trimmed,
      from: "home",
      searchMode: design,
      sources: SEARCH_SOURCES[design].join(","),
    });
    if (design === "assets") {
      params.set("context", "public data market government open data");
      window.location.assign(`/datasets?${params.toString()}`);
      return;
    }
    window.location.assign(`/papers?${params.toString()}`);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(query);
  };

  return (
    <div className="home-surface relative min-h-screen overflow-hidden text-slate-950 dark:text-slate-50" data-design={design}>
      <div className="surface-glow" aria-hidden="true" />
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-5 py-12 sm:px-8 sm:py-16">
        <section className="mx-auto flex min-h-[62vh] w-full max-w-4xl flex-col items-center justify-center text-center">
          <p className="motion-fade text-xs font-semibold uppercase tracking-[0.34em] text-[color:var(--accent-strong)]">
            {t.eyebrow}
          </p>
          <h1 className="motion-fade motion-delay-1 mt-4 text-5xl font-black tracking-[-0.07em] text-[color:var(--title)] dark:text-white sm:text-7xl">
            {t.title}
          </h1>
          <p className="motion-fade motion-delay-2 mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            {t.lead}
          </p>

          <nav className="motion-fade motion-delay-2 mt-7 flex flex-wrap items-center justify-center gap-3" aria-label={t.entryLabel}>
            {t.menuItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={index === 0
                  ? "rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90 dark:text-slate-950"
                  : "rounded-full border border-slate-300 bg-white/55 px-6 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-[color:var(--accent-soft)] dark:border-slate-700 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:text-white"}
              >
                {item.title} <span className="font-normal opacity-70">· {item.desc}</span>
              </Link>
            ))}
          </nav>

          <p className="motion-fade motion-delay-2 mt-9 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
            {t.searchIntro}
          </p>
          <div className="motion-fade motion-delay-2 mt-3 flex flex-wrap items-center justify-center gap-2" aria-label={t.designLabel}>
            <span className="px-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{t.designLabel}</span>
            {t.designs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setDesign(item.key)}
                className={
                  item.key === design
                    ? "rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-black text-white shadow-sm dark:text-slate-950"
                    : "rounded-full border border-slate-200 bg-white/55 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-[color:var(--accent-soft)] hover:text-slate-950 dark:border-slate-800 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white"
                }
              >
                {item.label} <span className="hidden font-medium opacity-60 sm:inline">· {item.desc}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={onSubmit}
            className="search-shell motion-fade motion-delay-3 mt-5 w-full rounded-[2rem] border border-slate-200 bg-white/86 p-3 text-left shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/82"
            role="search"
          >
            <label htmlFor="home-search" className="sr-only">
              {t.searchLabel}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-slate-400">⌕</span>
                <input
                  id="home-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={activeDesign.placeholder}
                  className="h-16 w-full rounded-[1.45rem] border border-transparent bg-[color:var(--input-bg)] py-4 pl-12 pr-4 text-base font-semibold text-[color:var(--title)] outline-none transition placeholder:text-[color:var(--placeholder)] focus:border-[color:var(--accent-soft)] focus:bg-[color:var(--input-focus)] focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="rounded-[1.45rem] bg-[color:var(--cta)] px-8 py-4 text-sm font-black text-[color:var(--cta-text)] transition hover:-translate-y-0.5 hover:opacity-90 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t.searchButton}
              </button>
            </div>
          </form>

          <div className="motion-fade motion-delay-4 mt-5 flex w-full flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-2 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{t.quickLabel}</span>
              {cachedQueries.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="cache-chip rounded-full border border-slate-200 bg-white/38 px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-[color:var(--accent-soft)] hover:text-slate-900 dark:border-slate-800 dark:bg-white/[0.04] dark:hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">{t.cacheHint}</p>
          </div>

        </section>

        <section className="motion-section mt-10 border-t border-slate-200 pt-7 dark:border-slate-800" aria-label={t.latestPrefix}>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">{t.latestPrefix}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {recentPosts.map((post) => (
              <div key={post.slug} className="rounded-2xl border border-slate-200 bg-white/45 p-4 dark:border-slate-800 dark:bg-white/[0.04]">
                <Link
                  href={`/blog?category=${encodeURIComponent(post.category)}`}
                  className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--accent-strong)]"
                >
                  {post.category}
                </Link>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-2 block line-clamp-2 text-sm font-semibold leading-6 text-slate-700 transition hover:text-[color:var(--accent-strong)] dark:text-slate-200"
                >
                  {post.title}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <style>{`
        .home-surface {
          --title: #0f172a;
          --accent: #0f172a;
          --accent-strong: #0f172a;
          --accent-soft: rgba(15, 23, 42, 0.22);
          --ring: rgba(15, 23, 42, 0.08);
          --wash: rgba(15, 23, 42, 0.045);
          --page-a: #ffffff;
          --page-b: #f4f4f5;
          --cta: #0f172a;
          --cta-text: #ffffff;
          --input-bg: #f8fafc;
          --input-focus: #ffffff;
          --placeholder: #94a3b8;
          --shell-bg: rgba(255, 255, 255, 0.9);
          --shell-border: rgba(15, 23, 42, 0.12);
          --shell-shadow: 0 24px 90px rgba(15, 23, 42, 0.10);
          --chip-bg: rgba(255, 255, 255, 0.72);
          --chip-border: rgba(15, 23, 42, 0.14);
          --motion-rgb: 15, 23, 42;
          background:
            radial-gradient(circle at 50% 22%, var(--wash), transparent 33%),
            linear-gradient(135deg, var(--page-a), var(--page-b));
        }

        .home-surface[data-design="ai"] {
          --accent: #0f172a;
          --accent-strong: #111827;
          --accent-soft: rgba(15, 23, 42, 0.26);
          --motion-rgb: 15, 23, 42;
        }

        .home-surface[data-design="assets"] {
          --accent: #262626;
          --accent-strong: #27272a;
          --accent-soft: rgba(39, 39, 42, 0.24);
          --motion-rgb: 39, 39, 42;
        }

        .home-surface[data-design="bio"] {
          --accent: #18181b;
          --accent-strong: #27272a;
          --accent-soft: rgba(24, 24, 27, 0.24);
          --motion-rgb: 24, 24, 27;
        }

        .dark .home-surface {
          --title: #f8fafc;
          --accent: #2dd4bf;
          --accent-strong: #5eead4;
          --accent-soft: rgba(45, 212, 191, 0.34);
          --ring: rgba(45, 212, 191, 0.14);
          --wash: rgba(45, 212, 191, 0.08);
          --page-a: #020617;
          --page-b: #07111f;
          --shell-bg: rgba(15, 23, 42, 0.84);
          --shell-border: rgba(94, 234, 212, 0.15);
          --shell-shadow: 0 24px 90px rgba(0, 0, 0, 0.3);
          --chip-bg: rgba(255, 255, 255, 0.05);
          --chip-border: rgba(148, 163, 184, 0.24);
          --input-bg: #020617;
          --input-focus: #0f172a;
          --placeholder: #94a3b8;
          background:
            radial-gradient(circle at 50% 18%, rgba(var(--motion-rgb), 0.14), transparent 32%),
            linear-gradient(135deg, var(--page-a), var(--page-b));
        }

        .surface-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 88% 18%, var(--wash), transparent 24%),
            radial-gradient(circle at 8% 42%, rgba(15, 23, 42, 0.035), transparent 26%);
        }

        .search-shell {
          border-color: var(--shell-border);
          background: var(--shell-bg);
          box-shadow: var(--shell-shadow);
        }

        .cache-chip {
          border-color: var(--chip-border);
          background: var(--chip-bg);
          color: var(--title);
        }

        .motion-fade,
        .motion-section {
          animation: fadeRise 0.72s ease both;
        }

        .motion-delay-1 { animation-delay: 0.05s; }
        .motion-delay-2 { animation-delay: 0.1s; }
        .motion-delay-3 { animation-delay: 0.15s; }
        .motion-delay-4 { animation-delay: 0.2s; }

        @keyframes fadeRise {
          from { opacity: 0; transform: translate3d(0, 14px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-fade,
          .motion-section {
            animation: none !important;
          }

          .search-shell *,
          .motion-section * {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
