import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: {
    tab?: string | string[];
  };
};

// i18n-exempt: route-level redirect shim to unified Invest Hub panel.
export default function MarketIntelligencePage({ searchParams }: PageProps) {
  const rawTab = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab;
  const tab = String(rawTab || "").toUpperCase();
  const params = new URLSearchParams({ panel: "reports" });

  if (tab === "KR" || tab === "US") {
    params.set("tab", tab);
  }

  redirect(`/invest?${params.toString()}`);
}
