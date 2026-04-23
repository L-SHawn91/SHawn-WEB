"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Database, FlaskConical, Microscope } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { translations } from "@/lib/translations";
import type { Post } from "@/lib/mdx";

type BioHubClientProps = {
  recentPosts: Pick<Post, "slug" | "title" | "date" | "readingTime" | "description">[];
};

export function BioHubClient({ recentPosts }: BioHubClientProps) {
  const { language } = useLanguage();
  const t = translations[language].bio_hub;

  return (
    <div className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
            <FlaskConical className="h-8 w-8 text-emerald-600" />
            {t.title}
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t.subtitle}</p>
        </header>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.search_section}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/bio/papers"
              className="group rounded-2xl border border-blue-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-sm dark:border-blue-900/60 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <BookOpen className="h-5 w-5 text-blue-600" /> {t.papers_title}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.papers_desc}</p>
            </Link>

            <Link
              href="/bio/datasets"
              className="group rounded-2xl border border-indigo-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-sm dark:border-indigo-900/60 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <Database className="h-5 w-5 text-indigo-600" /> {t.datasets_title}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.datasets_desc}</p>
            </Link>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.recent_section}
            </h2>
            <Link
              href="/blog"
              className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-300"
            >
              {t.recent_view_all} →
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {t.recent_empty}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recentPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{post.date}</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-300">
                    {post.title}
                  </h3>
                  {post.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                      {post.description}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.world_section}
          </h2>
          <Link
            href="/cartridges/bio"
            className="group flex items-center justify-between rounded-2xl border border-emerald-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-sm dark:border-emerald-900/60 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <Microscope className="h-6 w-6 text-emerald-600" />
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-white">
                  {t.world_title}
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.world_desc}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-300">
              {t.world_cta}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
