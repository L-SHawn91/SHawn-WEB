"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/components/providers/language-provider"

interface CategoryFilterProps {
    categories: string[]
    selectedCategory: string
    onSelectCategory: (category: string) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
    const { language } = useLanguage()
    const allLabel = language === "ko" ? "전체" : "All"

    return (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
            <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onSelectCategory("All")}
                className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${selectedCategory === "All"
                        ? "border border-foreground bg-foreground text-background shadow-sm"
                        : "border border-border bg-background text-foreground hover:border-foreground/50 hover:bg-muted/60"
                    }`}
            >
                {allLabel}
            </motion.button>
            {categories.map((category, index) => (
                <motion.button
                    key={category}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (index + 1) * 0.05 }}
                    onClick={() => onSelectCategory(category)}
                    className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${selectedCategory === category
                            ? "border border-foreground bg-foreground text-background shadow-sm"
                            : "border border-border bg-background text-foreground hover:border-foreground/50 hover:bg-muted/60"
                        }`}
                >
                    {category}
                </motion.button>
            ))}
        </div>
    )
}
