"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Calendar, Search, Clock, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InvestLayout, investUiClass } from "@/components/invest/invest-layout";

interface Report {
  date: string;
  time?: string;
  type: string;
  title: string;
  path: string;
  filename: string;
  timestamp: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 60;
  const quickQueries = ["KR", "US", "MORNING", "SONOLBOT", "GEMINI"];

  const fetchReports = useCallback(async (nextOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(LIMIT));
      params.set("offset", String(nextOffset));
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedDate) params.set("date", selectedDate);

      const res = await fetch(`/api/reports?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load index");
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];

      if (append) {
        setReports((prev) => [...prev, ...items]);
        setFilteredReports((prev) => [...prev, ...items]);
      } else {
        setReports(items);
        setFilteredReports(items);
      }
      setOffset(nextOffset + items.length);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [LIMIT, searchQuery, selectedDate]);

  useEffect(() => {
    void fetchReports(0, false);
  }, [fetchReports]);

  const loadMore = async () => {
    await fetchReports(offset, true);
  };

  return (
    <InvestLayout
      currentTab="archive"
      title="시장 분석 리포트"
      description="Dual Quant System 분석 리포트 아카이브 (날짜/시간별 추적)"
      actions={
        <Link href="/invest" className={investUiClass.actionButton}>
          <ArrowLeft size={14} />
          Invest Hub
        </Link>
      }
    >
      <div className={investUiClass.panel}>
        <div className={investUiClass.panelInner}>
          <div className="sticky top-3 z-20 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 p-4 dark:border-blue-900/40 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Archive Search Dashboard</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">제목/타입 검색 + 날짜 필터</p>
            </div>
            <div className="max-w-4xl mx-auto flex gap-3 flex-col md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="리포트 검색 (제목, 타입 등)..."
                  className="pl-9 bg-white dark:bg-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Input
                type="date"
                className="w-full md:w-auto bg-white dark:bg-slate-900"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDate("");
                }}
                className={`${investUiClass.actionButtonDefault} px-3 py-2`}
              >
                초기화
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSearchQuery(q)}
                  className="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-900/20"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              Total Loaded: <span className="font-semibold">{filteredReports.length}</span>
              {" "}· Has More: <span className="font-semibold">{hasMore ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">리포트를 불러오는 중입니다...</div>
      ) : filteredReports.length === 0 ? (
        <div className={`${investUiClass.panel} ${investUiClass.panelInner} text-center`}>
          <p className="text-lg">검색 결과가 없습니다.</p>
          <p className="text-sm text-muted-foreground mt-2">검색어 또는 날짜를 변경해보세요.</p>
        </div>
      ) : (
        <>
          <div className={`${investUiClass.grid} md:grid-cols-2 lg:grid-cols-3`}>
            {filteredReports.map((report, idx) => (
              <Card
                key={idx}
                className={`${investUiClass.panel} border-primary/25 hover:border-primary transition-colors`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge
                      variant={report.type === 'KR' ? 'secondary' : 'default'}
                      className={`${investUiClass.badge} border`
                      }
                    >
                      {report.type === 'KR' ? '🇰🇷 한국' : '🇺🇸 미국'}
                    </Badge>
                    <div className="flex flex-col items-end text-xs text-muted-foreground font-mono">
                      <span className="flex items-center mb-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {report.date}
                      </span>
                      {report.time && (
                        <span className="flex items-center text-primary/80 font-bold">
                          <Clock className="w-3 h-3 mr-1" />
                          {report.time}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl">
                    {report.type === 'KR' ? '국내 시장 정밀 분석' : '미국 시장 정밀 분석'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.title}</p>
                    <Link href={report.path} target="_blank" className="w-full">
                      <div className="p-3 bg-muted/50 rounded-md group-hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                        <ExternalLink className="w-4 h-4" />
                        리포트 열기
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={loadMore}
                className={`${investUiClass.actionButtonDefault} px-4 py-2`}
              >
                더 보기
              </button>
            </div>
          )}
        </>
      )}
    </InvestLayout>
  );
}
