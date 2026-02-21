"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, FileText, ExternalLink, RefreshCw, TrendingUp, Globe, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ReportDetailView, FullJsonReport } from "@/components/market/ReportDetailView";

type ReportRequest = {
    date: string;
    path: string; // Original HTML path
    json_path?: string; // New JSON data path
    title: string;
};

type ReportData = {
    KR: ReportRequest[];
    US: ReportRequest[];
};

export default function MarketIntelligencePage() {
    const [indexData, setIndexData] = useState<ReportData>({ KR: [], US: [] });
    const [activeTab, setActiveTab] = useState<"KR" | "US">("KR");
    const [cursor, setCursor] = useState<{ KR: number; US: number }>({ KR: 0, US: 0 });
    const [hasMore, setHasMore] = useState<{ KR: boolean; US: boolean }>({ KR: false, US: false });

    // Selected Report State
    const [selectedReportPath, setSelectedReportPath] = useState<string | null>(null);
    const [reportJsonData, setReportJsonData] = useState<FullJsonReport | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [loadingIndex, setLoadingIndex] = useState(true);

    // Handle Report Selection
    const handleSelectReport = useCallback(async (report: ReportRequest) => {
        setSelectedReportPath(report.path);

        // If JSON data exists, load it
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
            // Legacy report (HTML only) -> ReportDetailView handles null data or we show iframe
            setReportJsonData(null);
        }
    }, []);

    // Fetch the list of reports
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

    useEffect(() => {
        void fetchIndex();
    }, [fetchIndex]);

    const currentList = indexData[activeTab];
    const canLoadMore = hasMore[activeTab];

    const loadMore = useCallback(async () => {
        const offset = cursor[activeTab];
        try {
            const res = await fetch(`/api/reports?type=${activeTab}&limit=60&offset=${offset}`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];
            setIndexData(prev => ({
                ...prev,
                [activeTab]: [...prev[activeTab], ...items],
            }));
            setCursor(prev => ({ ...prev, [activeTab]: offset + items.length }));
            setHasMore(prev => ({ ...prev, [activeTab]: Boolean(data.hasMore) }));
        } catch (e) {
            console.error(e);
        }
    }, [activeTab, cursor]);

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-white p-4 md:p-8 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#2c2c2c] pb-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-1">
                            Market Intelligence
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Real-time AI Market Analysis & Sovereign Alpha Signals
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-3">
                        <Link
                            href="/cartridges/invest"
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#2c2c2c] hover:bg-[#3c3c3c] rounded-lg transition-colors text-xs text-gray-300 border border-gray-700"
                        >
                            <TrendingUp size={14} />
                            Investment Dashboard
                        </Link>
                        <button
                            onClick={fetchIndex}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#2c2c2c] hover:bg-[#3c3c3c] rounded-lg transition-colors text-xs text-gray-300 border border-gray-700"
                        >
                            <RefreshCw size={14} className={loadingIndex ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <Link
                            href="/market-intelligence/archive"
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-xs text-white font-medium"
                        >
                            <FileText size={14} />
                            Go to Archive
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">

                    {/* Sidebar / List */}
                    <div className="lg:col-span-3 flex flex-col gap-4 h-full">

                        {/* Tabs */}
                        <div className="flex p-1 bg-[#2c2c2c] rounded-xl border border-gray-800 shrink-0">
                            <button
                                onClick={() => setActiveTab("KR")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "KR"
                                    ? "bg-[#1e1e1e] text-blue-400 shadow-md border border-gray-700"
                                    : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                <TrendingUp size={16} />
                                KR
                            </button>
                            <button
                                onClick={() => setActiveTab("US")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "US"
                                    ? "bg-[#1e1e1e] text-green-400 shadow-md border border-gray-700"
                                    : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                <Globe size={16} />
                                US
                            </button>
                        </div>

                        {/* Report List */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-[#252525] rounded-xl border border-[#2c2c2c] p-2">
                            {loadingIndex ? (
                                <div className="text-center py-10 text-gray-500 text-sm">Loading...</div>
                            ) : currentList.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 text-sm">
                                    No reports found.
                                </div>
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
                                                    className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 group ${isSelected
                                                        ? "bg-[#2c2c2c] border-blue-500/50 shadow-md"
                                                        : "bg-transparent border-transparent hover:bg-[#2c2c2c] hover:border-gray-700"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className={`font-semibold text-sm mb-1 line-clamp-1 ${isSelected ? "text-blue-300" : "text-gray-300"
                                                                }`}>
                                                                {report.title?.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (KR|US) Market Report/, "Market Report") || report.date}
                                                            </h3>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <Calendar size={12} />
                                                                {report.date}
                                                                {report.json_path && <span className="text-green-500 ml-1 text-[10px] border border-green-900 bg-green-900/20 px-1 rounded">V2</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        {canLoadMore && (
                                            <button
                                                onClick={loadMore}
                                                className="w-full mt-2 py-2 text-xs rounded-lg border border-gray-700 bg-[#1e1e1e] text-gray-300 hover:bg-[#2c2c2c] transition-colors"
                                            >
                                                Load more
                                            </button>
                                        )}
                                    </div>
                                </AnimatePresence>
                            )}
                        </div>
                    </div>

                    {/* Viewer */}
                    <div className="lg:col-span-9 bg-[#252525] rounded-2xl border border-[#2c2c2c] overflow-hidden flex flex-col h-full shadow-2xl relative">
                        {selectedReportPath ? (
                            reportJsonData ? (
                                // Modern JSON View
                                <ReportDetailView
                                    data={reportJsonData}
                                    loading={isLoadingReport}
                                />
                            ) : (
                                // Legacy HTML Iframe Fallback
                                <div className="flex flex-col h-full">
                                    <div className="bg-[#2c2c2c] px-4 py-2 flex justify-between items-center border-b border-gray-700 shrink-0">
                                        <div className="flex items-center gap-2 text-yellow-500 text-xs">
                                            <AlertTriangle size={14} />
                                            <span>Legacy HTML Report Mode</span>
                                        </div>
                                        <Link
                                            href={selectedReportPath}
                                            target="_blank"
                                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                                        >
                                            <ExternalLink size={12} />
                                            Full Window
                                        </Link>
                                    </div>
                                    <iframe
                                        src={selectedReportPath}
                                        className="w-full flex-1 bg-white" // HTML reports have their own dark mode but white base bg in iframe can be safer
                                        title="Report Viewer"
                                    />
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <FileText size={48} className="mb-4 opacity-20" />
                                <p>Select a report to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
