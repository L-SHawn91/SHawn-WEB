"use client";

import { Footer } from "@/components/ui/footer";
import { useLanguage } from "@/components/providers/language-provider";
import Image from "next/image";
import Link from "next/link";

export type HomePost = {
  slug: string;
  title: string;
  date: string;
  description: string;
  category: string;
  image?: string;
};

type QuickLink = {
  href: string;
  title: string;
  desc: string;
  eyebrow: string;
  status: string;
  accentColor: string;
};

type PublicSection = {
  label: string;
  title: string;
  body: string;
  status: string;
  tone: string;
};

type RouteHighlight = {
  id: string;
  href: string;
  label: string;
  text: string;
};

const accents = {
  blog: "#E76F51",
  papers: "#2A9D8F",
  datasets: "#7B6BA8",
  assets: "#C47F2E",
};

const homeCopy: Record<
  "ko" | "en",
  {
    hero: {
      eyebrow: string;
      title: string;
      lead: string;
      sublead: string;
      blogCta: string;
      papersCta: string;
      datasetsCta: string;
    };
    quickLinks: QuickLink[];
    publicIntro: { eyebrow: string; title: string; desc: string };
    publicSections: PublicSection[];
    routes: { eyebrow: string; title: string; desc: string; viewBlog: string; items: RouteHighlight[] };
    latest: { eyebrow: string; title: string; desc: string; viewAll: string; empty: string; imageAltSuffix: string };
  }
> = {
  ko: {
    hero: {
      eyebrow: "SHawn_LAB · 공개 웹 게이트웨이",
      title: "연구, 블로그, 데이터 검색 허브",
      lead: "숀웹은 공개 블로그, 논문 검색, 데이터셋 검색, 자산/운영 노트를 연결하는 SHawn_LAB의 공개 진입점입니다.",
      sublead: "읽기 쉬운 글, 연구 근거 탐색, 데이터셋 스카우팅, 선별 운영 업데이트를 한 화면에서 연결합니다.",
      blogCta: "블로그 열기",
      papersCta: "논문 검색",
      datasetsCta: "데이터셋 검색",
    },
    quickLinks: [
      {
        href: "/blog",
        title: "블로그",
        desc: "AI 도구, 자동화, 현장 기록, 읽기 쉬운 해설형 콘텐츠를 모아둔 공개 노트입니다.",
        eyebrow: "공개 노트",
        status: "공개 콘텐츠",
        accentColor: accents.blog,
      },
      {
        href: "/papers",
        title: "논문 검색",
        desc: "PubMed, arXiv, Semantic Scholar와 인용 기반 탐색 흐름을 연결하는 연구 검색 허브입니다.",
        eyebrow: "연구",
        status: "검색 허브",
        accentColor: accents.papers,
      },
      {
        href: "/datasets",
        title: "데이터셋 검색",
        desc: "NCBI, ENA, Europe PMC와 공개 omics 인덱스에서 데이터셋 후보를 찾습니다.",
        eyebrow: "데이터",
        status: "데이터 허브",
        accentColor: accents.datasets,
      },
      {
        href: "/invest",
        title: "자산 / 투자",
        desc: "교육·모니터링 목적의 시장 온도와 리포트 아카이브입니다. 투자 조언이 아닙니다.",
        eyebrow: "자산",
        status: "참고 전용",
        accentColor: accents.assets,
      },
    ],
    publicIntro: {
      eyebrow: "공개 섹션",
      title: "숀웹에서 바로 갈 수 있는 곳",
      desc: "외부 독자에게 필요한 공개 화면만 전면에 두고, 내부 운영명과 작업 레이어는 웹 문구에서 숨깁니다.",
    },
    publicSections: [
      {
        label: "Research",
        title: "논문과 근거 탐색",
        body: "논문 검색, 근거 탐색, 연구 아이디어 스카우팅을 위한 공개 진입점입니다.",
        status: "Papers",
        tone: "border-[#2A9D8F]/30 bg-[#2A9D8F]/8 dark:border-emerald-400/30 dark:bg-emerald-950/20",
      },
      {
        label: "Data",
        title: "공개 데이터셋 탐색",
        body: "공개 데이터셋과 omics accession 후보를 찾고 다음 분석 단계로 연결합니다.",
        status: "Datasets",
        tone: "border-[#7B6BA8]/30 bg-[#7B6BA8]/8 dark:border-violet-400/30 dark:bg-violet-950/20",
      },
      {
        label: "Blog",
        title: "공개 노트와 해설 글",
        body: "AI 도구, 자동화, 연구 운영, 일상 기록을 외부 독자가 읽기 쉬운 글로 정리합니다.",
        status: "Articles",
        tone: "border-[#E76F51]/30 bg-[#E76F51]/8 dark:border-orange-400/30 dark:bg-orange-950/20",
      },
    ],
    routes: {
      eyebrow: "게이트웨이 라우트",
      title: "공개용 라우트만 명확하게 보여줍니다",
      desc: "방문자는 블로그, 논문 검색, 데이터셋 검색, 자산/운영 아카이브로 바로 이동할 수 있습니다.",
      viewBlog: "전체 블로그 보기",
      items: [
        { id: "blog", href: "/blog", label: "블로그", text: "공개 글과 설명형 콘텐츠" },
        { id: "papers", href: "/papers", label: "논문", text: "논문 검색과 연구 근거 탐색" },
        { id: "datasets", href: "/datasets", label: "데이터셋", text: "공개 데이터셋 검색" },
        { id: "invest", href: "/invest", label: "자산", text: "시장 온도와 리포트 아카이브" },
      ],
    },
    latest: {
      eyebrow: "최신 노트",
      title: "최근 블로그 글",
      desc: "메인에서 최신 공개 글을 확인하고 전체 블로그로 이동할 수 있습니다.",
      viewAll: "전체 블로그 보기",
      empty: "아직 공개된 블로그 글이 없습니다.",
      imageAltSuffix: "대표 이미지",
    },
  },
  en: {
    hero: {
      eyebrow: "SHawn_LAB · public web gateway",
      title: "Research, Blog & Data Search Hub",
      lead: "SHawn-WEB is the public entry point connecting articles, paper search, dataset discovery, and selected operating notes from SHawn_LAB.",
      sublead: "A lightweight public surface for readable articles, research discovery, dataset scouting, and selected operating updates.",
      blogCta: "Open Blog",
      papersCta: "Search Papers",
      datasetsCta: "Search Datasets",
    },
    quickLinks: [
      {
        href: "/blog",
        title: "Blog",
        desc: "Public notes on AI tools, automation, field logs, and readable commentary from SHawn_LAB.",
        eyebrow: "Public notes",
        status: "Open content",
        accentColor: accents.blog,
      },
      {
        href: "/papers",
        title: "Papers Search",
        desc: "Research discovery across PubMed, arXiv, Semantic Scholar, and citation-aware search workflows.",
        eyebrow: "Research",
        status: "Search hub",
        accentColor: accents.papers,
      },
      {
        href: "/datasets",
        title: "Datasets Search",
        desc: "Public dataset discovery across NCBI, ENA, Europe PMC, and public omics indexes.",
        eyebrow: "Data",
        status: "Dataset hub",
        accentColor: accents.datasets,
      },
      {
        href: "/invest",
        title: "Assets / Invest",
        desc: "Market-temperature and report archive surface for education and monitoring, not financial advice.",
        eyebrow: "Assets",
        status: "Reference only",
        accentColor: accents.assets,
      },
    ],
    publicIntro: {
      eyebrow: "Public sections",
      title: "Where to go from SHawn-WEB",
      desc: "The public site keeps reader-facing surfaces upfront while hiding internal operation labels and workflow layers.",
    },
    publicSections: [
      {
        label: "Research",
        title: "Paper and evidence discovery",
        body: "A public entry point for paper search, evidence discovery, and research idea scouting.",
        status: "Papers",
        tone: "border-[#2A9D8F]/30 bg-[#2A9D8F]/8 dark:border-emerald-400/30 dark:bg-emerald-950/20",
      },
      {
        label: "Data",
        title: "Public dataset discovery",
        body: "Find public datasets and omics accession candidates, then connect them to the next analysis step.",
        status: "Datasets",
        tone: "border-[#7B6BA8]/30 bg-[#7B6BA8]/8 dark:border-violet-400/30 dark:bg-violet-950/20",
      },
      {
        label: "Blog",
        title: "Public notes and explainers",
        body: "Readable articles on AI tools, automation, research operations, and everyday field notes.",
        status: "Articles",
        tone: "border-[#E76F51]/30 bg-[#E76F51]/8 dark:border-orange-400/30 dark:bg-orange-950/20",
      },
    ],
    routes: {
      eyebrow: "Gateway routes",
      title: "Clear public routes only",
      desc: "Visitors can move directly to the blog, paper search, dataset search, and assets/operations archive.",
      viewBlog: "View all posts",
      items: [
        { id: "blog", href: "/blog", label: "Blog", text: "Public articles and explainers" },
        { id: "papers", href: "/papers", label: "Papers", text: "Paper search and evidence discovery" },
        { id: "datasets", href: "/datasets", label: "Datasets", text: "Public dataset search" },
        { id: "invest", href: "/invest", label: "Assets", text: "Market temperature and report archive" },
      ],
    },
    latest: {
      eyebrow: "Latest notes",
      title: "Recent Posts",
      desc: "Check the latest public articles from the homepage and continue to the full blog.",
      viewAll: "View all posts",
      empty: "No public blog posts yet.",
      imageAltSuffix: "featured image",
    },
  },
};

export function HomePageClient({ recentPosts }: { recentPosts: HomePost[] }) {
  const { language } = useLanguage();
  const copy = homeCopy[language];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EA] dark:bg-slate-900 text-[#263238] dark:text-slate-200 overflow-x-hidden">
      <main className="flex-1">
        <section className="relative paper-ruled">
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
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#2A9D8F]">{copy.hero.eyebrow}</p>
              <h1 className="mt-3 bg-gradient-to-r from-[#2A9D8F] via-[#10243A] to-[#E76F51] bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
                {copy.hero.title}
              </h1>
              <p className="mx-auto mt-4 max-w-4xl text-lg text-[#263238] dark:text-slate-200 sm:text-2xl">
                {copy.hero.lead}
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-sm text-[#263238]/70 dark:text-slate-400 sm:text-base">
                {copy.hero.sublead}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/blog"
                className="sketch-btn inline-flex items-center border border-[#E76F51] bg-[#E76F51] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d96045]"
              >
                {copy.hero.blogCta}
              </Link>
              <Link
                href="/papers"
                className="sketch-btn inline-flex items-center border border-[#2A9D8F] bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#238a7e]"
              >
                {copy.hero.papersCta}
              </Link>
              <Link
                href="/datasets"
                className="sketch-btn inline-flex items-center border border-[#10243A]/40 bg-white px-5 py-3 text-sm font-medium text-[#10243A] transition hover:bg-[#10243A]/5 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/30"
              >
                {copy.hero.datasetsCta}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {copy.quickLinks.map((item) => (
                <Link key={item.href} href={item.href} aria-label={`${item.title}: ${item.desc}`}>
                  <article
                    className="sketch-card group h-full border-2 border-[#D8DEE6] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/50 dark:border-slate-700 dark:bg-slate-900"
                    style={{ borderLeftWidth: "4px", borderLeftColor: item.accentColor }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#263238]/50 dark:text-slate-500">{item.eyebrow}</p>
                      <span
                        role="status"
                        aria-label={`${item.title} status: ${item.status}`}
                        className="rounded-full border border-[#D8DEE6] bg-[#F7F3EA] px-2 py-0.5 text-[11px] font-medium text-[#263238]/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {item.status}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-[#10243A] dark:text-slate-100">{item.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#263238]/70 dark:text-slate-400">{item.desc}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2A9D8F]">{copy.publicIntro.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-[#10243A] dark:text-slate-100">{copy.publicIntro.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#263238]/70 dark:text-slate-400">
              {copy.publicIntro.desc}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {copy.publicSections.map((section) => (
              <article key={section.label} className={`rounded-3xl border p-5 shadow-sm ${section.tone}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#10243A] dark:text-slate-200">{section.label}</span>
                  <span
                    role="status"
                    aria-label={`${section.label} status: ${section.status}`}
                    className="rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-semibold text-[#263238]/70 dark:text-slate-300"
                  >
                    {section.status}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#10243A] dark:text-slate-100">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#263238]/70 dark:text-slate-400">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <article className="rounded-3xl border border-[#D8DEE6] bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#10243A] dark:text-slate-400">{copy.routes.eyebrow}</p>
                <h2 className="mt-2 text-xl font-bold text-[#10243A] dark:text-slate-100">{copy.routes.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#263238]/70 dark:text-slate-400">
                  {copy.routes.desc}
                </p>
              </div>
              <Link href="/blog" className="text-sm font-semibold text-[#E76F51] hover:underline">
                {copy.routes.viewBlog} <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {copy.routes.items.map((route) => (
                <Link
                  key={route.id}
                  href={route.href}
                  className="rounded-2xl border border-[#D8DEE6] bg-[#F7F3EA]/70 p-4 transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/40 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <p className="text-sm font-semibold text-[#10243A] dark:text-slate-100">{route.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#263238]/70 dark:text-slate-400">{route.text}</p>
                </Link>
              ))}
            </div>
          </article>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2A9D8F]">{copy.latest.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold text-[#10243A] dark:text-slate-100">{copy.latest.title}</h2>
              <p className="mt-2 text-sm text-[#263238]/70 dark:text-slate-400">{copy.latest.desc}</p>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-[#E76F51] hover:underline">
              {copy.latest.viewAll} <span aria-hidden="true">→</span>
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {recentPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <article className="h-full overflow-hidden rounded-2xl border border-[#D8DEE6] bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80">
                    {post.image && (
                      <Image
                        src={post.image}
                        alt={`${post.title} ${copy.latest.imageAltSuffix}`}
                        width={960}
                        height={540}
                        className="aspect-[16/9] w-full object-cover"
                        sizes="(min-width: 768px) 33vw, 100vw"
                      />
                    )}
                    <div className="p-5">
                      <p className="text-xs font-medium text-[#2A9D8F]">{post.category} · {post.date}</p>
                      <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[#10243A] dark:text-slate-100">{post.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#263238]/70 dark:text-slate-400">{post.description}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D8DEE6] p-8 text-center text-sm text-[#263238]/70 dark:border-slate-700 dark:text-slate-400">
              {copy.latest.empty}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
