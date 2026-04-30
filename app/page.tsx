// i18n-exempt: public landing copy is fixed marketing/search entry copy for now.
import { Footer } from "@/components/ui/footer";
import Link from "next/link";

const quickLinks = [
  {
    href: "/papers",
    title: "Papers Search",
    desc: "Integrated search across PubMed, arXiv, and Semantic Scholar.",
    emoji: "📚",
    accentColor: "#2A9D8F",
  },
  {
    href: "/datasets",
    title: "Datasets Search",
    desc: "Multi-source dataset discovery across NCBI, ENA, and Europe PMC.",
    emoji: "🧪",
    accentColor: "#7B6BA8",
  },
];

export default function Home() {
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

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 lg:px-8 lg:pt-20">
            <div className="text-center">
              <h1 className="bg-gradient-to-r from-[#2A9D8F] to-[#10243A] bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
                Bio
              </h1>
              <p className="mt-4 text-lg text-[#263238] dark:text-slate-200 sm:text-2xl">Bio-first research and operating hub</p>
              <p className="mx-auto mt-4 max-w-3xl text-sm text-[#263238]/70 dark:text-slate-400 sm:text-base">
                A bio-centered operating hub for research, datasets, project workflow, and selective side-lane support.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/papers"
                className="sketch-btn inline-flex items-center border border-[#2A9D8F] bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#238a7e]"
              >
                Search Papers
              </Link>
              <Link
                href="/datasets"
                className="sketch-btn inline-flex items-center border border-[#10243A]/40 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-medium text-[#10243A] dark:text-slate-100 transition hover:bg-[#10243A]/5 dark:hover:bg-slate-800/30"
              >
                Search Datasets
              </Link>
            </div>

            <div className="mt-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quickLinks.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <article
                      className="sketch-card group h-full border-2 border-[#D8DEE6] dark:border-slate-700 bg-white dark:bg-slate-900 p-5 transition hover:border-[#2A9D8F]/50"
                      style={{ borderLeftWidth: '3px', borderLeftColor: item.accentColor }}
                      title={`${item.title}: ${item.desc}`}
                    >
                      <div className="text-2xl">{item.emoji}</div>
                      <h2 className="mt-3 text-base font-semibold text-[#10243A] dark:text-slate-100">{item.title}</h2>
                      <p className="mt-2 text-sm text-[#263238]/70 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
