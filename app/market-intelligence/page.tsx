"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, FileText, ExternalLink, RefreshCw, TrendingUp, Globe, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReportDetailView, FullJsonReport } from "@/components/market/ReportDetailView";
import { InvestLayout, investUiClass } from "@/components/invest/invest-layout";
import { InvestQuoteKpiCards, InvestQuoteKpiNotice, type QuoteKpiSnapshot } from "@/components/invest/invest-kpi-components";
import { useLanguage } from "@/components/providers/language-provider";

type ReportRequest = {
  date: string;
  path: string;
  json_path?: string;
  title: string;
};

type ReportData = {
  KR: ReportRequest[];
  US: ReportRequest[];
};

function MarketIntelligenceContent() {
  const { language } = useLanguage();
  const isKo = language === "ko";
  const text = {
    title: isKo ? "Market Intelligence" : "Market Intelligence",
    desc: isKo ? "실시간 AI 시장 분석 및 시그널" : "Real-time AI market analysis and signals",
    hub: isKo ? "Invest Hub" : "Invest Hub",
    dashboard: isKo ? "투자 대시보드" : "Investment Dashboard",
    watchFocus: isKo ? "워치리스트 포커스" : "Watchlist Focus",
    refresh: isKo ? "새로고침" : "Refresh",
    archive: isKo ? "아카이브 이동" : "Go to Archive",
    loading: isKo ? "로딩 중..." : "Loading...",
    empty: isKo ? "리포트가 없습니다." : "No reports found.",
    loadMore: isKo ? "더 보기" : "Load more",
    legacy: isKo ? "레거시 HTML 리포트 모드" : "Legacy HTML Report Mode",
    fullWindow: isKo ? "전체 창으로 열기" : "Open in full window",
    selectReport: isKo ? "리포트를 선택하세요" : "Select a report to view details",
  };
  const searchParams = useSearchParams();
  const [indexData, setIndexData] = useState<ReportData>({ KR: [], US: [] });
  const [activeTab, setActiveTab] = useState<"KR" | "US">("KR");
  const [cursor, setCursor] = useState<{ KR: number; US: number }>({ KR: 0, US: 0 });
  const [hasMore, setHasMore] = useState<{ KR: boolean; US: boolean }>({ KR: false, US: false });

  const [selectedReportPath, setSelectedReportPath] = useState<string | null>(null);
  const [reportJsonData, setReportJsonData] = useState<FullJsonReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [quoteKpi, setQuoteKpi] = useState<QuoteKpiSnapshot | null>(null);

  const handleSelectReport = useCallback(async (report: ReportRequest) => {
    setSelectedReportPath(report.path);

    if (report.json_path) {
      setIsLoadingReport(true);
      try {
        const res = await fetch(report.json_path);
        if (res.ok) {
          const jsonData = await res.json();
          setReportJsonData(jsonData);
        } else {
          setReportJsonData(null);
        }
      } catch (e) {
        console.error("Failed to load JSON report", e);
        setReportJsonData(null);
      } finally {
        setIsLoadingReport(false);
      }
    } else {
      setReportJsonData(null);
    }
  }, []);

  const fetchIndex = useCallback(async () => {
    setLoadingIndex(true);
    try {
      const resKR = await fetch(`/api/reports?type=KR&limit=60&offset=0`, { cache: "no-store" });
      const resUS = await fetch(`/api/reports?type=US&limit=60&offset=0`, { cache: "no-store" });
      if (!resKR.ok || !resUS.ok) return;

      const dataKR = await resKR.json();
      const dataUS = await resUS.json();
      const grouped: ReportData = {
        KR: Array.isArray(dataKR.items) ? dataKR.items : [],
        US: Array.isArray(dataUS.items) ? dataUS.items : [],
      };

      setIndexData(grouped);
      setCursor({ KR: grouped.KR.length, US: grouped.US.length });
      setHasMore({ KR: Boolean(dataKR.hasMore), US: Boolean(dataUS.hasMore) });

      const currentList = grouped[activeTab];
      if (currentList.length > 0 && !selectedReportPath) void handleSelectReport(currentList[0]);
    } catch (error) {
      console.error("Failed to load index", error);
    } finally {
      setLoadingIndex(false);
    }
  }, [activeTab, handleSelectReport, selectedReportPath]);

  const fetchQuoteKpi = useCallback(async () => {
    try {
      const res = await fetch("/api/invest/snapshot?mode=balanced", { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as QuoteKpiSnapshot;
      setQuoteKpi(payload);
    } catch (error) {
      console.error("Failed to load quote KPI", error);
    }
  }, []);

  useEffect(() => {
    const tab = String(searchParams.get("tab") || "").toUpperCase();
    if (tab === "KR" || tab === "US") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    void fetchIndex();
    void fetchQuoteKpi();
  }, [fetchIndex, fetchQuoteKpi]);

  const currentList = indexData[activeTab];
  const canLoadMore = hasMore[activeTab];

  const loadMore = useCallback(async () => {
    const offset = cursor[activeTab];
    try {
      const res = await fetch(`/api/reports?type=${activeTab}&limit=60&offset=${offset}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setIndexData((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], ...items],
      }));
      setCursor((prev) => ({ ...prev, [activeTab]: offset + items.length }));
      setHasMore((prev) => ({ ...prev, [activeTab]: Boolean(data.hasMore) }));
    } catch (e) {
      console.error(e);
    }
  }, [activeTab, cursor]);

  return (
    <InvestLayout
      currentTab="reports"
      title={text.title}
      description={text.desc}
      actions={
        <>
          <Link href="/invest" className={investUiClass.actionButton}>
            <ArrowLeft size={14} />
            {text.hub}
          </Link>
          <Link href="/cartridges/invest" className={investUiClass.actionButtonDefault}>
            <TrendingUp size={14} />
            {text.dashboard}
          </Link>
          <Link href="/cartridges/invest?focus=watchlist" className={investUiClass.actionButtonDefault}>
            <TrendingUp size={14} />
            {text.watchFocus}
          </Link>
          <button onClick={fetchIndex} className={investUiClass.actionButtonDefault}>
            <RefreshCw size={14} className={loadingIndex ? "animate-spin" : ""} />
            {text.refresh}
          </button>
          <Link href="/market-intelligence/archive" className={investUiClass.actionButtonPrimary}>
            <FileText size={14} />
            {text.archive}
          </Link>
        </>
      }
    >
      <section className="mb-6">
        <InvestQuoteKpiCards snapshot={quoteKpi || undefined} />
        <InvestQuoteKpiNotice snapshot={quoteKpi || undefined} />
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[560px]">
        <div className="lg:col-span-3 flex flex-col gap-4 h-full">
          <div className="flex p-1 bg-[#2c2c2c] rounded-xl border border-gray-800 shrink-0">
            <button
              onClick={() => setActiveTab("KR")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "KR"
                  ? "bg-[#1e1e1e] text-blue-400 shadow-md border border-gray-700"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <TrendingUp size={16} />
              KR
            </button>
            <button
              onClick={() => setActiveTab("US")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "US"
                  ? "bg-[#1e1e1e] text-green-400 shadow-md border border-gray-700"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Globe size={16} />
              US
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto pr-2 custom-scrollbar ${investUiClass.panel} ${investUiClass.panelInner} ${investUiClass.panelSpace}`}>
            {loadingIndex ? (
              <div className="text-center py-10 text-gray-500 text-sm">{text.loading}</div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">{text.empty}</div>
            ) : (
              <AnimatePresence>
                <div className="space-y-2">
                  {currentList.map((report) => {
                    const isSelected = selectedReportPath === report.path;
                    return (
                      <motion.div
                        key={report.path}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleSelectReport(report)}
                        className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 group ${
                          isSelected
                            ? "bg-[#2c2c2c] border-blue-500/50 shadow-md"
                            : "bg-transparent border-transparent hover:bg-[#2c2c2c] hover:border-gray-700"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3
                              className={`font-semibold text-sm mb-1 line-clamp-1 ${
                                isSelected ? "text-blue-300" : "text-gray-300"
                              }`}
                            >
                              {report.title?.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (KR|US) Market Report/, "Market Report") ||
                                report.date}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar size={12} />
                              {report.date}
                              {report.json_path && (
                                <span className="text-green-500 ml-1 text-[10px] border border-green-900 bg-green-900/20 px-1 rounded">
                                  V2
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {canLoadMore && (
                    <button
                      onClick={loadMore}
                      className={`${investUiClass.actionButtonDefault} w-full mt-2 justify-center`}
                    >
                      {text.loadMore}
                    </button>
                  )}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className={`${investUiClass.panel} lg:col-span-9 border overflow-hidden flex flex-col h-full shadow-2xl relative`}>
          {selectedReportPath ? (
            reportJsonData ? (
              <ReportDetailView data={reportJsonData} loading={isLoadingReport} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="bg-[#2c2c2c] px-4 py-2 flex justify-between items-center border-b border-gray-700 shrink-0">
                  <div className="flex items-center gap-2 text-yellow-500 text-xs">
                    <AlertTriangle size={14} />
                    <span>{text.legacy}</span>
                  </div>
                  <Link
                    href={selectedReportPath}
                    target="_blank"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    <ExternalLink size={12} />
                    {text.fullWindow}
                  </Link>
                </div>
                <iframe src={selectedReportPath} className="w-full flex-1 bg-white" title="Report Viewer" />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>{text.selectReport}</p>
            </div>
          )}
        </div>
      </div>
    </InvestLayout>
  );
}

export default function MarketIntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white">
          <div className="mx-auto max-w-7xl px-6 py-16 text-sm text-gray-400">Loading market intelligence...</div>
        </div>
      }
    >
      <MarketIntelligenceContent />
    </Suspense>
  );
}
