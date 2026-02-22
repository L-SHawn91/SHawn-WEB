"use client";

import { useEffect, useState } from "react";
import { InvestQuoteKpiCards, InvestQuoteKpiNotice, QuoteKpiSnapshot } from "@/components/invest/invest-kpi-components";
import { InvestSignalConfidenceCard } from "@/components/invest/invest-confidence-card";

type HubSnapshot = QuoteKpiSnapshot & {
  signalConfidence?: number;
  updatedAt?: string;
};

export function InvestHubQuoteKpiPanel() {
  const [quoteKpi, setQuoteKpi] = useState<HubSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch("/api/invest/snapshot?mode=balanced", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as HubSnapshot;
        if (!cancelled) {
          setQuoteKpi(payload);
        }
      } catch (error) {
        console.error("Failed to load invest hub quote KPI", error);
      }
    };

    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, 60_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="mb-6 space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-1">
          <InvestSignalConfidenceCard confidence={quoteKpi?.signalConfidence} updatedAt={quoteKpi?.updatedAt} />
        </div>
        <div className="xl:col-span-4">
          <InvestQuoteKpiCards snapshot={quoteKpi || undefined} />
        </div>
      </div>
      <InvestQuoteKpiNotice snapshot={quoteKpi || undefined} />
    </section>
  );
}
