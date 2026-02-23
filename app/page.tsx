import { Footer } from "@/components/ui/footer";
import Link from "next/link";

// i18n-exempt: marketing homepage currently follows legacy copy system.
const quickLinks = [
  {
    href: "/papers",
    title: "Papers Search",
    desc: "PubMed · arXiv · Semantic 통합 검색",
    emoji: "📚",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-400/40",
  },
  {
    href: "/datasets",
    title: "Datasets Search",
    desc: "NCBI · ENA · Europe PMC 외 다중 소스",
    emoji: "🧪",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-400/40",
  },
  {
    href: "/invest",
    title: "Investment Hub",
    desc: "리포트 허브 + 대시보드 + 아카이브",
    emoji: "📈",
    color: "from-amber-500/20 to-orange-500/20 border-amber-400/40",
  },
  {
    href: "/blog",
    title: "Blog",
    desc: "연구/운영/자동화 기록 아카이브",
    emoji: "📝",
    color: "from-violet-500/20 to-fuchsia-500/20 border-violet-400/40",
  },
];

const laneLinks = [
  {
    href: "/cartridges/bio",
    title: "Biology Lane",
    desc: "오가노이드/세포 연구 및 바이오 분석",
    emoji: "🧬",
    color: "text-emerald-300",
  },
  {
    href: "/invest/dashboard",
    title: "Investment Lane",
    desc: "데이터 기반 투자 리서치 워크플로",
    emoji: "💹",
    color: "text-amber-300",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-x-hidden">
      <main className="flex-1">
        <section className="relative">
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <svg className="h-full w-full" viewBox="0 0 1200 800" aria-hidden>
              <defs>
                <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#00b8ff" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ff9f1a" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path d="M 80,160 Q 340,90 620,150 T 1160,180" stroke="url(#flowGradient)" strokeWidth="2" fill="none" />
              <path d="M 120,340 Q 380,280 700,340 T 1180,380" stroke="url(#flowGradient)" strokeWidth="2" fill="none" />
              <path d="M 180,520 Q 480,450 760,520 T 1180,560" stroke="url(#flowGradient)" strokeWidth="2" fill="none" />
            </svg>
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 lg:px-8 lg:pt-20">
            <div className="text-center">
              <h1 className="bg-gradient-to-r from-green-400 via-cyan-400 to-orange-400 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
                SHawn Lab
              </h1>
              <p className="mt-4 text-lg text-gray-300 sm:text-2xl">Bio + Investment + Monetization</p>
              <p className="mx-auto mt-4 max-w-3xl text-sm text-gray-400 sm:text-base">
                연구 검색, 데이터셋 탐색, 시장 리포트를 하나의 화면에서 연결하는 운영 허브입니다.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  <article
                    className={`group h-full rounded-2xl border bg-gradient-to-br p-5 transition hover:scale-[1.02] hover:shadow-lg ${item.color}`}
                    title={`${item.title}: ${item.desc}`}
                  >
                    <div className="text-3xl">{item.emoji}</div>
                    <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm text-gray-300">{item.desc}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          {laneLinks.map((lane) => (
            <Link key={lane.href} href={lane.href}>
              <article className="rounded-2xl border border-white/15 bg-zinc-900/70 p-6 transition hover:border-white/30" title={`${lane.title}: ${lane.desc}`}>
                <div className="text-4xl">{lane.emoji}</div>
                <h3 className={`mt-3 text-2xl font-bold ${lane.color}`}>{lane.title}</h3>
                <p className="mt-2 text-sm text-gray-300">{lane.desc}</p>
              </article>
            </Link>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
