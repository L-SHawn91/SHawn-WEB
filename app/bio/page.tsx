"use client";

import { Footer } from "@/components/ui/footer";
import { useLanguage } from "@/components/providers/language-provider";
import Image from "next/image";
import Link from "next/link";

const copy = {
  ko: {
    eyebrow: "SHawn_LAB · Bio",
    title: "논문과 데이터셋을 한 곳에서 시작합니다",
    lead: "Bio는 공개 논문 검색과 데이터셋 탐색을 묶는 연구 진입점입니다. Papers와 Datasets를 따로 기억하지 않아도 여기서 바로 이동할 수 있습니다.",
    cards: [
      {
        href: "/papers",
        title: "논문 검색",
        desc: "PubMed, arXiv, Semantic Scholar 기반의 공개 논문·근거 탐색",
        cta: "논문 검색 열기",
      },
      {
        href: "/datasets",
        title: "데이터셋 검색",
        desc: "NCBI, ENA, Europe PMC와 공개 omics accession 후보 탐색",
        cta: "데이터셋 검색 열기",
      },
      {
        href: "/blog",
        title: "Bio notes",
        desc: "바이오 연구와 데이터 해석을 독자 친화적으로 정리한 공개 글",
        cta: "Bio 글 보기",
      },
    ],
    noteTitle: "공개 화면 원칙",
    note: "내부 운영명은 공개 화면에 노출하지 않고, 외부 독자에게는 Blog / Bio / Assets 구조로 단순하게 안내합니다.",
  },
  en: {
    eyebrow: "SHawn_LAB · Bio",
    title: "Start papers and datasets from one Bio hub",
    lead: "Bio is the public research entry point that groups paper search and dataset discovery. Visitors do not need to remember separate Papers and Datasets routes first.",
    cards: [
      {
        href: "/papers",
        title: "Papers Search",
        desc: "Public paper and evidence discovery across PubMed, arXiv, and Semantic Scholar.",
        cta: "Open Papers Search",
      },
      {
        href: "/datasets",
        title: "Datasets Search",
        desc: "Find public datasets and omics accession candidates across NCBI, ENA, and Europe PMC.",
        cta: "Open Datasets Search",
      },
      {
        href: "/blog",
        title: "Bio notes",
        desc: "Readable public notes about bio research and data interpretation.",
        cta: "Read Bio notes",
      },
    ],
    noteTitle: "Public surface principle",
    note: "Internal operating labels stay out of the public site. Readers see the simpler Blog / Bio / Assets structure.",
  },
};

export default function BioPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#263238] dark:bg-slate-900 dark:text-slate-200">
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#2A9D8F]">{t.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-[#10243A] dark:text-slate-100 sm:text-6xl">
              {t.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#263238]/75 dark:text-slate-400 sm:text-lg">
              {t.lead}
            </p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-[#D8DEE6] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Image
              src="/assets/icons/core/bio.webp"
              alt="Bio icon"
              width={768}
              height={768}
              className="aspect-square w-full object-cover"
              priority
            />
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {t.cards.map((card) => (
            <Link key={card.href} href={card.href} aria-label={`${card.title}: ${card.desc}`}>
              <article className="h-full rounded-3xl border border-[#D8DEE6] bg-white/85 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/50 dark:border-slate-700 dark:bg-slate-900/85">
                <h2 className="text-xl font-semibold text-[#10243A] dark:text-slate-100">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#263238]/70 dark:text-slate-400">{card.desc}</p>
                <p className="mt-6 text-sm font-semibold text-[#2A9D8F]">
                  {card.cta} <span aria-hidden="true">→</span>
                </p>
              </article>
            </Link>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-[#2A9D8F]/20 bg-[#2A9D8F]/8 p-6 dark:border-emerald-400/30 dark:bg-emerald-950/20">
          <h2 className="text-lg font-semibold text-[#10243A] dark:text-slate-100">{t.noteTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[#263238]/70 dark:text-slate-400">{t.note}</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
