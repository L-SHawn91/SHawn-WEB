"use client"

import { motion } from "framer-motion"

interface CategoryFilterProps {
    categories: string[]
    selectedCategory: string
    onSelectCategory: (category: string) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
    return (
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
            <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onSelectCategory("All")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === "All"
                        ? "border border-foreground bg-foreground text-background shadow-sm"
                        : "border border-border bg-background text-foreground hover:bg-accent"
                    }`}
            >
                전체
            </motion.button>
            {categories.map((category, index) => (
                <motion.button
                    key={category}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (index + 1) * 0.05 }}
                    onClick={() => onSelectCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category
                            ? "border border-foreground bg-foreground text-background shadow-sm"
                            : "border border-border bg-background text-foreground hover:bg-accent"
                        }`}
                >
                    {category}
                </motion.button>
            ))}
        </div>
    )
}
