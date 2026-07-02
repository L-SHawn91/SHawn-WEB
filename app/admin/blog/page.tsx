// i18n-exempt: internal admin authoring surface, protected server-side.
import Link from "next/link";
import { BlogStudioClient } from "@/components/admin/blog-studio-client";
import { getAuthenticatedAdminUserId } from "@/lib/admin-auth";

export default async function AdminBlogPage() {
  const adminUserId = await getAuthenticatedAdminUserId();

  if (!adminUserId) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-4 py-12 text-[#263238] dark:bg-slate-950 dark:text-slate-100">
        <section className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/50 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-rose-500">Admin only</p>
          <h1 className="mt-2 text-2xl font-black">SHawn Blog Studio 접근 권한 없음</h1>
          <p className="mt-3 text-sm leading-6 text-[#263238]/70 dark:text-slate-400">
            블로그 작성 화면은 인증된 관리자에게만 열립니다. Telegram 인증 후 다시 접속하세요.
          </p>
          <Link href="/" className="mt-5 inline-block rounded-full bg-[#10243A] px-4 py-2 text-sm font-bold text-white">홈으로 이동</Link>
        </section>
      </main>
    );
  }

  return <BlogStudioClient />;
}
