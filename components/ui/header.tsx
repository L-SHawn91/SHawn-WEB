"use client";

import Link from "next/link";
import { Button } from "./button";
import { LanguageToggle } from "./language-toggle";
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";
import { useLanguage } from "../providers/language-provider";
import { translations } from "@/lib/translations";

export function Header() {
    const { language } = useLanguage();
    const t = translations[language];

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between mx-auto px-4">
                {/* Logo & Desktop Nav */}
                <div className="flex items-center gap-8">
                    <Link className="flex items-center space-x-2" href="/">
                        <span className="font-heading font-bold text-xl sm:inline-block">{t.common.logo}</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/about">
                            {t.nav.about}
                        </Link>
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/blog">
                            {t.nav.blog}
                        </Link>
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/bio">
                            {t.nav.bio}
                        </Link>
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/papers">
                            {t.nav.papers || 'Papers'}
                        </Link>
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/datasets">
                            {t.nav.datasets || 'Datasets'}
                        </Link>
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/invest/reports?tab=KR">
                            {t.nav.market_intelligence}
                        </Link>
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/invest/archive">
                            {t.nav.reports}
                        </Link>
                        <Link className="transition-colors hover:text-primary text-muted-foreground" href="/dashboard">
                            {t.nav.dashboard || 'Dashboard'}
                        </Link>
                    </nav>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <div className="hidden lg:flex items-center gap-2">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                            {/* Search will go here */}
                        </div>
                        <Link href="/dashboard">
                            <Button variant="default" size="sm">
                                Dashboard
                            </Button>
                        </Link>
                    </div>
                    <LanguageToggle />
                    <ModeToggle />
                    <MobileNav />
                </div>
            </div>
        </header>
    );
}
