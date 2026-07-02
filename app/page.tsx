// i18n-exempt: public landing copy is fixed marketing/search entry copy for now.
import { Footer } from "@/components/ui/footer";
import { getAllPosts } from "@/lib/mdx";
import Link from "next/link";

const quickLinks = [
  {
    href: "/blog",
    title: "Blog",
    desc: "AI, bio, automation, and field-note articles from SHawn_LAB.",
    eyebrow: "Read",
    accentColor: "#E76F51",
  },
  {
    href: "/papers",
    title: "Papers Search",
    desc: "Integrated search across PubMed, arXiv, Semantic Scholar, and more.",
    eyebrow: "Research",
    accentColor: "#2A9D8F",
  },
  {
    href: "/datasets",
    title: "Datasets Search",
    desc: "Multi-source dataset discovery across NCBI, ENA, Europe PMC, and public omics indexes.",
    eyebrow: "Data",
    accentColor: "#7B6BA8",
  },
];

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EA] dark:bg-slate-900 text-[#263238] dark:text-slate-200 overflow-x-hidden">
      <main className="flex-1">
        <section className="relative paper-ruled">
          {/* SABS flow lines — teal / navy / coral */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="h-full w-full" viewBox="0 0 1200 800" aria-hidden>
              <defs>
                <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2A9D8F" stopOpacity="0.4" />
                  <stop offset="55%" stopColor="#10243A" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#E76F51" stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <path d="M 80,160 Q 340,90 620,150 T 1160,180" stroke="url(#flowGradient)" strokeWidth="1.5" fill="none" />
              <path d="M 120,340 Q 380,280 700,340 T 1180,380" stroke="url(#flowGradient)" strokeWidth="1.5" fill="none" />
              <path d="M 180,520 Q 480,450 760,520 T 1180,560" stroke="url(#flowGradient)" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pt-20">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#2A9D8F]">SHawn_LAB</p>
              <h1 className="mt-3 bg-gradient-to-r from-[#2A9D8F] via-[#10243A] to-[#E76F51] bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
                Research, Blog & Bio Search Hub
              </h1>
              <p className="mt-4 text-lg text-[#263238] dark:text-slate-200 sm:text-2xl">
                메인 화면에서 블로그, 논문 검색, 데이터셋 검색까지 바로 연결합니다.
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-sm text-[#263238]/70 dark:text-slate-400 sm:text-base">
                SHawn-WEB is the public-facing entry point for practical AI notes, bio-research search, dataset discovery, and selective operating updates.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/blog"
                className="sketch-btn inline-flex items-center border border-[#E76F51] bg-[#E76F51] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d96045]"
              >
                Open Blog
              </Link>
              <Link
                href="/papers"
                className="sketch-btn inline-flex items-center border border-[#2A9D8F] bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#238a7e]"
              >
                Search Papers
              </Link>
              <Link
                href="/datasets"
                className="sketch-btn inline-flex items-center border border-[#10243A]/40 bg-white px-5 py-3 text-sm font-medium text-[#10243A] transition hover:bg-[#10243A]/5 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/30"
              >
                Search Datasets
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  <article
                    className="sketch-card group h-full border-2 border-[#D8DEE6] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/50 dark:border-slate-700 dark:bg-slate-900"
                    style={{ borderLeftWidth: "4px", borderLeftColor: item.accentColor }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#263238]/50 dark:text-slate-500">{item.eyebrow}</p>
                    <h2 className="mt-3 text-lg font-semibold text-[#10243A] dark:text-slate-100">{item.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#263238]/70 dark:text-slate-400">{item.desc}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2A9D8F]">Latest notes</p>
              <h2 className="mt-2 text-2xl font-bold text-[#10243A] dark:text-slate-100">최근 블로그 글</h2>
              <p className="mt-2 text-sm text-[#263238]/70 dark:text-slate-400">메인에서 최신 글을 확인하고 전체 블로그로 이동할 수 있습니다.</p>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-[#E76F51] hover:underline">
              전체 블로그 보기 →
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {recentPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <article className="h-full rounded-2xl border border-[#D8DEE6] bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80">
                    <p className="text-xs font-medium text-[#2A9D8F]">{post.category} · {post.date}</p>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[#10243A] dark:text-slate-100">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#263238]/70 dark:text-slate-400">{post.description}</p>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D8DEE6] p-8 text-center text-sm text-[#263238]/70 dark:border-slate-700 dark:text-slate-400">
              아직 공개된 블로그 글이 없습니다.
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
