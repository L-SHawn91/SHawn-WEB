import Link from "next/link";
import { InvestShell } from "@/components/invest/invest-shell";

const cards = [
  {
    href: "/market-intelligence",
    title: "Market Intelligence",
    desc: "리포트 피드/아카이브 중심 (기본 허브)",
  },
  {
    href: "/cartridges/invest",
    title: "Investment Dashboard",
    desc: "시그널/리밸런싱/포트폴리오 의사결정",
  },
  {
    href: "/market-intelligence/archive",
    title: "Report Archive",
    desc: "날짜별 히스토리 리포트 조회",
  },
];

export default function InvestHubPage() {
  return (
    <InvestShell currentTab="overview">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-bold md:text-3xl">SHawnbrain · Investment Hub</h1>
        <p className="mt-2 text-sm text-gray-300">
          투자 관련 페이지를 이 허브에서 통합 탐색합니다. (리포트 허브 + 대시보드 + 아카이브)
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-white/15 bg-zinc-900/70 p-4 hover:border-white/30 sm:p-5"
            >
              <h2 className="text-xl font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-gray-300">{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </InvestShell>
  );
}
