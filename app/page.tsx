import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-hidden">
      <Header />
      <main className="flex-1 relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1200 800">
            <defs>
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ff88" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#00b8ff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ff9f1a" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            <path d="M 120,140 Q 320,90 520,140 T 920,140" stroke="url(#flowGradient)" strokeWidth="2" fill="none" />
            <path d="M 180,300 Q 420,250 660,300 T 1060,300" stroke="url(#flowGradient)" strokeWidth="2" fill="none" />
            <path d="M 240,460 Q 480,410 720,460 T 1120,460" stroke="url(#flowGradient)" strokeWidth="2" fill="none" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 via-cyan-400 to-orange-400 bg-clip-text text-transparent">
              SHawn Lab
            </h1>
            <p className="text-2xl text-gray-300 mb-4 font-light">
              Bio + Investment + Monetization
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              실험 인사이트, 시장 리포트, 수익화 콘텐츠를 하나의 운영 흐름으로 관리합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <Link href="/cartridges/bio">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl blur-xl opacity-40 group-hover:opacity-80 transition duration-500" />
                <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-green-500/30 hover:border-green-400 transition">
                  <div className="text-5xl mb-4">🧬</div>
                  <h2 className="text-3xl font-bold text-green-400 mb-3">Biology</h2>
                  <p className="text-gray-400">오가노이드/세포 연구와 바이오 인사이트 아카이브.</p>
                </div>
              </div>
            </Link>

            <Link href="/cartridges/invest">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl blur-xl opacity-40 group-hover:opacity-80 transition duration-500" />
                <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-yellow-500/30 hover:border-yellow-400 transition">
                  <div className="text-5xl mb-4">📈</div>
                  <h2 className="text-3xl font-bold text-yellow-400 mb-3">Investment</h2>
                  <p className="text-gray-400">KR/US 자동 리포트와 시장 인텔리전스 허브.</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="text-center">
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/market-intelligence">
                <button className="px-6 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-500/30 transition">
                  📊 Market Intelligence
                </button>
              </Link>
              <Link href="/blog">
                <button className="px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/30 transition">
                  📝 Blog
                </button>
              </Link>
              <Link href="/brain">
                <button className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/50 hover:border-green-400 hover:bg-green-500/30 transition">
                  ⚙️ Control Dashboard
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
