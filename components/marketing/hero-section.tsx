"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import { translations } from "@/lib/translations"

export function HeroSection() {
    const { language } = useLanguage()
    const t = translations[language]

    return (
        <section className="relative overflow-hidden py-20 md:py-32 lg:py-40">
            {/* SABS background — teal + coral soft blobs */}
            <div className="absolute top-0 left-1/2 -ml-[50%] -translate-x-1/2 w-[200%] h-full z-0 opacity-25 dark:opacity-15 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2A9D8F]/40 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7B6BA8]/35 rounded-full blur-3xl" />
            </div>

            <div className="container relative z-10 flex flex-col items-center text-center gap-8 mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-6">
                        <Sparkles className="w-3 h-3 mr-1 text-[#E76F51]" />
                        <span className="text-muted-foreground">{t.hero.badge}</span>
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight font-heading max-w-4xl"
                >
                    <span className="text-gradient-bio">{t.hero.title.part1}</span>{t.hero.title.conjunction1}
                    <span className="text-gradient-life">{t.hero.title.part2}</span>{t.hero.title.conjunction2}<br className="hidden sm:block" />
                    <span className="text-gradient-assets">{t.hero.title.part3}</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
                >
                    {t.hero.description}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4"
                >
                    <Link href="/blog">
                        <Button size="lg" className="sketch-btn w-full sm:w-auto h-12 text-base px-8 bg-primary hover:bg-primary/90">
                            {t.hero.readBlog}
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>
                    <Link href="/about">
                        <Button variant="outline" size="lg" className="sketch-btn w-full sm:w-auto h-12 text-base px-8">
                            {t.hero.aboutMe}
                        </Button>
                    </Link>
                </motion.div>
            </div>
        </section>
    )
}
