import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: {
    focus?: string | string[];
    market?: string | string[];
    symbol?: string | string[];
  };
};

// i18n-exempt: route-level redirect shim to unified Invest Hub panel.
export default function InvestDashboardLegacyPage({ searchParams }: PageProps) {
  const rawFocus = Array.isArray(searchParams?.focus) ? searchParams?.focus[0] : searchParams?.focus;
  const rawMarket = Array.isArray(searchParams?.market) ? searchParams?.market[0] : searchParams?.market;
  const rawSymbol = Array.isArray(searchParams?.symbol) ? searchParams?.symbol[0] : searchParams?.symbol;

  const params = new URLSearchParams();
  if (rawFocus) params.set("focus", rawFocus);
  if (rawMarket) params.set("market", rawMarket);
  if (rawSymbol) params.set("symbol", rawSymbol);

  redirect(`/invest/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
}
