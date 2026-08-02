"use client";

import { useLanguage } from "@/components/providers/language-provider";

const copy = {
  ko: {
    eyebrow: "SHawn_LAB",
    title: "개인정보 안내",
    lead: "SHawn_LAB은 공개 연구·기술·에셋 글을 읽는 데 개인 계정을 요구하지 않습니다.",
    sections: [
      ["수집하는 정보", "선택적으로 독자 업데이트 양식에 입력한 이메일 주소와 관심 항목을 수집할 수 있습니다. 사이트는 Vercel Analytics를 통해 집계된 방문·성능 정보를 처리하며, GA4는 운영자가 별도로 활성화한 경우에만 동작합니다."],
      ["이용 목적", "입력한 이메일은 새 글 또는 리포트 업데이트, 그리고 사용자가 선택한 협업 관련 요청에 응답하기 위해서만 사용합니다. 민감한 개인·건강·금융 정보를 양식에 입력하지 마세요."],
      ["보관과 전달", "독자 업데이트 기능이 활성화되면, 입력 내용은 운영자가 관리하는 안전한 수신 시스템으로 전달됩니다. 전달 시스템의 보관·수신거부 절차는 기능 활성화 시점에 별도 안내합니다."],
      ["분석 데이터", "검색 이벤트에는 검색어가 아니라 선택한 영역과 검색어 길이만 기록됩니다. 이메일 주소는 사이트 분석 이벤트로 전송하지 않습니다."],
      ["문의와 변경", "이 안내는 서비스 기능이 바뀌면 함께 갱신됩니다. 데이터 관련 요청은 사이트의 공개 연락 경로를 통해 남겨 주세요."],
    ],
  },
  en: {
    eyebrow: "SHawn_LAB",
    title: "Privacy notice",
    lead: "SHawn_LAB does not require a personal account to read its public research, technology, and asset writing.",
    sections: [
      ["Information we collect", "We may collect an email address and selected interests when a reader voluntarily uses the updates form. The site processes aggregate visit and performance data through Vercel Analytics. GA4 runs only when it is separately enabled by the operator."],
      ["How it is used", "An email is used only to respond to the reader's selected new-writing, report-update, or collaboration request. Do not submit sensitive personal, health, or financial information through the form."],
      ["Delivery and retention", "When reader updates are activated, form data is delivered to an operator-controlled secure receiver. Its retention and opt-out process will be disclosed when delivery is enabled."],
      ["Analytics data", "Search events record a selected lane and query length, not the search text. Email addresses are not sent as site analytics events."],
      ["Questions and changes", "This notice is updated together with material changes to site functionality. Please use the site's public contact channel for data-related requests."],
    ],
  },
} as const;

export function PrivacyPageClient() {
  const { language } = useLanguage();
  const content = copy[language];

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">{content.eyebrow}</p>
      <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white sm:text-5xl">{content.title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">{content.lead}</p>
      <div className="mt-10 space-y-7">
        {content.sections.map(([heading, body]) => (
          <section key={heading} className="rounded-2xl border border-slate-200 bg-white/60 p-6 dark:border-slate-800 dark:bg-white/[0.03]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{heading}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
