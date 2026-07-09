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

type SearchMode = "all" | "papers" | "datasets" | "public";

const copy = {
  ko: {
    eyebrow: "SHawn_LAB SEARCH",
    title: "SHawn Search",
    lead: "논문, 데이터셋, 공공데이터를 먼저 찾습니다. 블로그와 리포트는 메뉴로 낮추고, 필요한 근거와 공개 데이터를 바로 찾게 만듭니다.",
    searchLabel: "통합 검색어",
    searchPlaceholder: "예: endometrium atlas, single-cell fibrosis, climate CO2 emissions",
    searchButton: "검색",
    menuLabel: "메뉴",
    quickLabel: "빠른 검색",
    modes: [
      { key: "all", label: "통합", helper: "논문 중심으로 시작하고 관련 데이터셋으로 이어집니다." },
      { key: "papers", label: "논문", helper: "PubMed, Europe PMC, OpenAlex 등 공개 문헌 검색." },
      { key: "datasets", label: "데이터셋", helper: "GEO/SRA, Zenodo, Figshare 등 공개 데이터셋 검색." },
      { key: "public", label: "공공데이터", helper: "Data.gov, EU data, OpenML 등 공공·오픈 데이터 검색." },
    ],
    quickQueries: ["endometrium single-cell atlas", "Asherman dataset", "climate CO2 emissions", "public health census"],
    menuItems: [
      { title: "Blog", href: "/blog", desc: "공개 글" },
      { title: "Bio", href: "/bio", desc: "연구 근거" },
      { title: "Assets", href: "/invest", desc: "참고 리포트" },
    ],
    latestPrefix: "최근 공개 글",
  },
  en: {
    eyebrow: "SHawn_LAB SEARCH",
    title: "SHawn Search",
    lead: "Search papers, datasets, and public data first. Blog and reports stay in the menu while evidence and open data become the first path.",
    searchLabel: "Unified query",
    searchPlaceholder: "e.g. endometrium atlas, single-cell fibrosis, climate CO2 emissions",
    searchButton: "Search",
    menuLabel: "Menu",
    quickLabel: "Quick searches",
    modes: [
      { key: "all", label: "All", helper: "Start with papers and continue into related datasets." },
      { key: "papers", label: "Papers", helper: "Search public literature sources such as PubMed, Europe PMC, and OpenAlex." },
      { key: "datasets", label: "Datasets", helper: "Search public repositories such as GEO/SRA, Zenodo, and Figshare." },
      { key: "public", label: "Public data", helper: "Search government and open-data sources such as Data.gov, EU data, and OpenML." },
    ],
    quickQueries: ["endometrium single-cell atlas", "Asherman dataset", "climate CO2 emissions", "public health census"],
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

    const makeParticles = () => {
      const count = reducedMotion ? 12 : Math.max(22, Math.min(42, Math.floor(width / 12)));
      particles = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        vx: 0,
        vy: 0,
        phase: random() * Math.PI * 2,
        speed: 0.14 + random() * 0.26,
        size: 0.7 + random() * 1.2,
      }));
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(260, rect.width);
      height = Math.max(180, rect.height);
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
      context.globalAlpha = 0.18;
      context.fillStyle = "#0f766e";
      const step = 26;
      for (let x = 18; x < width; x += step) {
        for (let y = 18; y < height; y += step) {
          context.beginPath();
          context.arc(x, y, 0.8, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.restore();
    };

    const fieldAngle = (x: number, y: number, time: number) => {
      const nx = x / width - 0.5;
      const ny = y / height - 0.5;
      return (
        Math.sin(nx * 3.4 + time * 0.00028) +
        Math.cos(ny * 3.1 - time * 0.00022) +
        Math.sin((nx + ny) * 2.1)
      ) * 1.2;
    };

    const nodeAt = (baseX: number, baseY: number, radius: number, speed: number, time: number) => ({
      x: baseX * width + Math.cos(time * speed) * radius,
      y: baseY * height + Math.sin(time * speed * 0.78) * radius * 0.5,
    });

    const drawNodes = (time: number) => {
      const nodes = [
        nodeAt(0.2, 0.35, 8, 0.001, time),
        nodeAt(0.52, 0.68, 7, 0.0012, time + 900),
        nodeAt(0.8, 0.28, 9, 0.0008, time + 1600),
      ];

      context.save();
      context.lineWidth = 1.4;
      context.setLineDash([9, 22]);
      context.lineDashOffset = -time * 0.014;
      context.strokeStyle = "rgba(13, 148, 136, 0.38)";
      context.beginPath();
      context.moveTo(nodes[0].x, nodes[0].y);
      context.bezierCurveTo(width * 0.34, height * 0.42, width * 0.44, height * 0.72, nodes[1].x, nodes[1].y);
      context.bezierCurveTo(width * 0.56, height * 0.54, width * 0.64, height * 0.32, nodes[2].x, nodes[2].y);
      context.stroke();
      context.setLineDash([]);

      nodes.forEach((node, index) => {
        const pulse = 1 + Math.sin(time * 0.0017 + index) * 0.06;
        context.fillStyle = "rgba(13, 148, 136, 0.1)";
        context.beginPath();
        context.arc(node.x, node.y, 18 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(15, 118, 110, 0.78)";
        context.beginPath();
        context.arc(node.x, node.y, 6 * pulse, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();
    };

    const drawParticles = (time: number) => {
      if (reducedMotion) return;
      context.save();
      context.fillStyle = "rgba(20, 184, 166, 0.3)";
      for (const particle of particles) {
        const angle = fieldAngle(particle.x, particle.y, time + particle.phase * 1000);
        particle.vx = particle.vx * 0.9 + Math.cos(angle) * particle.speed;
        particle.vy = particle.vy * 0.9 + Math.sin(angle) * particle.speed;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = -8;

        context.globalAlpha = 0.14 + Math.sin(time * 0.0018 + particle.phase) * 0.07;
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
    <div className="motion-field" aria-hidden="true" data-motion="search-generative-canvas">
      <canvas ref={canvasRef} className="motion-field__canvas" />
      <div className="motion-field__glow" />
    </div>
  );
}

export function HomePageClient({ recentPosts }: HomePageClientProps) {
  const { language } = useLanguage();
  const t = copy[language];
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("all");
  const activeMode = t.modes.find((item) => item.key === mode) ?? t.modes[0];
  const latestPost = recentPosts[0];

  const runSearch = (nextQuery: string, nextMode: SearchMode = mode) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    const params = new URLSearchParams({ query: trimmed, q: trimmed, from: "home" });
    if (nextMode === "public") {
      params.set("context", "public data government open data");
      window.location.assign(`/datasets?${params.toString()}`);
      return;
    }
    if (nextMode === "datasets") {
      window.location.assign(`/datasets?${params.toString()}`);
      return;
    }
    window.location.assign(`/papers?${params.toString()}`);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(query);
  };

  const runQuickSearch = (item: string) => {
    setQuery(item);
    runSearch(item, mode);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ee] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="motion-backdrop" aria-hidden="true">
        <span className="motion-blob motion-blob--a" />
        <span className="motion-blob motion-blob--b" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-5 py-14 sm:px-8 sm:py-20">
        <section className="mx-auto flex min-h-[68vh] w-full max-w-4xl flex-col items-center justify-center text-center">
          <p className="motion-fade text-xs font-semibold uppercase tracking-[0.34em] text-teal-700 dark:text-teal-300">
            {t.eyebrow}
          </p>
          <h1 className="motion-fade motion-delay-1 mt-6 max-w-4xl text-4xl font-black tracking-[-0.055em] text-slate-950 dark:text-white sm:text-6xl">
            {t.title}
          </h1>

          <form
            onSubmit={onSubmit}
            className="search-shell motion-fade motion-delay-3 mt-9 w-full rounded-[2rem] border border-slate-200 bg-white/82 p-3 text-left shadow-[0_30px_110px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/78"
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
                  placeholder={t.searchPlaceholder}
                  className="h-15 w-full rounded-[1.35rem] border border-transparent bg-slate-50 py-4 pl-12 pr-4 text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-700"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="rounded-[1.35rem] bg-slate-950 px-7 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t.searchButton}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 px-1" aria-label="Search scope">
              {t.modes.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key)}
                  className={
                    item.key === mode
                      ? "rounded-full bg-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm dark:bg-teal-400 dark:text-slate-950"
                      : "rounded-full border border-slate-200 bg-white/60 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:text-slate-950 dark:border-slate-800 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-teal-700 dark:hover:text-white"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-3 px-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {activeMode.helper}
            </p>
          </form>

          <p className="motion-fade motion-delay-4 mt-5 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            {t.lead}
          </p>

          <div className="motion-fade motion-delay-4 mt-5 flex w-full flex-col items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-2 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{t.quickLabel}</span>
              {t.quickQueries.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => runQuickSearch(item)}
                  className="rounded-full border border-slate-200 bg-white/40 px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-slate-900 dark:border-slate-800 dark:bg-white/[0.04] dark:hover:border-teal-700 dark:hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="motion-panel mt-10 w-full max-w-3xl">
            <GenerativeMotionField />
          </div>
        </section>

        <section className="motion-section mt-10 border-t border-slate-200 pt-8 dark:border-slate-800" aria-label={t.menuLabel}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">{t.menuLabel}</p>
              {latestPost ? (
                <Link href={`/blog/${latestPost.slug}`} className="mt-2 inline-block text-sm font-semibold text-slate-600 transition hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300">
                  {t.latestPrefix}: {latestPost.title}
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {t.menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-white/45 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white dark:border-slate-800 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-teal-700"
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
        .motion-backdrop {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .motion-blob {
          position: absolute;
          display: block;
          border-radius: 9999px;
          filter: blur(28px);
          opacity: 0.28;
          transform: translate3d(0, 0, 0);
          animation: floatBlob 22s ease-in-out infinite alternate;
        }

        .motion-blob--a {
          top: 80px;
          right: 10%;
          width: 250px;
          height: 250px;
          background: rgba(20, 184, 166, 0.13);
        }

        .motion-blob--b {
          top: 420px;
          left: -90px;
          width: 230px;
          height: 230px;
          background: rgba(251, 146, 60, 0.1);
          animation-delay: -6s;
        }

        .motion-panel {
          opacity: 0.86;
        }

        .motion-field {
          position: relative;
          min-height: 150px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.52), rgba(255,255,255,0.18));
          box-shadow: 0 20px 70px rgba(15, 23, 42, 0.06);
          overflow: hidden;
          backdrop-filter: blur(18px);
        }

        .dark .motion-field {
          background: linear-gradient(135deg, rgba(15,23,42,0.62), rgba(15,23,42,0.22));
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.26);
        }

        .motion-field__canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
        }

        .motion-field__glow {
          position: absolute;
          inset: auto -20% -35% 10%;
          height: 46%;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.11), transparent 68%);
          pointer-events: none;
        }

        .motion-fade,
        .motion-section,
        .motion-panel {
          animation: fadeRise 0.85s ease both;
        }

        .motion-delay-1 { animation-delay: 0.08s; }
        .motion-delay-2 { animation-delay: 0.16s; }
        .motion-delay-3 { animation-delay: 0.24s; }
        .motion-delay-4 { animation-delay: 0.32s; }

        @keyframes floatBlob {
          from { transform: translate3d(-10px, 6px, 0) scale(0.98); }
          to { transform: translate3d(14px, -10px, 0) scale(1.03); }
        }

        @keyframes fadeRise {
          from { opacity: 0; transform: translate3d(0, 18px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        @media (max-width: 640px) {
          .motion-field {
            min-height: 130px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-blob,
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
