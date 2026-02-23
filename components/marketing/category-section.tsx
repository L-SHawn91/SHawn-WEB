"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Dna, Coffee, TrendingUp, ArrowRight } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/components/providers/language-provider"
import { translations } from "@/lib/translations"

export function CategorySection() {
    const { language } = useLanguage()
    const t = translations[language].category

    const categories = [
        {
            title: t.bio.title,
            description: t.bio.desc,
            icon: Dna,
            href: "/category/Bio Knowledge",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "group-hover:border-emerald-500/50",
        },
        {
            title: t.life.title,
            description: t.life.desc,
            icon: Coffee,
            href: "/category/Daily Life",
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "group-hover:border-orange-500/50",
        },
        {
            title: t.market_intelligence.title,
            description: t.market_intelligence.desc,
            icon: TrendingUp,
            href: "/invest?panel=archive",
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "group-hover:border-purple-500/50",
        },
    ]

    return (
        <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold font-heading mb-4"
                    >
                        {t.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground"
                    >
                        {t.description}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={category.href}>
                                <Card className={`group h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 dark:bg-slate-950/50 ${category.border}`}>
                                    <CardHeader>
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${category.bg}`}>
                                            <category.icon className={`w-6 h-6 ${category.color}`} />
                                        </div>
                                        <CardTitle className="font-heading text-xl">{category.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-base mb-6 leading-relaxed">
                                            {category.description}
                                        </CardDescription>
                                        <div className="flex items-center text-sm font-medium text-primary decoration-primary/30 group-hover:underline underline-offset-4">
                                            {t.explore} <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
