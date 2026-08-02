"use client";

import Link from "next/link";
import { ReaderUpdatesForm } from "@/components/engagement/reader-updates-form";
import { useLanguage } from "../providers/language-provider";
import { translations } from "@/lib/translations";

export function Footer() {
  const { language } = useLanguage();
  const t = translations[language].footer;

  return (
    <footer className="border-t border-border py-8 md:px-8 md:py-10">
      <div className="container mx-auto flex max-w-screen-xl flex-col items-center justify-between gap-8 px-4 md:flex-row md:items-end">
        <div className="text-center md:text-left">
          <p className="text-balance text-sm leading-loose text-muted-foreground">
            {t.builtBy} <a href="/about" className="font-medium underline underline-offset-4">{t.author}</a>.{" "}
            <a
              href="https://github.com/L-SHawn91/SHawn-WEB"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              {t.sourceCode}
            </a>
          </p>
          <Link href="/privacy" className="mt-1 inline-block text-xs text-muted-foreground transition hover:text-foreground">
            {language === "ko" ? "개인정보 안내" : "Privacy notice"}
          </Link>
        </div>
        <ReaderUpdatesForm />
      </div>
    </footer>
  );
}
