import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, TrendingUp, TrendingDown, Activity, ArrowRight, Brain, AlertCircle, DollarSign, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

// --- Types (Backend Data Structure) ---
export interface ReportMeta {
    market: string;
    date: string;
    time: string;
    timestamp: string;
    avg_score: number;
    buy_count: number;
    sell_count: number;
    high_growth_count: number;
    top_alpha_ticker: string | null;
}

export interface PriceInfo {
    current: number;
    change_pct: number;
    currency: string;
}

export interface FutureValue {
    prediction: string;
    rationale: string;
    is_high_growth: boolean;
}

export interface DiagnosisLayer {
    diagnosis: string;
    detail: string;
    color: string;
}

export interface EnhancedDiagnosis {
    primary: string;
    layers: DiagnosisLayer[];
}

export interface StockReport {
    ticker: string;
    name: string;
    sector: string;
    score: number;
    price_info: PriceInfo;
    future_value: FutureValue;
    enhanced_diagnosis: EnhancedDiagnosis | string; // Can be string for legacy
    stop_loss: number | string;
    short_term: {
        signal: string;
        score: number;
        details: string[];
    } | null;
    long_term: {
        signal: string;
        score: number;
        details: string[];
    } | null;
    badges: string[];
    price_trend?: {
        period?: string;
        points?: number[];
        start?: number;
        end?: number;
    } | null;
}

export interface FullJsonReport {
    meta: ReportMeta;
    reports: StockReport[];
}

interface ReportDetailViewProps {
    data: FullJsonReport | null;
    loading: boolean;
    onDateSelect?: (date: string) => void;
}

const COMPANY_NAME_BY_TICKER: Record<string, string> = {
    AAPL: "Apple",
    NVDA: "NVIDIA",
    MSFT: "Microsoft",
    GOOGL: "Alphabet",
    GOOG: "Alphabet",
    AMZN: "Amazon",
    TSLA: "Tesla",
    AVGO: "Broadcom",
    AMD: "Advanced Micro Devices",
    INTC: "Intel",
    META: "Meta Platforms",
    "005930.KS": "삼성전자",
    "000660.KS": "SK하이닉스",
    "035420.KS": "NAVER",
    "005380.KS": "현대차",
    "373220.KS": "LG에너지솔루션",
    "247540.KQ": "에코프로비엠",
};

function normalizeTicker(ticker?: string): string {
    return String(ticker || "").trim().toUpperCase();
}

function resolveNameByTicker(ticker?: string): string | undefined {
    const key = normalizeTicker(ticker);
    if (!key) return undefined;
    if (COMPANY_NAME_BY_TICKER[key]) return COMPANY_NAME_BY_TICKER[key];
    if (key.endsWith(".KS")) {
        const noSuffix = key.replace(/\.KS$/, "");
        if (COMPANY_NAME_BY_TICKER[noSuffix]) return COMPANY_NAME_BY_TICKER[noSuffix];
    }
    return undefined;
}

function displayInstrument(ticker?: string, name?: string): string {
    const normalizedTicker = String(ticker || "").trim();
    const resolvedName = String(name || "").trim() || resolveNameByTicker(ticker);
    if (!normalizedTicker) return resolvedName || "N/A";
    if (!resolvedName) return normalizedTicker;
    return `${normalizedTicker} · ${resolvedName}`;
}

function buildTrendSeries(report: StockReport): number[] {
    const raw = report.price_trend?.points?.filter((v) => Number.isFinite(v)) || [];
    if (raw.length >= 2) return raw as number[];

    const current = Number(report.price_info?.current || 0);
    const changePct = Number(report.price_info?.change_pct || 0);
    if (!Number.isFinite(current) || current <= 0) return [];
    const prev = current / (1 + changePct / 100);
    const mid = (prev + current) / 2;
    return [prev, mid, current];
}

function renderSparklinePath(values: number[], width = 560, height = 180): string {
    if (values.length < 2) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1e-6);

    return values
        .map((v, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((v - min) / range) * height;
            return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
}

export function ReportDetailView({ data, loading, onDateSelect }: ReportDetailViewProps) {
    const [selectedTicker, setSelectedTicker] = useState<StockReport | null>(null);

    // Filter Logic
    const activeBuys = data?.reports.filter(r => r.score >= 60) || [];
    const watchList = data?.reports.filter(r => r.score < 60) || [];
    const topAlphaLabel = useMemo(() => {
        if (!data?.meta?.top_alpha_ticker) return "N/A";
        const ticker = String(data.meta.top_alpha_ticker).trim();
        const match = data.reports.find((r) => normalizeTicker(r.ticker) === normalizeTicker(ticker));
        return displayInstrument(ticker, match?.name);
    }, [data]);

    if (loading) {
        return <div className="flex h-full items-center justify-center text-gray-500">Loading Report Data...</div>;
    }

    if (!data) {
        return <div className="flex h-full items-center justify-center text-gray-500">No Data Available</div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-100 overflow-hidden">
            {/* 1. Dashboard Header (KPIs) */}
            <div className="p-6 pb-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    title="Top Alpha"
                    value={topAlphaLabel}
                    desc="Highest Score Asset"
                    icon={<TrendingUp className="text-green-400" />}
                    color="border-l-4 border-green-500"
                />
                <KPICard
                    title="Market Sentiment"
                    value={data.meta.avg_score.toFixed(1)}
                    desc="Avg Score (0-100)"
                    icon={<Activity className="text-blue-400" />}
                    color="border-l-4 border-blue-500"
                />
                <KPICard
                    title="Growth Focus"
                    value={data.meta.high_growth_count}
                    desc="High Potential Assets"
                    icon={<Brain className="text-purple-400" />}
                    color="border-l-4 border-purple-500"
                />
            </div>

            <Separator className="bg-gray-800 my-4 mx-6" />

            {/* 2. Main Content Area */}
            <ScrollArea className="flex-1 px-6">
                <div className="space-y-8 pb-10">

                    {/* Active Buy Section */}
                    <SectionHeader title="🟢 Active Alpha (Buy Opportunity)" color="text-green-400" />
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {activeBuys.map((report) => (
                            <ReportItem
                                key={report.ticker}
                                report={report}
                                onClick={() => setSelectedTicker(report)}
                            />
                        ))}
                    </div>

                    {/* Watch List Section */}
                    {watchList.length > 0 && (
                        <>
                            <SectionHeader title="🔴 Risk Management (Watch/Sell)" color="text-red-400" />
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {watchList.map((report) => (
                                    <ReportItem
                                        key={report.ticker}
                                        report={report}
                                        onClick={() => setSelectedTicker(report)}
                                        isWatchList
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* 3. Detail Modal */}
            <Dialog open={!!selectedTicker} onOpenChange={(open) => !open && setSelectedTicker(null)}>
                <DialogContent className="bg-[#252525] text-white border-gray-700 max-w-3xl">
                    {selectedTicker && <DetailModalContent report={selectedTicker} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- Sub Components ---

function KPICard({ title, value, desc, icon, color }: any) {
    return (
        <Card className={`bg-[#2c2c2c] border-gray-700 shadow-lg ${color}`}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{title}</p>
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <div className="p-3 bg-[#1e1e1e] rounded-full opacity-80">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function SectionHeader({ title, color }: { title: string, color: string }) {
    return (
        <h2 className={`text-xl font-bold ${color} border-b border-gray-700 pb-2 mb-4 flex items-center gap-2`}>
            {title}
        </h2>
    );
}

function ReportItem({ report, onClick, isWatchList = false }: { report: StockReport, onClick: () => void, isWatchList?: boolean }) {
    const isKr = report.price_info.currency === 'KRW';
    const currency = isKr ? '₩' : '$';
    const priceStr = report.price_info.current.toLocaleString();
    const changeColor = report.price_info.change_pct >= 0 ? 'text-red-400' : 'text-blue-400'; // KR Standard: Red is up
    // Note: US Standard is Green up, modify logic if needed based on `report.meta.market` prop if available

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-[#2c2c2c] rounded-xl p-4 border border-gray-700 cursor-pointer hover:border-blue-500 transition-colors shadow-md group"
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                            {displayInstrument(report.ticker, report.name)}
                        </span>
                        {report.badges.includes("S-Tier Alpha") && <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">S-TIER</Badge>}
                        {report.badges.includes("Whale Entry") && <Badge className="bg-blue-500 hover:bg-blue-600">WHALE</Badge>}
                    </div>
                    <span className="text-sm text-gray-400">{report.sector}</span>
                </div>
                <div className={`px-3 py-1 rounded-lg font-bold text-lg ${isWatchList ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {report.score.toFixed(0)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="bg-[#252525] p-2 rounded">
                    <span className="text-xs text-gray-500 block mb-1">FUTURE VALUE</span>
                    <span className="font-semibold text-purple-400">{report.future_value.prediction}</span>
                </div>
                <div className="bg-[#252525] p-2 rounded">
                    <span className="text-xs text-gray-500 block mb-1">CURRENT PRICE</span>
                    <div className="flex items-baseline gap-1">
                        <span>{currency}{priceStr}</span>
                        <span className={`text-xs ${changeColor}`}>({report.price_info.change_pct > 0 ? '+' : ''}{report.price_info.change_pct.toFixed(2)}%)</span>
                    </div>
                </div>
            </div>

            {/* AI Diagnosis Snippet (Primary) */}
            <div className="text-xs text-gray-300 line-clamp-2 bg-[#1e1e1e] p-2 rounded border border-dashed border-gray-700">
                {typeof report.enhanced_diagnosis === 'string'
                    ? report.enhanced_diagnosis
                    : report.enhanced_diagnosis.primary}
            </div>
        </motion.div>
    );
}

function DetailModalContent({ report }: { report: StockReport }) {
    const isKr = report.price_info.currency === 'KRW';
    const currency = isKr ? '₩' : '$';
    const trendValues = buildTrendSeries(report);
    const trendPath = renderSparklinePath(trendValues);
    const startValue = trendValues.length ? trendValues[0] : null;
    const endValue = trendValues.length ? trendValues[trendValues.length - 1] : null;
    const trendDeltaPct = startValue && endValue ? ((endValue - startValue) / startValue) * 100 : null;
    const trendPositive = (trendDeltaPct ?? 0) >= 0;
    const diagnosisPrimary = typeof report.enhanced_diagnosis === "string"
        ? report.enhanced_diagnosis
        : report.enhanced_diagnosis?.primary || "분석 데이터 준비 중";
    const shortDetails = report.short_term?.details || [];
    const longDetails = report.long_term?.details || [];
    const detailNarrative = report.future_value?.rationale || "미래 가치 설명 데이터 준비 중";

    return (
        <div className="space-y-6">
            <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                    {displayInstrument(report.ticker, report.name)}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                    Sector: {report.sector}
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1e1e1e] p-4 rounded-xl border border-gray-700">
                    <span className="text-sm text-gray-500 mb-1 block">Alpha Score</span>
                    <span className="text-3xl font-bold text-blue-400">{report.score.toFixed(1)}</span>
                </div>
                <div className="bg-[#1e1e1e] p-4 rounded-xl border border-gray-700">
                    <span className="text-sm text-gray-500 mb-1 block">Target Price / Stop Loss</span>
                    <div className="flex flex-col">
                        <span className="text-sm text-purple-400 font-semibold">{report.future_value.prediction}</span>
                        <span className="text-xs text-red-400">Stop: {report.stop_loss}</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#1e1e1e] p-4 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                        <BarChart2 size={16} /> 주가 변화 추이
                    </h3>
                    <span className={`text-sm font-semibold ${trendPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {trendDeltaPct !== null ? `${trendDeltaPct >= 0 ? "+" : ""}${trendDeltaPct.toFixed(2)}%` : "N/A"}
                    </span>
                </div>
                {trendPath ? (
                    <svg viewBox="0 0 560 180" className="w-full h-36 rounded bg-[#141414] border border-gray-800">
                        <defs>
                            <linearGradient id="trendStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={trendPositive ? "#22c55e" : "#fb7185"} />
                                <stop offset="100%" stopColor={trendPositive ? "#34d399" : "#f43f5e"} />
                            </linearGradient>
                        </defs>
                        <path d={trendPath} fill="none" stroke="url(#trendStroke)" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                ) : (
                    <div className="text-sm text-gray-400 py-6">추이 데이터가 아직 수집되지 않았습니다.</div>
                )}
                <div className="mt-2 flex justify-between text-xs text-gray-400">
                    <span>Start: {startValue ? `${currency}${startValue.toLocaleString()}` : "N/A"}</span>
                    <span>End: {endValue ? `${currency}${endValue.toLocaleString()}` : "N/A"}</span>
                </div>
            </div>

            <div className="bg-[#1e1e1e] p-4 rounded-xl border border-gray-700 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle size={16} /> 상세 설명
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">{diagnosisPrimary}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{detailNarrative}</p>
            </div>

            {/* Neural Diagnosis (Layers) */}
            <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                    <Brain size={16} /> Neural Diagnosis
                </h3>
                <div className="space-y-2">
                    {typeof report.enhanced_diagnosis === 'object' ? (
                        (report.enhanced_diagnosis.layers || []).map((layer, idx) => (
                            <div key={idx} className="bg-[#1e1e1e] p-3 rounded-lg border-l-2" style={{ borderLeftColor: layer.color }}>
                                <div className="font-semibold text-sm mb-1" style={{ color: layer.color }}>{layer.diagnosis}</div>
                                <div className="text-xs text-gray-400">{layer.detail}</div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400">{report.enhanced_diagnosis}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500">SHORT TERM Factors</h4>
                    <div className="flex flex-wrap gap-2">
                        {shortDetails.map((d, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-gray-600">{d}</Badge>
                        ))}
                        {shortDetails.length === 0 && (
                            <span className="text-xs text-gray-500">단기 팩터 데이터 준비 중</span>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500">LONG TERM Factors</h4>
                    <div className="flex flex-wrap gap-2">
                        {longDetails.map((d, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-gray-600 bg-gray-800">{d}</Badge>
                        ))}
                        {longDetails.length === 0 && (
                            <span className="text-xs text-gray-500">장기 팩터 데이터 준비 중</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
