import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@/components/seo/analytics";
import { AdSense } from "@/components/ads/adsense";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ShawnChatUI } from "@/components/marketing/shawn-chat-ui";
import { Header } from "@/components/ui/header";
import { SuppressTitleTooltips } from "@/components/ui/suppress-title-tooltips";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  title: {
    default: "SHawn_LAB - 바이오 지식, 일상 & 수익",
    template: "%s | SHawn_LAB",
  },
  description: "바이오테크놀로지, 일상 효율화 팁, 그리고 수익 창출 전략을 탐구합니다.",
  metadataBase: new URL("https://phdshawn.com"),
  openGraph: {
    title: "SHawn_LAB",
    description: "바이오 지식, 일상, 그리고 수익 전략.",
    url: "https://phdshawn.com",
    siteName: "SHawn_LAB",
    locale: "ko_KR",
    type: "website",
  },
};

import { SpeedInsights } from "@vercel/speed-insights/next"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="scroll-smooth" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        notoSansKR.variable
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <SuppressTitleTooltips />
            <Header />
            {children}
            <ShawnChatUI />
            <Analytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || ""} />
            <AdSense pId={process.env.NEXT_PUBLIC_ADSENSE_ID || ""} />
            <SpeedInsights />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
