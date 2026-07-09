"use client";

import { Footer } from "@/components/ui/footer";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

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

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  size: number;
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
    eyebrow: "SHawn_LAB",
    title: "Search",
    lead: "선택한 검색만 빠르게 찾습니다.",
    searchLabel: "검색어",
    searchButton: "검색",
    menuLabel: "메뉴",
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
    latestPrefix: "최근 공개 글",
  },
  en: {
    eyebrow: "SHawn_LAB",
    title: "Search",
    lead: "Search only the selected lane, fast.",
    searchLabel: "Search query",
    searchButton: "Search",
    menuLabel: "Menu",
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
    latestPrefix: "Latest public note",
  },
} as const;

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

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

function GenerativeMotionField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = createSeededRandom(260709);
    const paletteRgb = () => {
      const owner = host.closest(".home-surface") as HTMLElement | null;
      return getComputedStyle(owner ?? host).getPropertyValue("--motion-rgb").trim() || "13, 148, 136";
    };

    const makeParticles = () => {
      const count = reducedMotion ? 6 : Math.max(12, Math.min(24, Math.floor(width / 28)));
      particles = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        vx: 0,
        vy: 0,
        phase: random() * Math.PI * 2,
        speed: 0.08 + random() * 0.16,
        size: 0.7 + random() * 1,
      }));
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(260, rect.width);
      height = Math.max(72, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeParticles();
    };

    const drawGrid = () => {
      context.save();
      context.globalAlpha = 0.12;
      context.fillStyle = `rgba(${paletteRgb()}, 0.72)`;
      const step = 34;
      for (let x = 18; x < width; x += step) {
        for (let y = 18; y < height; y += step) {
          context.beginPath();
          context.arc(x, y, 0.75, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.restore();
    };

    const fieldAngle = (x: number, y: number, time: number) => {
      const nx = x / width - 0.5;
      const ny = y / height - 0.5;
      return (Math.sin(nx * 3 + time * 0.00018) + Math.cos(ny * 2.4 - time * 0.00016)) * 1.1;
    };

    const drawNodes = (time: number) => {
      const nodes = [
        { x: width * 0.18 + Math.cos(time * 0.0008) * 5, y: height * 0.54 },
        { x: width * 0.5, y: height * 0.5 + Math.sin(time * 0.0009) * 5 },
        { x: width * 0.82 + Math.cos(time * 0.0007) * 5, y: height * 0.46 },
      ];

      context.save();
      context.lineWidth = 1.2;
      context.setLineDash([8, 18]);
      context.lineDashOffset = -time * 0.01;
      context.strokeStyle = `rgba(${paletteRgb()}, 0.34)`;
      context.beginPath();
      context.moveTo(nodes[0].x, nodes[0].y);
      context.bezierCurveTo(width * 0.32, height * 0.35, width * 0.39, height * 0.7, nodes[1].x, nodes[1].y);
      context.bezierCurveTo(width * 0.62, height * 0.34, width * 0.72, height * 0.58, nodes[2].x, nodes[2].y);
      context.stroke();
      context.setLineDash([]);

      nodes.forEach((node, index) => {
        const pulse = 1 + Math.sin(time * 0.0014 + index) * 0.04;
        context.fillStyle = `rgba(${paletteRgb()}, 0.1)`;
        context.beginPath();
        context.arc(node.x, node.y, 14 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(${paletteRgb()}, 0.74)`;
        context.beginPath();
        context.arc(node.x, node.y, 4.2 * pulse, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();
    };

    const drawParticles = (time: number) => {
      if (reducedMotion) return;
      context.save();
      context.fillStyle = `rgba(${paletteRgb()}, 0.24)`;
      for (const particle of particles) {
        const angle = fieldAngle(particle.x, particle.y, time + particle.phase * 1000);
        particle.vx = particle.vx * 0.92 + Math.cos(angle) * particle.speed;
        particle.vy = particle.vy * 0.92 + Math.sin(angle) * particle.speed;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = -8;

        context.globalAlpha = 0.1 + Math.sin(time * 0.0015 + particle.phase) * 0.05;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    const render = (time: number) => {
      context.clearRect(0, 0, width, height);
      drawGrid();
      drawParticles(time);
      drawNodes(time);
      if (!reducedMotion) frameId = requestAnimationFrame(render);
    };

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      reducedMotion = media.matches;
      makeParticles();
      cancelAnimationFrame(frameId);
      render(performance.now());
      if (!reducedMotion) frameId = requestAnimationFrame(render);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    media.addEventListener("change", onMotionChange);
    render(performance.now());
    if (!reducedMotion) frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div className="kmap-strip" aria-hidden="true" data-motion="search-generative-canvas">
      <canvas ref={canvasRef} className="kmap-strip__canvas" />
      <div className="kmap-strip__glow" />
    </div>
  );
}

export function HomePageClient({ recentPosts }: HomePageClientProps) {
  const { language } = useLanguage();
  const t = copy[language];
  const [query, setQuery] = useState("");
  const [design, setDesign] = useState<DesignMode>("ai");
  const activeDesign = t.designs.find((item) => item.key === design) ?? t.designs[0];
  const [cachedQueries, setCachedQueries] = useState<string[]>(activeDesign.quick.slice(0, CACHE_LIMIT));
  const latestPost = recentPosts[0];

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
        <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col items-center justify-center text-center">
          <p className="motion-fade text-xs font-semibold uppercase tracking-[0.34em] text-[color:var(--accent-strong)]">
            {t.eyebrow}
          </p>
          <h1 className="motion-fade motion-delay-1 mt-4 text-5xl font-black tracking-[-0.07em] text-[color:var(--title)] dark:text-white sm:text-7xl">
            {t.title}
          </h1>
          <p className="motion-fade motion-delay-2 mt-3 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-base">
            {t.lead}
          </p>

          <div className="motion-fade motion-delay-2 mt-7 flex flex-wrap items-center justify-center gap-2" aria-label={t.designLabel}>
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
                  className="h-16 w-full rounded-[1.45rem] border border-transparent bg-[color:var(--input-bg)] py-4 pl-12 pr-4 text-base font-semibold text-[color:var(--title)] outline-none transition placeholder:text-[color:var(--placeholder)] focus:border-[color:var(--accent-soft)] focus:bg-[color:var(--input-focus)] focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
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

          <div className="motion-fade motion-delay-4 mt-5 flex w-full flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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

          <div className="motion-panel mt-8 w-full max-w-2xl">
            <GenerativeMotionField />
          </div>
        </section>

        <section className="motion-section mt-10 border-t border-slate-200 pt-7 dark:border-slate-800" aria-label={t.menuLabel}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">{t.menuLabel}</p>
              {latestPost ? (
                <Link href={`/blog/${latestPost.slug}`} className="mt-2 inline-block text-sm font-semibold text-slate-600 transition hover:text-[color:var(--accent-strong)] dark:text-slate-300">
                  {t.latestPrefix}: {latestPost.title}
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {t.menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="menu-pill rounded-full border border-slate-200 bg-white/45 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-[color:var(--accent-soft)] hover:bg-white dark:border-slate-800 dark:bg-white/[0.04] dark:text-slate-200"
                >
                  {item.title} <span className="font-normal text-slate-400">· {item.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

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
          --strip-bg: linear-gradient(135deg, rgba(255,255,255,0.72), rgba(15,23,42,0.035));
          --strip-border: rgba(15, 23, 42, 0.12);
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
          --page-a: #020617;
          --page-b: #07111f;
          --shell-bg: rgba(15, 23, 42, 0.84);
          --input-bg: #020617;
          --input-focus: #0f172a;
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

        .cache-chip,
        .menu-pill {
          border-color: var(--chip-border);
          background: var(--chip-bg);
          color: var(--title);
        }

        .kmap-strip {
          position: relative;
          min-height: 92px;
          border: 1px solid var(--strip-border);
          border-radius: 9999px;
          background: var(--strip-bg);
          box-shadow: 0 16px 54px rgba(var(--motion-rgb), 0.08);
          overflow: hidden;
          backdrop-filter: blur(18px);
          opacity: 0.86;
        }

        .dark .kmap-strip {
          background: linear-gradient(135deg, rgba(15,23,42,0.58), rgba(15,23,42,0.2));
          box-shadow: 0 20px 68px rgba(0, 0, 0, 0.22);
        }

        .kmap-strip__canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
        }

        .kmap-strip__glow {
          position: absolute;
          inset: auto 16% -48% 16%;
          height: 74%;
          background: radial-gradient(circle, var(--ring), transparent 68%);
          pointer-events: none;
        }

        .motion-fade,
        .motion-section,
        .motion-panel {
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

        @media (max-width: 640px) {
          .kmap-strip {
            min-height: 78px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-fade,
          .motion-section,
          .motion-panel {
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
