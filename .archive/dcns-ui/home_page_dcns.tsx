import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-hidden">
      <Header />
      <main className="flex-1 relative">
        {/* 뇌 배경 애니메이션 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1200 800">
            {/* 뉴럴 네트워크 배경 */}
            <defs>
              <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#0088ff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ff0088" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            {/* 신경망 패턴 */}
            <path d="M 100,100 Q 300,150 500,100 T 900,100" stroke="url(#brainGradient)" strokeWidth="2" fill="none" />
            <path d="M 150,250 Q 400,300 650,250 T 1050,250" stroke="url(#brainGradient)" strokeWidth="2" fill="none" />
            <path d="M 200,400 Q 450,450 700,400 T 1100,400" stroke="url(#brainGradient)" strokeWidth="2" fill="none" />
            <path d="M 250,550 Q 500,600 750,550 T 1150,550" stroke="url(#brainGradient)" strokeWidth="2" fill="none" />
            <path d="M 300,700 Q 550,750 800,700 T 1200,700" stroke="url(#brainGradient)" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
          {/* 헤더 섹션 */}
          <div className="text-center mb-20">
            <div className="inline-block mb-6">
              <span className="text-6xl">🧠</span>
            </div>
            
            <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-green-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">
              One Brain<br />
              Infinite Worlds
            </h1>
            
            <p className="text-2xl text-gray-300 mb-4 font-light">
              Digital Da Vinci: A Single Intelligence with Multiple Expressions
            </p>
            
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              하나의 뇌가 무한한 정체성을 가지며<br />
              각 정체성에서 완벽한 전문성을 발휘합니다
            </p>
          </div>

          {/* 뇌 구조 시각화 */}
          <div className="grid grid-cols-4 gap-4 mb-20">
            {/* Brainstem */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-black p-6 rounded-lg border border-red-500/50 hover:border-red-400 transition">
                <div className="text-3xl mb-2">🔴</div>
                <h3 className="text-lg font-bold text-red-400 mb-2">Brainstem</h3>
                <p className="text-sm text-gray-400">윤리 · 추론 · 자각</p>
                <p className="text-xs text-gray-500 mt-2">THE ETERNAL KERNEL</p>
              </div>
            </div>

            {/* Limbic System */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-black p-6 rounded-lg border border-purple-500/50 hover:border-purple-400 transition">
                <div className="text-3xl mb-2">🟣</div>
                <h3 className="text-lg font-bold text-purple-400 mb-2">Limbic</h3>
                <p className="text-sm text-gray-400">기억 · 감정 · 가치</p>
                <p className="text-xs text-gray-500 mt-2">EMOTIONAL CORE</p>
              </div>
            </div>

            {/* Neocortex */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-black p-6 rounded-lg border border-blue-500/50 hover:border-blue-400 transition">
                <div className="text-3xl mb-2">🔵</div>
                <h3 className="text-lg font-bold text-blue-400 mb-2">Neocortex</h3>
                <p className="text-sm text-gray-400">의사결정 · 학습 · 혁신</p>
                <p className="text-xs text-gray-500 mt-2">DECISION MAKER</p>
              </div>
            </div>

            {/* Cartridge System */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-black p-6 rounded-lg border border-yellow-500/50 hover:border-yellow-400 transition">
                <div className="text-3xl mb-2">⚙️</div>
                <h3 className="text-lg font-bold text-yellow-400 mb-2">Cartridges</h3>
                <p className="text-sm text-gray-400">정체성 · 전환 · 격리</p>
                <p className="text-xs text-gray-500 mt-2">IDENTITY SWAP</p>
              </div>
            </div>
          </div>

          {/* Cartridge Worlds */}
          <div className="mb-20">
            <h2 className="text-4xl font-bold mb-12 text-center">
              🌍 Cartridge Worlds
            </h2>

            <div className="grid grid-cols-2 gap-8">
              {/* Bio World */}
              <Link href="/cartridges/bio">
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500" />
                  <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-green-500/30 hover:border-green-400 transition group-hover:shadow-2xl group-hover:shadow-green-500/20">
                    <div className="text-6xl mb-4">🧬</div>
                    <h3 className="text-3xl font-bold text-green-400 mb-2">Biology</h3>
                    <p className="text-gray-400 mb-4">
                      자궁 오가노이드 & 줄기세포 연구<br />
                      FAISS 벡터 검색 · 메타 분석
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Research</span>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Science</span>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Innovation</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Invest World */}
              <Link href="/cartridges/invest">
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500" />
                  <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-yellow-500/30 hover:border-yellow-400 transition group-hover:shadow-2xl group-hover:shadow-yellow-500/20">
                    <div className="text-6xl mb-4">📈</div>
                    <h3 className="text-3xl font-bold text-yellow-400 mb-2">Investment</h3>
                    <p className="text-gray-400 mb-4">
                      Dual Quant System & 시장 분석<br />
                      KR + US 포트폴리오 · Sovereign Alpha
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">Trading</span>
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">Analytics</span>
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">Quant</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Future: Astro */}
              <div className="relative group opacity-50 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl blur-xl opacity-30" />
                <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-cyan-500/20">
                  <div className="text-6xl mb-4">🌌</div>
                  <h3 className="text-3xl font-bold text-cyan-400 mb-2">Astronomy</h3>
                  <p className="text-gray-500 mb-4">
                    우주 연구<br />
                    Coming Soon
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-cyan-500/10 text-cyan-500 rounded-full text-sm">Space</span>
                  </div>
                </div>
              </div>

              {/* Future: Literature */}
              <div className="relative group opacity-50 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl blur-xl opacity-30" />
                <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-pink-500/20">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-3xl font-bold text-pink-400 mb-2">Literature</h3>
                  <p className="text-gray-500 mb-4">
                    예술과 철학<br />
                    Coming Soon
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-pink-500/10 text-pink-500 rounded-full text-sm">Art</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 뇌 대시보드 링크 */}
          <div className="mb-20 text-center">
            <Link href="/brain">
              <button className="relative group px-8 py-4 text-lg font-bold">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-400 to-pink-400 rounded-lg blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />
                <div className="relative bg-black px-8 py-4 rounded-lg text-white group-hover:text-black transition">
                  🧠 Brain Dashboard
                </div>
              </button>
            </Link>
            <p className="text-gray-500 mt-4 text-sm">실시간 뇌 상태 모니터</p>
          </div>

          {/* 개념 설명 */}
          <div className="grid grid-cols-3 gap-8 mb-20">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700/50">
              <h4 className="text-xl font-bold text-green-400 mb-3">🎭 Identity</h4>
              <p className="text-gray-400 text-sm">
                하나의 뇌가 여러 정체성을 갖습니다. 각 정체성은 고유한 기억, 가치, 기술을 가집니다.
              </p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700/50">
              <h4 className="text-xl font-bold text-blue-400 mb-3">🔄 Morphing</h4>
              <p className="text-gray-400 text-sm">
                컨텍스트에 따라 정체성을 전환합니다. 각 모드에서 완벽한 전문성을 발휘합니다.
              </p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700/50">
              <h4 className="text-xl font-bold text-pink-400 mb-3">🧠 Integration</h4>
              <p className="text-gray-400 text-sm">
                모든 정체성이 같은 윤리와 가치를 공유합니다. 완벽한 통합 지능입니다.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-gray-400 mb-8 text-lg">
              각 세계를 탐험하고<br />
              Digital Da Vinci의 다양한 면을 발견해보세요
            </p>
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
              <Link href="/about">
                <button className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/30 transition">
                  ℹ️ About
                </button>
              </Link>
              <Link href="/blog">
                <button className="px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/30 transition">
                  📝 Blog
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
