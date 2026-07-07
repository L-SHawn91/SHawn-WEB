"use client";

import { Footer } from "@/components/ui/footer";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";

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

function MotionField() {
  return (
    <div className="motion-field" aria-hidden="true">
      <div className="motion-field__grid" />
      <svg className="motion-field__line" viewBox="0 0 420 260" fill="none">
        <path d="M30 182 C95 88 168 214 234 116 C285 40 340 86 394 36" />
      </svg>
      <span className="motion-node motion-node--a" />
      <span className="motion-node motion-node--b" />
      <span className="motion-node motion-node--c" />
      <span className="motion-orbit motion-orbit--one" />
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

          <MotionField />
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
          opacity: 0.34;
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
          background: linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.18));
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.08);
          overflow: hidden;
          backdrop-filter: blur(18px);
        }

        .dark .motion-field {
          background: linear-gradient(135deg, rgba(15,23,42,0.72), rgba(15,23,42,0.28));
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.3);
        }

        .motion-field__grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(15,23,42,0.12) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: linear-gradient(120deg, transparent 0%, black 32%, black 72%, transparent 100%);
        }

        .dark .motion-field__grid {
          background-image: radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px);
        }

        .motion-field__line {
          position: absolute;
          inset: 22px 10px;
          width: calc(100% - 20px);
          height: calc(100% - 44px);
        }

        .motion-field__line path {
          stroke: rgba(13, 148, 136, 0.48);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 10 22;
          animation: dashFlow 9s linear infinite;
        }

        .motion-node {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: #0f766e;
          box-shadow: 0 0 0 8px rgba(13, 148, 136, 0.1), 0 0 26px rgba(13, 148, 136, 0.26);
          animation: pulseNode 3.4s ease-in-out infinite;
        }

        .motion-node--a { left: 18%; top: 34%; }
        .motion-node--b { right: 20%; top: 22%; animation-delay: -0.7s; }
        .motion-node--c { left: 42%; bottom: 24%; animation-delay: -1.4s; }


        .motion-orbit {
          position: absolute;
          width: 72px;
          height: 72px;
          border-radius: 9999px;
          border: 1px solid rgba(13, 148, 136, 0.28);
          animation: orbitFloat 12s ease-in-out infinite;
        }

        .motion-orbit--one { left: 12%; bottom: 16%; }


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

        @keyframes dashFlow {
          to { stroke-dashoffset: -108; }
        }

        @keyframes pulseNode {
          0%, 100% { transform: scale(0.94); opacity: 0.72; }
          50% { transform: scale(1.08); opacity: 0.96; }
        }

        @keyframes orbitFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0.36; }
          50% { transform: translate3d(10px, -8px, 0) rotate(6deg); opacity: 0.68; }
        }

        @keyframes fadeRise {
          from { opacity: 0; transform: translate3d(0, 18px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        @media (max-width: 1023px) {
          .motion-field {
            min-height: 190px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-blob,
          .motion-field__line path,
          .motion-node,
          .motion-orbit,
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
