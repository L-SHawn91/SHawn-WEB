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

export function HomePageClient({ recentPosts }: HomePageClientProps) {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="min-h-screen bg-[#fbf7ee] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-700 dark:text-teal-300">
            {t.eyebrow}
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white sm:text-6xl">
            {t.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            {t.lead}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            <Link
              href="/blog"
              className="rounded-full bg-slate-950 px-5 py-3 text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {t.primary}
            </Link>
            <Link
              href="/bio"
              className="rounded-full border border-slate-300 px-5 py-3 text-slate-800 transition hover:border-slate-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-400"
            >
              {t.secondary}
            </Link>
            <Link
              href="/invest"
              className="rounded-full border border-slate-300 px-5 py-3 text-slate-800 transition hover:border-slate-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-400"
            >
              {t.tertiary}
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-3 sm:grid-cols-3" aria-label="Main sections">
          {t.sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-3xl border border-slate-200 bg-white/55 p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-white/[0.04] dark:hover:border-slate-700"
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

        <section className="mt-20 border-t border-slate-200 pt-10 dark:border-slate-800">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950 dark:text-white">
              {t.latestTitle}
            </h2>
            <Link href="/blog" className="text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100">
              {t.viewAll} →
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
              {recentPosts.slice(0, 3).map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block py-5 transition hover:translate-x-1"
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
    </div>
  );
}
