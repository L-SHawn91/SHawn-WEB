import Link from "next/link";
import { BookOpen, Database, ArrowRight, FlaskConical } from "lucide-react";

export default function SHawnbioHubPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">SHawnbio</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
            <FlaskConical className="h-8 w-8 text-emerald-600" />
            SHawnbio Hub
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            SHawn-WEB의 papers/datasets 기능을 SHawnbio 도메인으로 편입하기 위한 1차 허브입니다.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/bio/papers"
            className="group rounded-2xl border border-blue-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-sm dark:border-blue-900/60 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <BookOpen className="h-5 w-5 text-blue-600" /> Bio Papers
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">/bio/papers (현재 /papers로 연결)</p>
          </Link>

          <Link
            href="/bio/datasets"
            className="group rounded-2xl border border-indigo-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-sm dark:border-indigo-900/60 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <Database className="h-5 w-5 text-indigo-600" /> Bio Datasets
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">/bio/datasets (현재 /datasets로 연결)</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
