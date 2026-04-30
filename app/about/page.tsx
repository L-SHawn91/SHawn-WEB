export default function AboutPage() {
    return (
        <div className="space-y-12 py-12">
            {/* Hero Section */}
            <section className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">SHawn Lab 소개</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    바이오 연구 중심의 논문·데이터셋 검색 플랫폼입니다.
                </p>
            </section>

            {/* PI Profile */}
            <section className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-8 md:p-12 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 md:w-48 md:h-48 relative rounded-full overflow-hidden border-4 border-white shadow-lg shrink-0">
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            User
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-primary mb-2">Dr. SHawn</h2>
                        <p className="text-secondary font-medium mb-4">연구 책임자</p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            단일세포 전사체학 및 자궁내막 오가노이드를 중심으로 다종 비교 트랜스크립토믹스 연구를 수행하고 있습니다.
                            PubMed, OpenAlex, Semantic Scholar 등 다중 소스 통합 검색과 데이터셋 자동 발굴 시스템을 직접 구축·운영합니다.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact */}
            <section className="text-center pt-8">
                <h3 className="text-2xl font-bold mb-6">문의하기</h3>
                <div className="flex justify-center gap-4">
                    <a target="_blank" href="https://github.com/L-SHawn91" className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 transition">GitHub</a>
                    <a href="mailto:leseichi@konkuk.ac.kr" className="px-6 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition">Email</a>
                </div>
            </section>
        </div>
    );
}
