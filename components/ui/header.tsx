"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "./button";
import { LanguageToggle } from "./language-toggle";
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";
import { useLanguage } from "../providers/language-provider";
import { translations } from "@/lib/translations";

export function Header() {
    const { language } = useLanguage();
    const t = translations[language];
    const pathname = usePathname();

    const navItems = [
        { href: "/about", label: t.nav.about },
        { href: "/blog", label: t.nav.blog },
        { href: "/bio", label: t.nav.bio },
        { href: "/papers", label: t.nav.papers || "Papers" },
        { href: "/datasets", label: t.nav.datasets || "Datasets" },
        { href: "/invest/reports?tab=KR", label: t.nav.market_intelligence },
        { href: "/invest/archive", label: t.nav.reports },
        { href: "/dashboard", label: t.nav.dashboard || "Dashboard" },
    ];

    const isActive = (href: string) => {
        const route = href.split("?")[0];
        return pathname === route || pathname.startsWith(`${route}/`);
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between mx-auto px-4">
                {/* Logo & Desktop Nav */}
                <div className="flex items-center gap-8">
                    <Link className="flex items-center space-x-2" href="/">
                        <span className="font-heading font-bold text-xl sm:inline-block">{t.common.logo}</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                className={
                                    isActive(item.href)
                                        ? "text-foreground transition-colors"
                                        : "text-muted-foreground transition-colors hover:text-foreground"
                                }
                                href={item.href}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <div className="hidden lg:flex items-center gap-2">
                        <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
                            Dashboard
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
