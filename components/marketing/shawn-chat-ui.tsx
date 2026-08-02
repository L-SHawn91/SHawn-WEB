"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Shield, Send, LogIn, ExternalLink, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ShawnChatUI() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [authMessage, setAuthMessage] = useState<string>("");
    const [callbackTemplate, setCallbackTemplate] = useState<string>("");

    const authenticateWithToken = async (token: string, source: "manual" | "callback" = "manual") => {
        if (!token.trim()) return false;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token.trim() }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setAuthMessage(`❌ 인증 실패: ${data.error || "unknown"}`);
                setMessages((prev) => [...prev, { role: "system", content: `❌ 인증 실패: ${data.error || "unknown"}` }]);
                return false;
            }
            setIsAuthorized(true);
            setAuthMessage(source === "callback" ? "✅ Telegram 콜백 인증 성공" : "✅ Telegram 인증 성공");
            setMessages((prev) => [...prev, { role: "system", content: "✅ Telegram 인증 성공. 전체 기능 사용 가능" }]);
            return true;
        } catch {
            setAuthMessage("❌ 인증 요청 중 네트워크 오류");
            setMessages((prev) => [...prev, { role: "system", content: "❌ 인증 요청 중 네트워크 오류" }]);
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const authStatus = document.cookie.includes("shawn_auth");
        setIsAuthorized(authStatus);
        setCallbackTemplate(`${window.location.origin}/?shawn_token={JWT_TOKEN}`);

        void fetch('/api/auth/callback-template')
            .then((r) => r.json())
            .then((d) => {
                if (d?.callbackTemplate) setCallbackTemplate(d.callbackTemplate);
            })
            .catch(() => {
                // keep client-side fallback template
            });

        const params = new URLSearchParams(window.location.search);
        const callbackToken = params.get("shawn_token") || params.get("token");
        if (!callbackToken) return;

        void authenticateWithToken(callbackToken, "callback").then((ok) => {
            if (!ok) return;
            params.delete("shawn_token");
            params.delete("token");
            const nextQuery = params.toString();
            const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
            window.history.replaceState({}, "", nextUrl);
            setIsOpen(true);
        });
    }, []);

    const [manualToken, setManualToken] = useState("");

    const handleTelegramLogin = () => {
        const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "shawn_lab_bot";
        window.open(`https://t.me/${botName}`, "_blank");
    };

    const handleTokenAuth = async () => {
        if (!manualToken.trim()) return;
        const ok = await authenticateWithToken(manualToken, "manual");
        if (ok) setManualToken("");
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: "user", content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: input }),
            });
            const data = await res.json();
            setMessages((prev) => [...prev, { role: "brain", content: data.content }]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: "system", content: "❌ 연결 오류가 발생했습니다." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/telegram', { method: 'DELETE' });
        } catch {
            document.cookie = "shawn_auth=; path=/; max-age=0; SameSite=Strict";
        }
        setIsAuthorized(false);
        setMessages(prev => [...prev, { role: "system", content: "🔒 로그아웃되었습니다." }]);
    };

    if (pathname?.startsWith("/invest")) {
        return null;
    }

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-2xl bg-[#d500f9] hover:bg-[#aa00c7] transition-all hover:scale-110 z-[9999]"
            >
                <MessageSquare className="w-6 h-6 text-white" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] flex flex-col shadow-2xl border-[#2c2c2c] bg-[#1e1e1e] text-white animate-in slide-in-from-bottom-5 z-[9999]">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#2c2c2c]">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        🧠 SHawn Brain
                        {isAuthorized ? (
                            <Badge className="bg-[#00e676] text-black text-[10px]">ADMIN</Badge>
                        ) : (
                            <Badge className="bg-[#29b6f6] text-white text-[10px]">GUEST</Badge>
                        )}
                    </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                    {isAuthorized && (
                        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-neutral-400 hover:text-red-400" title="로그아웃">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-neutral-400">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center space-y-4 py-10">
                        <div className="w-12 h-12 bg-[#2c2c2c] rounded-full flex items-center justify-center mx-auto">
                            <Shield className="w-6 h-6 text-[#d500f9]" />
                        </div>
                        <p className="text-xs text-neutral-400">
                            Dr. SHawn의 통합 지능 시스템 (v2.5 Ready)<br />인증된 사용자만 전체 기능을 사용 가능합니다.
                        </p>
                        {!isAuthorized && (
                            <div className="flex flex-col items-center gap-2 w-full px-4">
                                <Button
                                    onClick={handleTelegramLogin}
                                    variant="outline"
                                    className="w-full text-[11px] h-8 border-[#d500f9] text-[#d500f9] hover:bg-[#d500f9] hover:text-white"
                                >
                                    <LogIn className="w-3 h-3 mr-2" /> Telegram 열기
                                </Button>
                                <a
                                    href="https://t.me/shawn_lab_bot"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-200"
                                >
                                    봇 링크 열기 <ExternalLink className="w-3 h-3" />
                                </a>

                                <div className="text-[10px] text-neutral-500">승인 후 받은 JWT 토큰 붙여넣기 (또는 ?shawn_token=... 자동 콜백)</div>
                                <div className="w-full rounded-md border border-neutral-700 bg-[#2a2a2a] p-2 text-[10px] text-neutral-300">
                                    <p className="mb-1 text-neutral-400">콜백 URL 템플릿</p>
                                    <p className="break-all">{callbackTemplate || "(loading...)"}</p>
                                    <Button
                                        variant="ghost"
                                        className="mt-1 h-6 px-2 text-[10px] text-neutral-300 hover:bg-neutral-700"
                                        onClick={async () => {
                                            if (!callbackTemplate) return;
                                            await navigator.clipboard.writeText(callbackTemplate);
                                            setAuthMessage("📋 콜백 URL 템플릿 복사됨");
                                        }}
                                    >
                                        템플릿 복사
                                    </Button>
                                </div>
                                <div className="flex w-full gap-2">
                                    <Input
                                        placeholder="Telegram 승인 토큰"
                                        value={manualToken}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualToken(e.target.value)}
                                        className="h-8 text-[10px] bg-[#2c2c2c] border-neutral-600"
                                    />
                                    <Button onClick={handleTokenAuth} className="h-8 px-3 text-[10px] bg-[#d500f9]">인증</Button>
                                </div>
                                {authMessage ? <p className="text-[10px] text-neutral-300">{authMessage}</p> : null}
                            </div>
                        )}
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[80%] p-3 rounded-2xl text-xs",
                            m.role === "user" ? "bg-[#d500f9] text-white rounded-br-none" : "bg-[#2c2c2c] text-neutral-200 rounded-bl-none"
                        )}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {loading && <div className="text-[10px] text-[#d500f9] animate-pulse">Thinking...</div>}
            </CardContent>

            <CardFooter className="p-4 border-t border-[#2c2c2c]">
                <div className="flex w-full gap-2">
                    <Input
                        placeholder="질문을 입력하세요..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1 h-9 bg-[#2c2c2c] border-none text-xs focus-visible:ring-1 focus-visible:ring-[#d500f9]"
                    />
                    <Button size="icon" onClick={handleSend} className="h-9 w-9 bg-[#d500f9]">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
