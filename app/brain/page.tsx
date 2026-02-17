import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";

export default function BrainPageDeprecated() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <h1 className="text-4xl font-bold mb-6 text-yellow-400">⚠️ SHawn-Brain Dashboard Disabled</h1>
        <p className="text-gray-300 mb-4">
          SHawn-WEB에서 SHawn-Brain 연동 기능은 운영 정책에 따라 비활성화되었습니다.
        </p>
        <p className="text-gray-400 mb-10">
          현재는 Market Intelligence / Investment 리포트 중심으로 운영됩니다.
        </p>
        <div className="flex gap-4 flex-wrap">
          <Link href="/market-intelligence" className="px-5 py-3 rounded border border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10">📊 Market Intelligence</Link>
          <Link href="/cartridges/invest" className="px-5 py-3 rounded border border-blue-500/50 text-blue-300 hover:bg-blue-500/10">📈 Investment World</Link>
          <Link href="/" className="px-5 py-3 rounded border border-gray-500/50 text-gray-300 hover:bg-gray-500/10">← Home</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
