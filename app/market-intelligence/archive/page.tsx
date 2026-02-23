import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: {
    q?: string | string[];
    date?: string | string[];
  };
};

// i18n-exempt: route-level redirect shim to unified Invest Hub panel.
export default function MarketArchivePage({ searchParams }: PageProps) {
  const rawQ = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const rawDate = Array.isArray(searchParams?.date) ? searchParams?.date[0] : searchParams?.date;
  const params = new URLSearchParams({ panel: "archive" });

  if (rawQ) params.set("q", rawQ);
  if (rawDate) params.set("date", rawDate);

  redirect(`/invest?${params.toString()}`);
}
