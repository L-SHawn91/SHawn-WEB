"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/components/providers/language-provider"

const copy = {
    ko: {
        eyebrow: "Public Blog",
        title: "블로그",
        desc: "AI, Bio, Assets 글을 이미지와 함께 차분하게 정리한 SHawn_LAB 공개 아카이브입니다.",
        badges: ["KOR/ENG 전환", "본문형 이미지", "공개 아카이브"],
    },
    en: {
        eyebrow: "Public Blog",
        title: "Blog",
        desc: "A public SHawn_LAB archive for AI, Bio, and Asset articles with clear writing and inline visuals.",
        badges: ["KOR/ENG switch", "Inline visuals", "Public archive"],
    },
} as const

export function BlogHeader() {
    const { language } = useLanguage()
    const t = copy[language]

    return (
        <div className="mb-10 mx-auto max-w-4xl text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-[2rem] border border-[#10243A]/10 bg-white/75 px-5 py-8 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/55 md:px-8"
            >
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#2A9D8F]">{t.eyebrow}</p>
                <h1 className="mb-4 font-heading text-4xl font-bold text-foreground sm:text-5xl">
                    {t.title}
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-8 text-foreground/72 md:text-lg">
                    {t.desc}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {t.badges.map((badge) => (
                        <span key={badge} className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {badge}
                        </span>
                    ))}
                </div>
            </motion.div>
        </div>
    )
}
