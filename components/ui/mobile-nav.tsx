"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "../providers/language-provider"
import { translations } from "@/lib/translations"

export function MobileNav() {
    const [open, setOpen] = React.useState(false)
    const pathname = usePathname()

    const { language } = useLanguage()
    const t = translations[language]

    // Prevent scrolling when menu is open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
    }, [open])

    // Close menu when route changes
    React.useEffect(() => {
        setOpen(false)
    }, [pathname])

    const menuItems = [
        { href: "/about", label: t.nav.about },
        { href: "/blog", label: t.nav.blog },
        { href: "/papers", label: t.nav.papers || 'Papers' },
        { href: "/datasets", label: t.nav.datasets || 'Datasets' },
        { href: "/market-intelligence", label: t.nav.market_intelligence },
    ]

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    }

    return (
        <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
                <Menu className="h-6 w-6" />
            </Button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4"
                    >
                        <div className="flex justify-end">
                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        <div className="container h-full flex flex-col justify-center items-center gap-8 -mt-20">
                            <Link href="/" className="flex items-center space-x-2 mb-8" onClick={() => setOpen(false)}>
                                <span className="font-heading font-bold text-3xl">{t.common.logo}</span>
                            </Link>

                            <motion.nav
                                variants={container}
                                initial="hidden"
                                animate="show"
                                className="flex flex-col gap-6 items-center text-center"
                            >
                                {menuItems.map((menu) => (
                                    <motion.div key={menu.href} variants={item}>
                                        <Link
                                            href={menu.href}
                                            className={cn(
                                                "text-2xl font-medium transition-colors hover:text-primary",
                                                pathname === menu.href
                                                    ? "text-primary font-bold"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {menu.label}
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.nav>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
