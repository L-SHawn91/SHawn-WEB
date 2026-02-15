'use client';

import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";
import { useBrainStatus, useCartridgeSwitch, ConnectionState } from "@/lib/brain-client";
import { useEffect, useState } from "react";

export default function BrainDashboard() {
  const { status, connected, connectionState } = useBrainStatus();
  const { activeCartridge, switchCartridge } = useCartridgeSwitch();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Stop loading after 2 seconds or when status arrives
    const timer = setTimeout(() => setIsLoading(false), 2000);
    if (status) setIsLoading(false);
    return () => clearTimeout(timer);
  }, [status]);

  // Fallback values when not connected
  const brainStatus = status || {
    brainstem: {
      ethics: 100,
      ethics_status: "✅ All actions validated",
      reasoning: 85,
      reasoning_status: "Evidence-based reasoning active",
      awareness: 90,
      awareness_status: "Monitoring knowledge gaps"
    },
    limbic: {
      memory: 75,
      memory_status: "FAISS vectorized memory online",
      emotion: 70,
      emotion_status: "Neutral-Positive",
      values: 85,
      values_status: "Core ethics engaged"
    },
    neocortex: {
      decision_making: 88,
      decision_status: "Strategic planning mode",
      learning: 75,
      learning_status: "Adaptive learning active",
      innovation: 82,
      innovation_status: "Cross-domain synthesis enabled"
    },
    cartridge: {
      active: activeCartridge,
      status: `🧬 ${activeCartridge} world active`,
      available: ["biology", "investment", "astronomy", "literature"]
    },
    overall_health: 82.5,
    system_status: "OPERATIONAL"
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        {/* Connection Status Badge */}
        <div className="mb-8 flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
            connected ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
            {connected ? 'Live Connection' : 'Disconnected'}
          </div>
          <div className="text-sm text-gray-400">
            {connectionState !== ConnectionState.CONNECTED && (
              <span>{connectionState}</span>
            )}
          </div>
        </div>

        {/* 제목 */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-4">
            🧠 Brain Dashboard
            {isLoading && <span className="text-lg animate-pulse">⏳ Connecting...</span>}
            {connected && <span className="text-lg">✅ Live</span>}
          </h1>
          <p className="text-gray-400">
            Digital Da Vinci의 신경 시스템을 실시간으로 모니터합니다
          </p>
        </div>

        {/* 뇌의 4가지 구성 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Brainstem */}
          <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/50 rounded-xl p-8 transition-all hover:border-red-400/80">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl">🔴</span>
              <div>
                <h2 className="text-2xl font-bold text-red-400">Brainstem</h2>
                <p className="text-gray-400">THE ETERNAL KERNEL</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/50 p-4 rounded-lg border border-red-500/20 hover:border-red-500/50 transition">
                <h3 className="text-sm font-bold text-red-400 mb-2">윤리 검증</h3>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                      style={{width: `${brainStatus.brainstem.ethics}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-green-400 font-bold">{brainStatus.brainstem.ethics}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {brainStatus.brainstem.ethics_status}
                </p>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-red-500/20 hover:border-red-500/50 transition">
                <h3 className="text-sm font-bold text-red-400 mb-2">추론 엔진</h3>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{width: `${brainStatus.brainstem.reasoning}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-blue-400 font-bold">{brainStatus.brainstem.reasoning}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {brainStatus.brainstem.reasoning_status}
                </p>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-red-500/20 hover:border-red-500/50 transition">
                <h3 className="text-sm font-bold text-red-400 mb-2">자각 모니터</h3>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                      style={{width: `${brainStatus.brainstem.awareness}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-purple-400 font-bold">{brainStatus.brainstem.awareness}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {brainStatus.brainstem.awareness_status}
                </p>
              </div>
            </div>
          </div>

          {/* Limbic System */}
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-xl p-8 transition-all hover:border-purple-400/80">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl">🟣</span>
              <div>
                <h2 className="text-2xl font-bold text-purple-400">Limbic System</h2>
                <p className="text-gray-400">EMOTIONAL CORE</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/50 p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition">
                <h3 className="text-sm font-bold text-purple-400 mb-2">기억 저장소</h3>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                      style={{width: `${brainStatus.limbic.memory}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-purple-400 font-bold">{brainStatus.limbic.memory}%</span>
                </div>
                <p className="text-sm text-gray-400">
                  {brainStatus.limbic.memory_status}
                </p>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition">
                <h3 className="text-sm font-bold text-purple-400 mb-2">감정 상태</h3>
                <p className="text-sm text-gray-400">
                  현재: <span className="text-green-400">{brainStatus.limbic.emotion_status}</span>
                </p>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition">
                <h3 className="text-sm font-bold text-purple-400 mb-2">가치 체계</h3>
                <p className="text-sm text-gray-400">
                  {brainStatus.limbic.values_status}
                </p>
              </div>
            </div>
          </div>

          {/* Neocortex */}
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/50 rounded-xl p-8 transition-all hover:border-blue-400/80">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl">🔵</span>
              <div>
                <h2 className="text-2xl font-bold text-blue-400">Neocortex</h2>
                <p className="text-gray-400">DECISION MAKER</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/50 p-4 rounded-lg border border-blue-500/20 hover:border-blue-500/50 transition">
                <h3 className="text-sm font-bold text-blue-400 mb-2">의사결정 수준</h3>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{width: `${brainStatus.neocortex.decision_making}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-blue-400 font-bold">{brainStatus.neocortex.decision_making}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{brainStatus.neocortex.decision_status}</p>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-blue-500/20 hover:border-blue-500/50 transition">
                <h3 className="text-sm font-bold text-blue-400 mb-2">학습 곡선</h3>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                      style={{width: `${brainStatus.neocortex.learning}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-green-400 font-bold">{brainStatus.neocortex.learning}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{brainStatus.neocortex.learning_status}</p>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-blue-500/20 hover:border-blue-500/50 transition">
                <h3 className="text-sm font-bold text-blue-400 mb-2">혁신 능력</h3>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-500" 
                      style={{width: `${brainStatus.neocortex.innovation}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-yellow-400 font-bold">{brainStatus.neocortex.innovation}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{brainStatus.neocortex.innovation_status}</p>
              </div>
            </div>
          </div>

          {/* Cartridge System */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/50 rounded-xl p-8 transition-all hover:border-yellow-400/80">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl">⚙️</span>
              <div>
                <h2 className="text-2xl font-bold text-yellow-400">Cartridge System</h2>
                <p className="text-gray-400">IDENTITY SWAP</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/50 p-4 rounded-lg border border-yellow-500/20 hover:border-yellow-500/50 transition">
                <h3 className="text-sm font-bold text-yellow-400 mb-2">활성 정체성</h3>
                <p className="text-sm text-green-400 font-bold">🧬 {brainStatus.cartridge.active}</p>
                <p className="text-xs text-gray-500">{brainStatus.cartridge.status}</p>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-yellow-500/20 hover:border-yellow-500/50 transition">
                <h3 className="text-sm font-bold text-yellow-400 mb-2">사용 가능한 Cartridge</h3>
                <div className="space-y-2">
                  {brainStatus.cartridge.available.map((cartridge) => (
                    <button
                      key={cartridge}
                      onClick={() => switchCartridge(cartridge)}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition flex items-center justify-between ${
                        activeCartridge === cartridge
                          ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
                          : 'bg-gray-800/30 border border-gray-700/30 text-gray-400 hover:bg-gray-700/30'
                      }`}
                    >
                      <span>
                        {cartridge === 'biology' && '🧬 Biology'}
                        {cartridge === 'investment' && '📈 Investment'}
                        {cartridge === 'astronomy' && '🌌 Astronomy'}
                        {cartridge === 'literature' && '📚 Literature'}
                      </span>
                      {activeCartridge === cartridge && <span>✅</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-yellow-500/20 hover:border-yellow-500/50 transition">
                <h3 className="text-sm font-bold text-yellow-400 mb-2">정체성 전환</h3>
                <p className="text-xs text-gray-400">
                  모든 정체성이 완벽히 격리되어 독립적으로 동작합니다
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 상태 */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">📊 System Status</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/50 p-4 rounded-lg hover:bg-black/70 transition">
              <p className="text-gray-500 text-sm mb-2">Overall Health</p>
              <p className="text-2xl font-bold text-green-400">{brainStatus.overall_health}%</p>
            </div>
            <div className="bg-black/50 p-4 rounded-lg hover:bg-black/70 transition">
              <p className="text-gray-500 text-sm mb-2">System Status</p>
              <p className="text-2xl font-bold text-green-400">{brainStatus.system_status}</p>
            </div>
            <div className="bg-black/50 p-4 rounded-lg hover:bg-black/70 transition">
              <p className="text-gray-500 text-sm mb-2">WebSocket</p>
              <p className={`text-2xl font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
                {connected ? '✅ Connected' : '❌ Offline'}
              </p>
            </div>
            <div className="bg-black/50 p-4 rounded-lg hover:bg-black/70 transition">
              <p className="text-gray-500 text-sm mb-2">Live Updates</p>
              <p className="text-2xl font-bold text-blue-400">{connected ? 'Live' : 'Cached'}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">각 세계로 입장하세요</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/cartridges/bio">
              <button className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/50 hover:border-green-400 hover:bg-green-500/30 transition">
                🧬 Biology World
              </button>
            </Link>
            <Link href="/cartridges/invest">
              <button className="px-6 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-500/30 transition">
                📈 Investment World
              </button>
            </Link>
            <Link href="/">
              <button className="px-6 py-3 bg-gray-500/20 text-gray-400 rounded-lg border border-gray-500/50 hover:border-gray-400 hover:bg-gray-500/30 transition">
                ← 돌아가기
              </button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
