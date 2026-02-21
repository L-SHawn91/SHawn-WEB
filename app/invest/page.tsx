import Link from "next/link";
import { InvestCard, InvestLayout, investUiClass } from "@/components/invest/invest-layout";
import { InvestHubQuoteKpiPanel } from "@/components/invest/invest-hub-quote-kpi";

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
    <InvestLayout
      currentTab="overview"
      title="SHawnbrain · Investment Hub"
      description="투자 관련 페이지를 이 허브에서 통합 탐색합니다. (리포트 허브 + 대시보드 + 아카이브)"
    >
      <InvestHubQuoteKpiPanel />
      <div className={`${investUiClass.grid} md:grid-cols-3`}>
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <InvestCard className="h-full transition-colors hover:border-white/30 hover:bg-zinc-900/75">
              <h2 className="text-xl font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-gray-300">{c.desc}</p>
            </InvestCard>
          </Link>
        ))}
      </div>
    </InvestLayout>
  );
}
