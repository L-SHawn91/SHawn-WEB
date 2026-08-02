"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/components/providers/language-provider"
import { getPublicCategoryLabel } from "@/lib/public-labels"

interface CategoryFilterProps {
    categories: string[]
    selectedCategory: string
    categoryCounts: Record<string, number>
    totalCount: number
    onSelectCategory: (category: string) => void
}

export function CategoryFilter({ categories, selectedCategory, categoryCounts, totalCount, onSelectCategory }: CategoryFilterProps) {
    const { language } = useLanguage()
    const allLabel = language === "ko" ? "전체" : "All"

    return (
        <div className="mb-8 flex flex-wrap justify-center gap-2" role="group" aria-label={language === "ko" ? "글 분야 필터" : "Article lane filter"}>
            <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onSelectCategory("All")}
                aria-pressed={selectedCategory === "All"}
                className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${selectedCategory === "All"
                        ? "border border-foreground bg-foreground text-background shadow-sm"
                        : "border border-border bg-background text-foreground hover:border-foreground/50 hover:bg-muted/60"
                    }`}
            >
                {allLabel} <span className="opacity-70">{totalCount}</span>
            </motion.button>
            {categories.map((category, index) => (
                <motion.button
                    key={category}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(index + 1, 5) * 0.04 }}
                    onClick={() => onSelectCategory(category)}
                    aria-pressed={selectedCategory === category}
                    className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${selectedCategory === category
                            ? "border border-foreground bg-foreground text-background shadow-sm"
                            : "border border-border bg-background text-foreground hover:border-foreground/50 hover:bg-muted/60"
                        }`}
                >
                    {getPublicCategoryLabel(category)} <span className="opacity-70">{categoryCounts[category] || 0}</span>
                </motion.button>
            ))}
        </div>
    )
}
