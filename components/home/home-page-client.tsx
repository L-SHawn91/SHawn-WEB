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

type DomainLink = {
  key: DomainKey;
  href: string;
  title: string;
  label: string;
  desc: string;
  iconSrc: string;
  iconAlt: string;
  accent: string;
  soft: string;
  sublinks?: { href: string; label: string }[];
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
      bioCta: string;
      blogCta: string;
      assetsCta: string;
      visualTitle: string;
      visualRows: { label: string; text: string }[];
      visualNote: string;
    };
    domainsTitle: string;
    domainsDesc: string;
    domains: DomainLink[];
    latest: {
      eyebrow: string;
      title: string;
      desc: string;
      viewAll: string;
      empty: string;
      imageAltSuffix: string;
      fallback: string;
    };
  }
> = {
  ko: {
    hero: {
      eyebrow: "SHawn_LAB",
      title: "읽을거리와 연구 근거를 조용하게 연결합니다.",
      lead: "공개 글, 바이오 연구 근거, 참고 리포트를 세 개의 입구로 나누어 읽기 쉽게 연결합니다.",
      bioCta: "Bio 탐색",
      blogCta: "Blog 읽기",
      assetsCta: "Assets 보기",
      visualTitle: "Public gateway",
      visualRows: [
        { label: "Blog", text: "공개 글" },
        { label: "Bio", text: "논문 · 데이터셋" },
        { label: "Assets", text: "참고 리포트" },
      ],
      visualNote: "글, 근거, 리포트를 한 화면에서 빠르게 고릅니다.",
    },
    domainsTitle: "세 개의 입구",
    domainsDesc: "읽을거리, 연구 근거, 참고 리포트를 각각의 역할에 맞게 탐색합니다.",
    domains: [
      {
        key: "blog",
        href: "/blog",
        title: "Blog",
        label: "읽는 공간",
        desc: "공개 글과 해설형 노트를 모아 봅니다.",
        iconSrc: homeIconSrc.blog,
        iconAlt: "Blog icon",
        accent: "#E76F51",
        soft: "#FFF1EC",
      },
      {
        key: "bio",
        href: "/bio",
        title: "Bio",
        label: "근거 탐색",
        desc: "논문과 데이터셋을 Bio 안에서 탐색합니다.",
        iconSrc: homeIconSrc.bio,
        iconAlt: "Bio icon",
        accent: "#2A9D8F",
        soft: "#E7F6F3",
        sublinks: [
          { href: "/papers", label: "Papers" },
          { href: "/datasets", label: "Datasets" },
        ],
      },
      {
        key: "assets",
        href: "/invest",
        title: "Assets",
        label: "참고 전용",
        desc: "리포트와 시장 신호를 중립적으로 읽습니다.",
        iconSrc: homeIconSrc.assets,
        iconAlt: "Assets icon",
        accent: "#C47F2E",
        soft: "#FFF4D8",
      },
    ],
    latest: {
      eyebrow: "최신 노트",
      title: "최근 글",
      desc: "최근 공개 글을 이어서 읽습니다.",
      viewAll: "전체 보기",
      empty: "아직 공개된 블로그 글이 없습니다.",
      imageAltSuffix: "대표 이미지",
      fallback: "Note",
    },
  },
  en: {
    hero: {
      eyebrow: "SHawn_LAB",
      title: "A calm gateway for notes and evidence.",
      lead: "Public articles, bio research evidence, and reference reports are grouped into three clear entry points.",
      bioCta: "Explore Bio",
      blogCta: "Read Blog",
      assetsCta: "View Assets",
      visualTitle: "Public gateway",
      visualRows: [
        { label: "Blog", text: "Public articles" },
        { label: "Bio", text: "Papers · datasets" },
        { label: "Assets", text: "Reference reports" },
      ],
      visualNote: "Choose articles, evidence, or reference reports quickly.",
    },
    domainsTitle: "Three entry points",
    domainsDesc: "Browse notes, research evidence, and reference reports by purpose.",
    domains: [
      {
        key: "blog",
        href: "/blog",
        title: "Blog",
        label: "Editorial notes",
        desc: "Public articles and readable explanations.",
        iconSrc: homeIconSrc.blog,
        iconAlt: "Blog icon",
        accent: "#E76F51",
        soft: "#FFF1EC",
      },
      {
        key: "bio",
        href: "/bio",
        title: "Bio",
        label: "Evidence search",
        desc: "Papers and datasets grouped under Bio.",
        iconSrc: homeIconSrc.bio,
        iconAlt: "Bio icon",
        accent: "#2A9D8F",
        soft: "#E7F6F3",
        sublinks: [
          { href: "/papers", label: "Papers" },
          { href: "/datasets", label: "Datasets" },
        ],
      },
      {
        key: "assets",
        href: "/invest",
        title: "Assets",
        label: "Reference only",
        desc: "Neutral report and signal reading, not financial advice.",
        iconSrc: homeIconSrc.assets,
        iconAlt: "Assets icon",
        accent: "#C47F2E",
        soft: "#FFF4D8",
      },
    ],
    latest: {
      eyebrow: "Latest notes",
      title: "Recent posts",
      desc: "Continue with the latest public notes.",
      viewAll: "View all",
      empty: "No public blog posts yet.",
      imageAltSuffix: "featured image",
      fallback: "Note",
    },
  },
};

function GatewayVisual({ copy }: { copy: (typeof homeCopy)["ko"]["hero"] }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#D9E0E6] bg-white/72 p-6 shadow-[0_24px_70px_rgba(15,35,52,0.10)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/78">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#CFEDEA] blur-2xl dark:bg-[#1E5D58]/40" aria-hidden="true" />
      <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#FFF1C9] blur-2xl dark:bg-[#4B3614]/40" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2A9D8F]">{copy.visualTitle}</p>
        <div className="mt-6 space-y-3">
          {copy.visualRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 rounded-2xl border border-[#D9E0E6] bg-white/78 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/70">
              <span className="text-lg font-black text-[#0B1D33] dark:text-white">{row.label}</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{row.text}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-[#D9E0E6] to-transparent dark:via-slate-700" aria-hidden="true" />
        <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {copy.visualNote}
        </p>
      </div>
    </div>
  );
}

function RecentPostFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#FFF9E8] via-white to-[#E7F6F3] p-4">
      <div className="flex h-full items-end rounded-2xl border border-[#D9E0E6] bg-white/70 p-4">
        <span className="rounded-full bg-[#0B1D33] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
          {label}
        </span>
      </div>
    </div>
  );
}

export function HomePageClient({ recentPosts }: { recentPosts: HomePost[] }) {
  const { language } = useLanguage();
  const copy = homeCopy[language];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[linear-gradient(135deg,#FFF7D9_0%,#F5F1E8_42%,#E6F5F2_100%)] text-[#0B1D33] dark:bg-slate-950 dark:text-slate-100">
      <main className="flex-1">
        <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#2A9D8F]">{copy.hero.eyebrow}</p>
              <h1 className="mt-5 max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.06em] text-[#06182D] dark:text-white sm:text-6xl lg:text-7xl">
                {copy.hero.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300 sm:text-xl">
                {copy.hero.lead}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/bio" className="rounded-full bg-[#0B1D33] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#0B1D33]/15 transition hover:-translate-y-0.5">
                  {copy.hero.bioCta}
                </Link>
                <Link href="/blog" className="rounded-full bg-white/85 px-5 py-3 text-sm font-bold text-[#0B1D33] shadow-sm ring-1 ring-[#D9E0E6] transition hover:-translate-y-0.5 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                  {copy.hero.blogCta}
                </Link>
                <Link href="/invest" className="rounded-full bg-white/65 px-5 py-3 text-sm font-bold text-[#0B1D33] shadow-sm ring-1 ring-[#D9E0E6] transition hover:-translate-y-0.5 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                  {copy.hero.assetsCta}
                </Link>
              </div>
            </div>
            <GatewayVisual copy={copy.hero} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#0B1D33] dark:text-white sm:text-3xl">{copy.domainsTitle}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{copy.domainsDesc}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {copy.domains.map((item) => (
              <Link key={item.href} href={item.href} aria-label={`${item.title}: ${item.desc}`} className="group block h-full">
                <article className="flex h-full flex-col rounded-[1.75rem] border border-[#D9E0E6] bg-white/82 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/82">
                  <div className="flex items-start justify-between gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#D9E0E6] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                      <Image src={item.iconSrc} alt={item.iconAlt} fill className="object-cover" sizes="64px" priority />
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: item.soft, color: item.accent }}>
                      {item.label}
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[#0B1D33] dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.desc}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
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
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2A9D8F]">{copy.latest.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#0B1D33] dark:text-white">{copy.latest.title}</h2>
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
                  <article className="h-full overflow-hidden rounded-[1.5rem] border border-[#D9E0E6] bg-white/84 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/84">
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <RecentPostFallback label={copy.latest.fallback} />
                      {post.image && (
                        <Image
                          src={post.image}
                          alt={`${post.title} ${copy.latest.imageAltSuffix}`}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          sizes="(min-width: 768px) 33vw, 100vw"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-bold text-[#2A9D8F]">
                        {getPublicCategoryLabel(post.category)} · {post.date}
                      </p>
                      <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-[-0.025em] text-[#0B1D33] dark:text-white">{post.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{post.description}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D9E0E6] bg-white/60 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              {copy.latest.empty}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
