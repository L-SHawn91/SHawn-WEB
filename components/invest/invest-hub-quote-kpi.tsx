"use client";

import { useEffect, useState } from "react";
import { InvestQuoteKpiCards, InvestQuoteKpiNotice, QuoteKpiSnapshot } from "@/components/invest/invest-kpi-components";

export function InvestHubQuoteKpiPanel() {
  const [quoteKpi, setQuoteKpi] = useState<QuoteKpiSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/invest/snapshot?mode=balanced", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as QuoteKpiSnapshot;
        if (!cancelled) {
          setQuoteKpi(payload);
        }
      } catch (error) {
        console.error("Failed to load invest hub quote KPI", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-6 space-y-2">
      <InvestQuoteKpiCards snapshot={quoteKpi || undefined} />
      <InvestQuoteKpiNotice snapshot={quoteKpi || undefined} />
    </section>
  );
}
