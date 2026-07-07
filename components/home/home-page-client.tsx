"use client";

import { Footer } from "@/components/ui/footer";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";
import { useEffect, useRef } from "react";

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

const copy = {
  ko: {
    eyebrow: "SHawn_LAB",
    title: "읽고, 찾고, 참고합니다.",
    lead: "공개 글, 바이오 연구 근거, 참고 리포트로 바로 들어가는 단순한 입구입니다.",
    primary: "Blog 읽기",
    secondary: "Bio 보기",
    tertiary: "Assets 보기",
    sections: [
      {
        title: "Blog",
        href: "/blog",
        desc: "공개 글과 짧은 해설을 모읍니다.",
      },
      {
        title: "Bio",
        href: "/bio",
        desc: "논문과 데이터셋을 찾아봅니다.",
      },
      {
        title: "Assets",
        href: "/invest",
        desc: "리포트와 신호를 참고 전용으로 읽습니다.",
      },
    ],
    latestTitle: "최근 글",
    latestEmpty: "아직 공개 글이 없습니다.",
    viewAll: "전체 보기",
  },
  en: {
    eyebrow: "SHawn_LAB",
    title: "Read, search, and reference.",
    lead: "A simple entry to public articles, bio evidence, and reference reports.",
    primary: "Read Blog",
    secondary: "View Bio",
    tertiary: "View Assets",
    sections: [
      {
        title: "Blog",
        href: "/blog",
        desc: "Public articles and short explanations.",
      },
      {
        title: "Bio",
        href: "/bio",
        desc: "Papers and datasets in one research entry.",
      },
      {
        title: "Assets",
        href: "/invest",
        desc: "Reference reports and signals only.",
      },
    ],
    latestTitle: "Recent posts",
    latestEmpty: "No public posts yet.",
    viewAll: "View all",
  },
} as const;

function formatDate(date: string) {
  if (!date) return "";
  return date.slice(0, 10);
}

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
    const random = createSeededRandom(260708);

    const makeParticles = () => {
      const count = reducedMotion ? 18 : Math.max(26, Math.min(48, Math.floor(width / 9)));
      particles = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        vx: 0,
        vy: 0,
        phase: random() * Math.PI * 2,
        speed: 0.18 + random() * 0.32,
        size: 0.75 + random() * 1.4,
      }));
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(260, rect.width);
      height = Math.max(190, rect.height);
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
      context.globalAlpha = 0.24;
      context.fillStyle = "#0f766e";
      const step = 24;
      for (let x = 18; x < width; x += step) {
        for (let y = 18; y < height; y += step) {
          context.beginPath();
          context.arc(x, y, 0.9, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.restore();
    };

    const fieldAngle = (x: number, y: number, time: number) => {
      const nx = x / width - 0.5;
      const ny = y / height - 0.5;
      return (
        Math.sin(nx * 4.2 + time * 0.00035) +
        Math.cos(ny * 3.4 - time * 0.00028) +
        Math.sin((nx + ny) * 2.6)
      ) * 1.35;
    };

    const nodeAt = (baseX: number, baseY: number, radius: number, speed: number, time: number) => ({
      x: baseX * width + Math.cos(time * speed) * radius,
      y: baseY * height + Math.sin(time * speed * 0.78) * radius * 0.55,
    });

    const drawNodes = (time: number) => {
      const nodes = [
        nodeAt(0.2, 0.36, 10, 0.0011, time),
        nodeAt(0.44, 0.72, 8, 0.0014, time + 900),
        nodeAt(0.78, 0.26, 12, 0.0009, time + 1600),
      ];

      context.save();
      context.lineWidth = 1.8;
      context.setLineDash([10, 20]);
      context.lineDashOffset = -time * 0.018;
      context.strokeStyle = "rgba(13, 148, 136, 0.54)";
      context.beginPath();
      context.moveTo(nodes[0].x, nodes[0].y);
      context.bezierCurveTo(width * 0.35, height * 0.44, width * 0.45, height * 0.74, nodes[1].x, nodes[1].y);
      context.bezierCurveTo(width * 0.56, height * 0.54, width * 0.62, height * 0.31, nodes[2].x, nodes[2].y);
      context.stroke();
      context.setLineDash([]);

      nodes.forEach((node, index) => {
        const pulse = 1 + Math.sin(time * 0.002 + index) * 0.08;
        context.fillStyle = "rgba(13, 148, 136, 0.12)";
        context.beginPath();
        context.arc(node.x, node.y, 19 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(15, 118, 110, 0.92)";
        context.beginPath();
        context.arc(node.x, node.y, 7 * pulse, 0, Math.PI * 2);
        context.fill();
      });

      context.strokeStyle = "rgba(13, 148, 136, 0.16)";
      context.lineWidth = 1.2;
      context.beginPath();
      context.ellipse(width * 0.22, height * 0.64, 42, 34, -0.45, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    };

    const drawParticles = (time: number) => {
      if (reducedMotion) return;
      context.save();
      context.fillStyle = "rgba(20, 184, 166, 0.38)";
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

        context.globalAlpha = 0.18 + Math.sin(time * 0.002 + particle.phase) * 0.08;
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
    <div className="motion-field" aria-hidden="true" data-motion="generative-seeded-canvas">
      <canvas ref={canvasRef} className="motion-field__canvas" />
      <div className="motion-field__glow" />
    </div>
  );
}

export function HomePageClient({ recentPosts }: HomePageClientProps) {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ee] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="motion-backdrop" aria-hidden="true">
        <span className="motion-blob motion-blob--a" />
        <span className="motion-blob motion-blob--b" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="max-w-3xl">
            <p className="motion-fade text-xs font-semibold uppercase tracking-[0.32em] text-teal-700 dark:text-teal-300">
              {t.eyebrow}
            </p>
            <h1 className="motion-fade motion-delay-1 mt-6 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white sm:text-6xl">
              {t.title}
            </h1>
            <p className="motion-fade motion-delay-2 mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              {t.lead}
            </p>
            <div className="motion-fade motion-delay-3 mt-8 flex flex-wrap gap-3 text-sm font-semibold">
              <Link
                href="/blog"
                className="motion-button rounded-full bg-slate-950 px-5 py-3 text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t.primary}
              </Link>
              <Link
                href="/bio"
                className="motion-button rounded-full border border-slate-300 bg-white/35 px-5 py-3 text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-500 dark:border-slate-700 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:border-slate-400"
              >
                {t.secondary}
              </Link>
              <Link
                href="/invest"
                className="motion-button rounded-full border border-slate-300 bg-white/35 px-5 py-3 text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-500 dark:border-slate-700 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:border-slate-400"
              >
                {t.tertiary}
              </Link>
            </div>
          </div>

          <GenerativeMotionField />
        </section>

        <section className="mt-20 grid gap-3 sm:grid-cols-3" aria-label="Main sections">
          {t.sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="motion-card group rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] backdrop-blur transition hover:-translate-y-1 hover:border-teal-200 hover:bg-white dark:border-slate-800 dark:bg-white/[0.04] dark:hover:border-teal-700/60"
            >
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {section.desc}
              </p>
            </Link>
          ))}
        </section>

        <section className="motion-section mt-20 border-t border-slate-200 pt-10 dark:border-slate-800">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950 dark:text-white">
              {t.latestTitle}
            </h2>
            <Link href="/blog" className="text-sm font-semibold text-teal-700 transition hover:translate-x-1 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100">
              {t.viewAll} →
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
              {recentPosts.slice(0, 3).map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="motion-list-item block py-5 transition hover:translate-x-1"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                    <h3 className="text-lg font-bold leading-7 text-slate-950 dark:text-white">
                      {post.title}
                    </h3>
                    <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(post.date)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.latestEmpty}</p>
          )}
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
          opacity: 0.32;
          transform: translate3d(0, 0, 0);
          animation: floatBlob 20s ease-in-out infinite alternate;
        }

        .motion-blob--a {
          top: 110px;
          right: 8%;
          width: 240px;
          height: 240px;
          background: rgba(20, 184, 166, 0.14);
        }

        .motion-blob--b {
          top: 360px;
          left: -90px;
          width: 240px;
          height: 240px;
          background: rgba(251, 146, 60, 0.12);
          animation-delay: -6s;
        }

        .motion-field {
          position: relative;
          min-height: 280px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 32px;
          background: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.22));
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.08);
          overflow: hidden;
          backdrop-filter: blur(18px);
        }

        .dark .motion-field {
          background: linear-gradient(135deg, rgba(15,23,42,0.72), rgba(15,23,42,0.28));
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.3);
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
          background: radial-gradient(circle, rgba(20, 184, 166, 0.13), transparent 68%);
          pointer-events: none;
        }

        .motion-fade,
        .motion-card,
        .motion-section,
        .motion-list-item {
          animation: fadeRise 0.85s ease both;
        }

        .motion-delay-1 { animation-delay: 0.08s; }
        .motion-delay-2 { animation-delay: 0.16s; }
        .motion-delay-3 { animation-delay: 0.24s; }

        .motion-card:nth-child(2) { animation-delay: 0.1s; }
        .motion-card:nth-child(3) { animation-delay: 0.2s; }
        .motion-list-item:nth-child(2) { animation-delay: 0.08s; }
        .motion-list-item:nth-child(3) { animation-delay: 0.16s; }

        .motion-button {
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08);
        }

        @keyframes floatBlob {
          from { transform: translate3d(-10px, 6px, 0) scale(0.98); }
          to { transform: translate3d(14px, -10px, 0) scale(1.03); }
        }

        @keyframes fadeRise {
          from { opacity: 0; transform: translate3d(0, 18px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        @media (max-width: 1023px) {
          .motion-field {
            min-height: 220px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-blob,
          .motion-fade,
          .motion-card,
          .motion-section,
          .motion-list-item {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
