import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@/components/seo/analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { SuppressTitleTooltips } from "@/components/ui/suppress-title-tooltips";
import { SITE_URL } from "@/lib/site-url";
import { AdSenseScript } from "@/components/monetization/adsense";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: {
    default: "SHawn_LAB - 바이오 지식, 일상 & 에셋 노트",
    template: "%s | SHawn_LAB",
  },
  description: "바이오테크놀로지, 일상 효율화 팁, 그리고 에셋 리포트를 정리합니다.",
  metadataBase: new URL(SITE_URL),
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    title: "SHawn_LAB",
    description: "바이오 지식, 일상, 그리고 에셋 리포트.",
    url: SITE_URL,
    siteName: "SHawn_LAB",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SHawn_LAB",
    description: "바이오 지식, 일상, 그리고 에셋 리포트.",
  },
};

const websiteLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SHawn_LAB",
    url: SITE_URL,
    inLanguage: ["ko", "en"],
    description: "Public writing and research entry points across AI, Bio, and Assets.",
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Dr. Shawn",
    url: SITE_URL,
    sameAs: ["https://github.com/L-SHawn91"],
  },
];

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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider>
            <SuppressTitleTooltips />
            <Header />
            {children}
            <Footer />
            <Analytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || ""} />
            <AdSenseScript />
            <VercelAnalytics />
            <SpeedInsights />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
