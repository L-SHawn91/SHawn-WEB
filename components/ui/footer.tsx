"use client";

import { useLanguage } from "../providers/language-provider";
import { translations } from "@/lib/translations";

export function Footer() {
    const { language } = useLanguage();
    const t = translations[language].footer;

    return (
        <footer className="py-6 md:px-8 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4">
                <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
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
            </div>
        </footer>
    );
}
