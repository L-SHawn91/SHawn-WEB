"use client";

import { Footer } from "@/components/ui/footer";
import { useLanguage } from "@/components/providers/language-provider";
import Image from "next/image";
import Link from "next/link";
import { getPublicCategoryLabel } from "@/lib/public-labels";

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
  iconSrc: string;
  iconAlt: string;
  sublinks?: { href: string; label: string }[];
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
  bio: "#2A9D8F",
  assets: "#C47F2E",
};

const homeIconSrc = {
  blog: "/assets/icons/core/blog.webp",
  bio: "/assets/icons/core/bio.webp",
  assets: "/assets/icons/core/assets.webp",
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
      bioCta: string;
      assetsCta: string;
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
      title: "블로그, 바이오 & 에셋 허브",
      lead: "공개 글은 Blog에서 읽고, 논문·데이터셋 검색은 Bio에서 한 번에 시작합니다.",
      sublead: "SHawn_LAB의 글, 연구 근거 탐색, 데이터셋 스카우팅, 자산/운영 리포트를 단순한 3개 진입점으로 정리했습니다.",
      blogCta: "블로그 열기",
      bioCta: "바이오 검색",
      assetsCta: "에셋 보기",
    },
    quickLinks: [
      {
        href: "/blog",
        title: "블로그",
        desc: "AI 도구, 자동화, 현장 기록, 읽기 쉬운 해설형 콘텐츠를 모아둔 공개 노트입니다.",
        eyebrow: "공개 노트",
        status: "공개 콘텐츠",
        accentColor: accents.blog,
        iconSrc: homeIconSrc.blog,
        iconAlt: "블로그 아이콘",
      },
      {
        href: "/bio",
        title: "바이오",
        desc: "논문 검색과 데이터셋 탐색을 하나의 바이오 진입점으로 묶어 연구 근거를 빠르게 찾습니다.",
        eyebrow: "연구 검색",
        status: "논문 + 데이터셋",
        accentColor: accents.bio,
        iconSrc: homeIconSrc.bio,
        iconAlt: "바이오 아이콘",
        sublinks: [
          { href: "/papers", label: "논문" },
          { href: "/datasets", label: "데이터셋" },
          { href: "/blog", label: "Bio notes" },
        ],
      },
      {
        href: "/invest",
        title: "에셋",
        desc: "교육·모니터링 목적의 시장 온도와 리포트 아카이브입니다. 투자 조언이 아닙니다.",
        eyebrow: "자료 / 리포트",
        status: "참고 전용",
        accentColor: accents.assets,
        iconSrc: homeIconSrc.assets,
        iconAlt: "에셋 아이콘",
      },
    ],
    publicIntro: {
      eyebrow: "공개 섹션",
      title: "세 개의 공개 진입점",
      desc: "외부 독자에게 필요한 Blog, Bio, Assets만 전면에 두고 내부 운영명과 작업 레이어는 웹 문구에서 숨깁니다.",
    },
    publicSections: [
      {
        label: "Blog",
        title: "공개 노트와 해설 글",
        body: "AI 도구, 자동화, 연구 운영, 일상 기록을 외부 독자가 읽기 쉬운 글로 정리합니다.",
        status: "Articles",
        tone: "border-[#E76F51]/30 bg-[#E76F51]/8 dark:border-orange-400/30 dark:bg-orange-950/20",
      },
      {
        label: "Bio",
        title: "논문과 데이터셋 탐색",
        body: "논문 검색, 근거 탐색, 공개 데이터셋 스카우팅을 하나의 바이오 허브로 연결합니다.",
        status: "Papers · Datasets",
        tone: "border-[#2A9D8F]/30 bg-[#2A9D8F]/8 dark:border-emerald-400/30 dark:bg-emerald-950/20",
      },
      {
        label: "Assets",
        title: "에셋 리포트 아카이브",
        body: "시장 온도와 리포트를 교육·모니터링 목적으로 정리합니다. 투자 조언으로 표시하지 않습니다.",
        status: "Reference only",
        tone: "border-[#C47F2E]/30 bg-[#C47F2E]/8 dark:border-amber-400/30 dark:bg-amber-950/20",
      },
    ],
    routes: {
      eyebrow: "게이트웨이 라우트",
      title: "Papers와 Datasets는 Bio 안으로 묶습니다",
      desc: "방문자는 블로그, 바이오 검색, 에셋 아카이브로 바로 이동하고, Bio 안에서 논문과 데이터셋을 선택합니다.",
      viewBlog: "전체 블로그 보기",
      items: [
        { id: "blog", href: "/blog", label: "블로그", text: "공개 글과 설명형 콘텐츠" },
        { id: "bio", href: "/bio", label: "바이오", text: "논문 검색과 데이터셋 탐색" },
        { id: "assets", href: "/invest", label: "에셋", text: "시장 온도와 리포트 아카이브" },
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
      title: "Blog, Bio & Assets Hub",
      lead: "Read public articles in Blog, and start paper plus dataset discovery from Bio.",
      sublead: "A simple three-entry public surface for SHawn_LAB articles, research evidence discovery, dataset scouting, and selected asset reports.",
      blogCta: "Open Blog",
      bioCta: "Search Bio",
      assetsCta: "View Assets",
    },
    quickLinks: [
      {
        href: "/blog",
        title: "Blog",
        desc: "Public notes on AI tools, automation, field logs, and readable commentary from SHawn_LAB.",
        eyebrow: "Public notes",
        status: "Open content",
        accentColor: accents.blog,
        iconSrc: homeIconSrc.blog,
        iconAlt: "Blog icon",
      },
      {
        href: "/bio",
        title: "Bio",
        desc: "One public entry point for paper search, evidence discovery, and dataset scouting.",
        eyebrow: "Research search",
        status: "Papers + datasets",
        accentColor: accents.bio,
        iconSrc: homeIconSrc.bio,
        iconAlt: "Bio icon",
        sublinks: [
          { href: "/papers", label: "Papers" },
          { href: "/datasets", label: "Datasets" },
          { href: "/blog", label: "Bio notes" },
        ],
      },
      {
        href: "/invest",
        title: "Assets",
        desc: "Market-temperature and report archive surface for education and monitoring, not financial advice.",
        eyebrow: "Reports",
        status: "Reference only",
        accentColor: accents.assets,
        iconSrc: homeIconSrc.assets,
        iconAlt: "Assets icon",
      },
    ],
    publicIntro: {
      eyebrow: "Public sections",
      title: "Three public entry points",
      desc: "The public site keeps Blog, Bio, and Assets upfront while hiding internal operation labels and workflow layers.",
    },
    publicSections: [
      {
        label: "Blog",
        title: "Public notes and explainers",
        body: "Readable articles on AI tools, automation, research operations, and everyday field notes.",
        status: "Articles",
        tone: "border-[#E76F51]/30 bg-[#E76F51]/8 dark:border-orange-400/30 dark:bg-orange-950/20",
      },
      {
        label: "Bio",
        title: "Papers and dataset discovery",
        body: "A single Bio hub for paper search, evidence discovery, and public dataset scouting.",
        status: "Papers · Datasets",
        tone: "border-[#2A9D8F]/30 bg-[#2A9D8F]/8 dark:border-emerald-400/30 dark:bg-emerald-950/20",
      },
      {
        label: "Assets",
        title: "Asset report archive",
        body: "Education and monitoring-oriented market temperature reports, clearly framed as reference only.",
        status: "Reference only",
        tone: "border-[#C47F2E]/30 bg-[#C47F2E]/8 dark:border-amber-400/30 dark:bg-amber-950/20",
      },
    ],
    routes: {
      eyebrow: "Gateway routes",
      title: "Papers and Datasets live inside Bio",
      desc: "Visitors move directly to Blog, Bio search, and the Assets archive; Bio then branches into Papers and Datasets.",
      viewBlog: "View all posts",
      items: [
        { id: "blog", href: "/blog", label: "Blog", text: "Public articles and explainers" },
        { id: "bio", href: "/bio", label: "Bio", text: "Paper search and dataset discovery" },
        { id: "assets", href: "/invest", label: "Assets", text: "Market temperature and report archive" },
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
                href="/bio"
                className="sketch-btn inline-flex items-center border border-[#2A9D8F] bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#238a7e]"
              >
                {copy.hero.bioCta}
              </Link>
              <Link
                href="/invest"
                className="sketch-btn inline-flex items-center border border-[#10243A]/40 bg-white px-5 py-3 text-sm font-medium text-[#10243A] transition hover:bg-[#10243A]/5 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/30"
              >
                {copy.hero.assetsCta}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {copy.quickLinks.map((item) => (
                <Link key={item.href} href={item.href} aria-label={`${item.title}: ${item.desc}`}>
                  <article
                    className="sketch-card group h-full overflow-hidden border-2 border-[#D8DEE6] bg-white transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/50 dark:border-slate-700 dark:bg-slate-900"
                    style={{ borderTopWidth: "4px", borderTopColor: item.accentColor }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#F7F3EA] dark:bg-slate-800">
                      <Image
                        src={item.iconSrc}
                        alt={item.iconAlt}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        sizes="(min-width: 768px) 33vw, 100vw"
                        priority
                      />
                    </div>
                    <div className="p-5">
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
                      {item.sublinks && (
                        <div className="mt-4 flex flex-wrap gap-2" aria-label={`${item.title} shortcuts`}>
                          {item.sublinks.map((sublink) => (
                            <span
                              key={sublink.href}
                              className="rounded-full border border-[#2A9D8F]/20 bg-[#2A9D8F]/8 px-2.5 py-1 text-xs font-semibold text-[#2A9D8F]"
                            >
                              {sublink.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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

            <div className="mt-5 grid gap-3 md:grid-cols-3">
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
                      <p className="text-xs font-medium text-[#2A9D8F]">{getPublicCategoryLabel(post.category)} · {post.date}</p>
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
