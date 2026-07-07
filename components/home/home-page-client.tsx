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

type DomainKey = "blog" | "bio" | "assets";

type QuickLink = {
  key: DomainKey;
  href: string;
  title: string;
  desc: string;
  eyebrow: string;
  status: string;
  iconSrc: string;
  iconAlt: string;
  visualTitle: string;
  visualNote: string;
  sublinks?: { href: string; label: string }[];
};

type MetricCard = {
  label: string;
  title: string;
  body: string;
  key: DomainKey;
};

type RouteHighlight = {
  id: string;
  href: string;
  label: string;
  text: string;
};

const domainColors: Record<DomainKey, { accent: string; soft: string; ring: string }> = {
  blog: { accent: "#E76F51", soft: "#FFF1EC", ring: "rgba(231,111,81,0.28)" },
  bio: { accent: "#2A9D8F", soft: "#E7F6F3", ring: "rgba(42,157,143,0.28)" },
  assets: { accent: "#C47F2E", soft: "#FFF4D8", ring: "rgba(196,127,46,0.28)" },
};

const homeIconSrc: Record<DomainKey, string> = {
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
      trust: string[];
      orbitCenter: string;
      orbitNote: string;
    };
    quickLinks: QuickLink[];
    visualSystem: { eyebrow: string; title: string; desc: string; metrics: MetricCard[] };
    routes: { eyebrow: string; title: string; desc: string; viewBlog: string; items: RouteHighlight[] };
    latest: { eyebrow: string; title: string; desc: string; viewAll: string; empty: string; imageAltSuffix: string; fallback: string };
  }
> = {
  ko: {
    hero: {
      eyebrow: "SHawn_LAB · public knowledge gateway",
      title: "읽을거리, 바이오 근거, 에셋 신호.",
      lead: "읽을거리, 연구 근거, 참고 리포트를 하나의 고급 관문에서 탐색합니다.",
      sublead:
        "Home은 관문, Bio는 근거 아틀라스, Blog는 편집형 노트, Assets는 참고 전용 대시보드로 분리합니다.",
      blogCta: "Blog 읽기",
      bioCta: "Bio 탐색",
      assetsCta: "Assets 보기",
      trust: ["HCA 신뢰감", "CELLxGENE 탐색성", "Our World in Data 설명력", "Linear/Vercel 완성도"],
      orbitCenter: "SHawn",
      orbitNote: "출처 연결 차트",
    },
    quickLinks: [
      {
        key: "blog",
        href: "/blog",
        title: "Blog",
        desc: "편집형 글, topic map, featured article 중심의 공개 노트입니다.",
        eyebrow: "편집형 노트",
        status: "공개 글",
        iconSrc: homeIconSrc.blog,
        iconAlt: "Blog icon",
        visualTitle: "Editorial magazine",
        visualNote: "Featured article · topic map · related posts",
      },
      {
        key: "bio",
        href: "/bio",
        title: "Bio",
        desc: "논문, 데이터셋, 근거 행렬을 함께 탐색하는 evidence atlas입니다.",
        eyebrow: "근거 아틀라스",
        status: "논문 · 데이터셋",
        iconSrc: homeIconSrc.bio,
        iconAlt: "Bio icon",
        visualTitle: "Organ × data matrix",
        visualNote: "Source distribution · year histogram · dataset cards",
        sublinks: [
          { href: "/papers", label: "Papers" },
          { href: "/datasets", label: "Datasets" },
        ],
      },
      {
        key: "assets",
        href: "/invest",
        title: "Assets",
        desc: "시장 온도와 리포트 타임라인을 중립적으로 읽는 참고 전용 대시보드입니다.",
        eyebrow: "참고 대시보드",
        status: "참고 전용",
        iconSrc: homeIconSrc.assets,
        iconAlt: "Assets icon",
        visualTitle: "Risk / attention matrix",
        visualNote: "Report timeline · market temperature · not financial advice",
      },
    ],
    visualSystem: {
      eyebrow: "시각화 언어",
      title: "차트는 장식이 아니라 해석 도구입니다",
      desc: "각 도메인은 같은 카드 반복이 아니라 서로 다른 장면처럼 보이게 합니다. 모든 숫자는 출처와 해석 문장을 함께 둡니다.",
      metrics: [
        { key: "blog", label: "Blog", title: "Topic map", body: "글의 주제 분포와 최근 노트 흐름을 보여줍니다." },
        { key: "bio", label: "Bio", title: "Evidence matrix", body: "논문·데이터셋·기관·장기별 근거를 한눈에 묶습니다." },
        { key: "assets", label: "Assets", title: "Reference signals", body: "리포트 타임라인과 위험/관심도를 참고용으로만 표시합니다." },
      ],
    },
    routes: {
      eyebrow: "최종 IA",
      title: "최상위는 Blog / Bio / Assets 세 개만",
      desc: "Papers와 Datasets는 Bio 안으로, Reports와 Search는 Assets 안으로 묶어 첫 화면의 선택지를 줄입니다.",
      viewBlog: "전체 블로그 보기",
      items: [
        { id: "blog", href: "/blog", label: "Blog", text: "공개 글과 설명형 콘텐츠" },
        { id: "bio", href: "/bio", label: "Bio", text: "논문 검색과 데이터셋 탐색" },
        { id: "assets", href: "/invest", label: "Assets", text: "참고 리포트와 시장 온도" },
      ],
    },
    latest: {
      eyebrow: "최신 노트",
      title: "최근 블로그 글",
      desc: "이미지가 없는 글도 빈 박스 대신 편집형 대체 비주얼로 보여줍니다.",
      viewAll: "전체 블로그 보기",
      empty: "아직 공개된 블로그 글이 없습니다.",
      imageAltSuffix: "대표 이미지",
      fallback: "편집형 노트",
    },
  },
  en: {
    hero: {
      eyebrow: "SHawn_LAB · public knowledge gateway",
      title: "Public notes, bio evidence, and asset signals.",
      lead: "Explore readable notes, research evidence, and reference reports from one polished gateway.",
      sublead:
        "Home acts as the gateway, Bio as the evidence atlas, Blog as editorial notes, and Assets as a reference-only dashboard.",
      blogCta: "Read Blog",
      bioCta: "Explore Bio",
      assetsCta: "View Assets",
      trust: ["HCA trust", "CELLxGENE discovery", "OWID explanation", "Linear/Vercel polish"],
      orbitCenter: "SHawn",
      orbitNote: "source-linked charts",
    },
    quickLinks: [
      {
        key: "blog",
        href: "/blog",
        title: "Blog",
        desc: "Editorial notes with featured articles, topic maps, and public-friendly context.",
        eyebrow: "Editorial notes",
        status: "Public articles",
        iconSrc: homeIconSrc.blog,
        iconAlt: "Blog icon",
        visualTitle: "Editorial magazine",
        visualNote: "Featured article · topic map · related posts",
      },
      {
        key: "bio",
        href: "/bio",
        title: "Bio",
        desc: "An evidence atlas for papers, datasets, source distribution, and data-type coverage.",
        eyebrow: "Evidence atlas",
        status: "Papers · Datasets",
        iconSrc: homeIconSrc.bio,
        iconAlt: "Bio icon",
        visualTitle: "Organ × data matrix",
        visualNote: "Source distribution · year histogram · dataset cards",
        sublinks: [
          { href: "/papers", label: "Papers" },
          { href: "/datasets", label: "Datasets" },
        ],
      },
      {
        key: "assets",
        href: "/invest",
        title: "Assets",
        desc: "A neutral reference dashboard for market temperature and report timelines, not financial advice.",
        eyebrow: "Reference dashboard",
        status: "Reference only",
        iconSrc: homeIconSrc.assets,
        iconAlt: "Assets icon",
        visualTitle: "Risk / attention matrix",
        visualNote: "Report timeline · market temperature · not financial advice",
      },
    ],
    visualSystem: {
      eyebrow: "Visualization language",
      title: "Charts are interpretation tools, not decoration",
      desc: "Each domain should feel like a distinct scene rather than another repeated card. Every number needs a short reading note and source context.",
      metrics: [
        { key: "blog", label: "Blog", title: "Topic map", body: "Shows topic distribution and recent editorial flow." },
        { key: "bio", label: "Bio", title: "Evidence matrix", body: "Connects papers, datasets, sources, organs, and data types." },
        { key: "assets", label: "Assets", title: "Reference signals", body: "Displays timelines and attention/risk patterns as reference only." },
      ],
    },
    routes: {
      eyebrow: "Final IA",
      title: "Only Blog / Bio / Assets at the top level",
      desc: "Papers and Datasets live inside Bio; Reports and Search live inside Assets, reducing first-screen choice overload.",
      viewBlog: "View all posts",
      items: [
        { id: "blog", href: "/blog", label: "Blog", text: "Public articles and explainers" },
        { id: "bio", href: "/bio", label: "Bio", text: "Paper search and dataset discovery" },
        { id: "assets", href: "/invest", label: "Assets", text: "Reference reports and market temperature" },
      ],
    },
    latest: {
      eyebrow: "Latest notes",
      title: "Recent posts",
      desc: "Posts without images use an editorial fallback visual instead of an empty box.",
      viewAll: "View all posts",
      empty: "No public blog posts yet.",
      imageAltSuffix: "featured image",
      fallback: "Editorial note",
    },
  },
};

function DomainVisual({ type }: { type: DomainKey }) {
  if (type === "bio") {
    return (
      <div className="rounded-[1.75rem] border border-[#2A9D8F]/20 bg-gradient-to-br from-[#F7FFFC] to-[#E5F5F1] p-4 shadow-inner">
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A9D8F]">
          <span>Evidence matrix</span>
          <span>sources</span>
        </div>
        <div className="grid grid-cols-4 gap-2" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="h-10 rounded-xl"
              style={{
                background:
                  index % 5 === 0
                    ? "#2A9D8F"
                    : index % 3 === 0
                      ? "#98D4CC"
                      : "rgba(42,157,143,0.14)",
              }}
            />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
          <span className="h-2 rounded-full bg-[#2A9D8F]/70" />
          <span className="h-2 rounded-full bg-[#2A9D8F]/35" />
          <span className="h-2 rounded-full bg-[#2A9D8F]/20" />
        </div>
      </div>
    );
  }

  if (type === "assets") {
    return (
      <div className="rounded-[1.75rem] border border-slate-800 bg-[#0D1F35] p-4 text-white shadow-inner">
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
          <span>Reference only</span>
          <span>timeline</span>
        </div>
        <div className="flex h-28 items-end gap-2 rounded-2xl bg-white/5 p-3" aria-hidden="true">
          {[48, 76, 58, 90, 64, 44, 72, 55].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-[#C47F2E] to-[#F1C96B]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden="true">
          <span className="h-8 rounded-xl bg-white/10" />
          <span className="h-8 rounded-xl bg-white/10" />
          <span className="h-8 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-[#E76F51]/20 bg-gradient-to-br from-white to-[#FFF1EC] p-4 shadow-inner">
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E76F51]">
        <span>Editorial</span>
        <span>topic map</span>
      </div>
      <div className="space-y-3" aria-hidden="true">
        <span className="block h-4 w-4/5 rounded-full bg-[#10243A]" />
        <span className="block h-3 w-full rounded-full bg-slate-200" />
        <span className="block h-3 w-3/4 rounded-full bg-slate-200" />
        <div className="flex items-end justify-between gap-3 pt-2">
          <span className="h-14 flex-1 rounded-2xl bg-[#E76F51]/10" />
          <span className="h-20 flex-1 rounded-2xl bg-[#10243A]/10" />
          <span className="h-10 flex-1 rounded-2xl bg-[#2A9D8F]/10" />
        </div>
      </div>
    </div>
  );
}

function HeroOrbit({ copy }: { copy: (typeof homeCopy)["ko"]["hero"] }) {
  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-[#D8DEE6] bg-[radial-gradient(circle_at_18%_28%,rgba(42,157,143,0.34),transparent_18%),radial-gradient(circle_at_76%_24%,rgba(231,111,81,0.32),transparent_18%),radial-gradient(circle_at_62%_78%,rgba(196,127,46,0.35),transparent_18%),linear-gradient(135deg,#E7F6F3,#FFF9E8)] p-6 shadow-[inset_0_0_80px_rgba(255,255,255,0.82)] dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[1.7rem] bg-white text-xl font-black text-[#10243A] shadow-2xl dark:bg-slate-950 dark:text-white">
        {copy.orbitCenter}
      </div>
      <div className="absolute left-[8%] top-[20%] rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#10243A] shadow-lg dark:bg-slate-950 dark:text-white">
        Blog
      </div>
      <div className="absolute right-[10%] top-[22%] rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#10243A] shadow-lg dark:bg-slate-950 dark:text-white">
        Bio
      </div>
      <div className="absolute bottom-[18%] right-[12%] rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#10243A] shadow-lg dark:bg-slate-950 dark:text-white">
        Assets
      </div>
      <div className="absolute bottom-[24%] left-[12%] rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-lg dark:bg-slate-950 dark:text-slate-300">
        {copy.orbitNote}
      </div>
    </div>
  );
}

function RecentPostFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#FFF9E8] via-white to-[#E7F6F3] p-5">
      <div className="flex h-full flex-col justify-between rounded-2xl border border-[#D8DEE6] bg-white/70 p-4">
        <span className="w-fit rounded-full bg-[#10243A] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
          {label}
        </span>
        <div className="space-y-2" aria-hidden="true">
          <span className="block h-3 w-4/5 rounded-full bg-[#10243A]/80" />
          <span className="block h-2 w-full rounded-full bg-slate-200" />
          <span className="block h-2 w-2/3 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function HomePageClient({ recentPosts }: { recentPosts: HomePost[] }) {
  const { language } = useLanguage();
  const copy = homeCopy[language];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[radial-gradient(circle_at_0%_0%,#FFF1C9_0,transparent_30%),radial-gradient(circle_at_92%_4%,#CFEDEA_0,transparent_32%),linear-gradient(135deg,#F7F3EA,#EEF8F6_56%,#FFF8E7)] text-[#10243A] dark:bg-slate-950 dark:text-slate-100">
      <main className="flex-1">
        <section className="relative px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-black tracking-tight text-[#10243A] dark:text-white">SHawn-WEB</p>
              <p className="rounded-full border border-[#D8DEE6] bg-white/55 px-4 py-2 text-xs font-medium text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                Public-facing · Blog / Bio / Assets · no internal labels
              </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2A9D8F]">{copy.hero.eyebrow}</p>
                <h1 className="mt-4 max-w-4xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.065em] text-[#07182C] dark:text-white sm:text-6xl lg:text-7xl">
                  {copy.hero.title}
                </h1>
                <div className="mt-6 flex flex-wrap gap-2">
                  {copy.hero.trust.map((item) => (
                    <span key={item} className="rounded-full border border-[#D8DEE6] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#263238] shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="max-w-2xl lg:ml-auto">
                <p className="text-2xl font-semibold leading-snug text-slate-700 dark:text-slate-200">{copy.hero.lead}</p>
                <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">{copy.hero.sublead}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/bio" className="rounded-full bg-[#10243A] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#10243A]/15 transition hover:-translate-y-0.5 hover:bg-[#0A1728]">
                    {copy.hero.bioCta}
                  </Link>
                  <Link href="/blog" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#10243A] shadow-sm ring-1 ring-[#D8DEE6] transition hover:-translate-y-0.5 hover:ring-[#E76F51]/40 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                    {copy.hero.blogCta}
                  </Link>
                  <Link href="/invest" className="rounded-full bg-white/70 px-5 py-3 text-sm font-bold text-[#10243A] shadow-sm ring-1 ring-[#D8DEE6] transition hover:-translate-y-0.5 hover:ring-[#C47F2E]/40 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                    {copy.hero.assetsCta}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-12 rounded-[2.25rem] border border-[#D8DEE6] bg-white/72 p-4 shadow-[0_30px_100px_rgba(13,31,53,0.13)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/78">
              <div className="overflow-hidden rounded-[1.75rem] border border-[#D8DEE6] bg-[#FFFDF8] dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-2 border-b border-[#D8DEE6] bg-white/85 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
                  <span className="h-3 w-3 rounded-full bg-[#E76F51]" aria-hidden="true" />
                  <span className="h-3 w-3 rounded-full bg-[#F2B34A]" aria-hidden="true" />
                  <span className="h-3 w-3 rounded-full bg-[#2A9D8F]" aria-hidden="true" />
                  <span className="ml-2 text-sm font-black text-[#10243A] dark:text-white">SHawn_LAB</span>
                  <div className="ml-auto hidden items-center gap-5 text-sm font-bold text-slate-600 dark:text-slate-300 sm:flex">
                    <span>Blog</span>
                    <span>Bio</span>
                    <span>Assets</span>
                    <span>KOR · ENG</span>
                  </div>
                </div>

                <div className="grid gap-8 p-5 lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-balance text-4xl font-black leading-tight tracking-[-0.055em] text-[#07182C] dark:text-white sm:text-5xl">
                      {copy.hero.title}
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">{copy.hero.lead}</p>
                  </div>
                  <HeroOrbit copy={copy.hero} />
                </div>

                <div className="grid gap-4 border-t border-[#D8DEE6] p-5 dark:border-slate-700 lg:grid-cols-3 lg:p-8">
                  {copy.quickLinks.map((item) => (
                    <Link key={item.href} href={item.href} aria-label={`${item.title}: ${item.desc}`} className="group block h-full">
                      <article className="flex h-full flex-col rounded-[1.6rem] border border-[#D8DEE6] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-5 flex items-center justify-between gap-4">
                          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#D8DEE6] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                            <Image src={item.iconSrc} alt={item.iconAlt} fill className="object-cover" sizes="56px" priority />
                          </div>
                          <span className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]" style={{ backgroundColor: domainColors[item.key].soft, color: domainColors[item.key].accent }}>
                            {item.eyebrow}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black tracking-[-0.04em] text-[#10243A] dark:text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.desc}</p>
                        <div className="my-5">
                          <DomainVisual type={item.key} />
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-2">
                          <span role="status" aria-label={`${item.title} status: ${item.status}`} className="rounded-full border border-[#D8DEE6] px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                            {item.status}
                          </span>
                          {item.sublinks?.map((sublink) => (
                            <span key={sublink.href} className="rounded-full bg-[#2A9D8F]/10 px-3 py-1 text-xs font-bold text-[#2A9D8F]">
                              {sublink.label}
                            </span>
                          ))}
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <article className="rounded-[2rem] border border-[#D8DEE6] bg-white/78 p-7 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/78">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#10243A] dark:text-slate-300">{copy.routes.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[#10243A] dark:text-white">{copy.routes.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy.routes.desc}</p>
            <div className="mt-6 rounded-2xl bg-[#10243A] px-5 py-4 text-center text-lg font-black text-white">Home</div>
            <div className="my-3 text-center text-xl text-slate-400" aria-hidden="true">↓</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {copy.routes.items.map((route) => (
                <Link key={route.id} href={route.href} className="rounded-2xl border border-[#D8DEE6] bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/40 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-lg font-black text-[#10243A] dark:text-white">{route.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{route.text}</p>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[#D8DEE6] bg-white/78 p-7 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/78">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2A9D8F]">{copy.visualSystem.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[#10243A] dark:text-white">{copy.visualSystem.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy.visualSystem.desc}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {copy.visualSystem.metrics.map((metric) => (
                <div key={metric.title} className="rounded-2xl border border-[#D8DEE6] bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                  <span className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: domainColors[metric.key].accent }}>
                    {metric.label}
                  </span>
                  <h3 className="mt-3 text-lg font-black text-[#10243A] dark:text-white">{metric.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{metric.body}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2A9D8F]">{copy.latest.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#10243A] dark:text-white">{copy.latest.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{copy.latest.desc}</p>
            </div>
            <Link href="/blog" className="text-sm font-black text-[#E76F51] hover:underline">
              {copy.latest.viewAll} <span aria-hidden="true">→</span>
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {recentPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group block h-full">
                  <article className="h-full overflow-hidden rounded-[1.5rem] border border-[#D8DEE6] bg-white/84 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/84">
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <RecentPostFallback label={copy.latest.fallback} />
                      {post.image && (
                        <Image
                          src={post.image}
                          alt={`${post.title} ${copy.latest.imageAltSuffix}`}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          sizes="(min-width: 768px) 33vw, 100vw"
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-bold text-[#2A9D8F]">{getPublicCategoryLabel(post.category)} · {post.date}</p>
                      <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-[-0.025em] text-[#10243A] dark:text-white">{post.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{post.description}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D8DEE6] bg-white/60 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              {copy.latest.empty}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
