
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Instagram, FileText, Sparkles } from "lucide-react";

export default function ContentDashboard() {
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleGenerate = async () => {
        if (loading) return;
        setLoading(true);
        setResult(null);
        try {
            const response = await fetch("/api/content/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "quote", topic: topic, style: "sovereign" })
            });
            const data = await response.json();
            setResult(data);
        } catch (err) {
            setResult({ success: false, error: "Network Error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-6 lg:p-12 font-sans selection:bg-[#00ff9f] selection:text-black">
            {/* Header */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#00ff9f]/20 rounded-lg">
                            <Sparkles className="w-6 h-6 text-[#00ff9f]" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#00ff9f] via-[#00d9ff] to-[#bc13fe] bg-clip-text text-transparent">
                            SHawn Content Studio
                        </h1>
                    </div>
                    <p className="text-gray-400 font-medium">Sovereign Alpha Design System • Content Automation</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="border-gray-800 hover:bg-gray-900 text-gray-400">
                        Library
                    </Button>
                    <Button className="bg-white hover:bg-gray-200 text-black font-bold px-8">
                        Publish All
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10">

                {/* Left: Input & Controls (4 Cols) */}
                <div className="xl:col-span-4 space-y-8">
                    <Card className="bg-[#1a1a1a] border-gray-800 p-8 rounded-3xl shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#00ff9f]">
                            <span className="w-1.5 h-6 bg-[#00ff9f] rounded-full"></span>
                            IDEATION
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Topic Context</label>
                                <Input
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="bg-[#0f0f0f] border-gray-800 h-14 text-lg focus:ring-1 focus:ring-[#00ff9f] transition-all"
                                    placeholder="Enter your theme..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button className="p-4 rounded-2xl bg-[#00ff9f]/10 border border-[#00ff9f]/30 text-[#00ff9f] text-sm font-bold transition-all hover:bg-[#00ff9f]/20">
                                    Instagram
                                </button>
                                <button className="p-4 rounded-2xl bg-gray-900 border border-gray-800 text-gray-500 text-sm font-bold hover:text-white transition-all">
                                    Blog / MDX
                                </button>
                            </div>

                            <Button
                                onClick={handleGenerate}
                                className="w-full bg-[#00ff9f] hover:bg-[#00e68e] text-black font-black h-16 rounded-2xl text-lg shadow-lg shadow-[#00ff9f]/10"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "GENERATE ASSETS"}
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-[#1a1a1a] border-gray-800 p-6 rounded-3xl overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#bc13fe]/5 to-transparent"></div>
                        <h3 className="text-sm font-bold text-gray-400 mb-4 relative z-10 uppercase tracking-widest">Global Status</h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Core Engine</span>
                                <span className="text-[#00ff9f] font-mono">STABLE v1.2</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">GPU Synthesis</span>
                                <span className="text-[#00d9ff] font-mono">READY</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right: Dynamic Preview (8 Cols) */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Instagram Preview Card */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <Instagram className="w-4 h-4" /> Instagram Visual
                            </div>
                            <div className="aspect-square bg-[#1e1e1e] rounded-[40px] border border-gray-800 p-10 flex flex-col justify-center items-center relative overflow-hidden group shadow-2xl">
                                {/* Sovereign Alpha Background Simulation */}
                                <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#00d9ff]/10 blur-[100px] rounded-full"></div>
                                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#bc13fe]/10 blur-[100px] rounded-full"></div>

                                {/* L-Shape Accents */}
                                <div className="absolute top-8 left-8 w-10 h-10 border-t-2 border-l-2 border-[#00ff9f]/50"></div>
                                <div className="absolute bottom-8 right-8 w-10 h-10 border-b-2 border-r-2 border-[#00ff9f]/50"></div>

                                <div className="relative z-10 text-center space-y-4">
                                    <h4 className="text-2xl font-bold leading-tight text-white line-clamp-4">
                                        {topic || "당신의 통찰이 현실이 되는 순간"}
                                    </h4>
                                    <div className="w-12 h-0.5 bg-[#00ff9f] mx-auto opacity-50"></div>
                                    <p className="text-sm text-gray-400 font-medium">@dr.shawn | SHawn Lab</p>
                                </div>

                                {loading && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                                        <Loader2 className="w-10 h-10 animate-spin text-[#00ff9f]" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Blog / MDX Preview */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <FileText className="w-4 h-4" /> MDX Structure
                            </div>
                            <div className="aspect-square bg-[#1a1a1a] rounded-[40px] border border-gray-800 p-8 flex flex-col gap-4 font-mono text-[10px] text-gray-500 shadow-xl overflow-hidden">
                                <div className="p-4 bg-black/40 rounded-xl space-y-1">
                                    <p className="text-[#bc13fe]">---</p>
                                    <p>title: <span className="text-[#00ff9f]">&quot;{topic || 'Untitled Post'}&quot;</span></p>
                                    <p>date: {new Date().toISOString().split('T')[0]}</p>
                                    <p>category: &quot;research&quot;</p>
                                    <p>featured: true</p>
                                    <p className="text-[#bc13fe]">---</p>
                                </div>
                                <div className="space-y-3 p-2">
                                    <div className="h-4 w-3/4 bg-gray-800 rounded"></div>
                                    <div className="h-2 w-full bg-gray-900 rounded"></div>
                                    <div className="h-2 w-5/6 bg-gray-900 rounded"></div>
                                    <div className="h-2 w-4/6 bg-gray-900 rounded"></div>
                                    <div className="pt-4 flex gap-2">
                                        <div className="h-10 w-10 bg-gray-800 rounded-lg"></div>
                                        <div className="space-y-2 flex-1 pt-1">
                                            <div className="h-2 w-full bg-gray-900 rounded"></div>
                                            <div className="h-2 w-3/4 bg-gray-900 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                                {loading && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center"></div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Results Log */}
                    {result && (
                        <Card className={`p-8 rounded-3xl border-none transition-all ${result.success ? "bg-[#00ff9f]/5" : "bg-red-500/5"}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-2xl ${result.success ? "bg-[#00ff9f]/20 text-[#00ff9f]" : "bg-red-500/20 text-red-500"}`}>
                                    {result.success ? <Sparkles /> : "!"}
                                </div>
                                <div>
                                    <p className={`font-bold text-lg ${result.success ? "text-[#00ff9f]" : "text-red-500"}`}>
                                        {result.success ? "SYNTESIS COMPLETE" : "PROCESS ERROR"}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-2 font-mono">
                                        {result.success ? `FILE_URI: ${result.path}` : `LOG: ${result.error}`}
                                    </p>
                                    {result.success && (
                                        <Button size="sm" className="mt-4 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold tracking-tighter uppercase px-4">
                                            Open Artifact
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

            </main>

            <footer className="max-w-7xl mx-auto mt-20 pt-8 border-t border-gray-900 text-center">
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">© 2026 SHawn Lab • Digital Alpha Ecosystem</p>
            </footer>
        </div>
    );
}
