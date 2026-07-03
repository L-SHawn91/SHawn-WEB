"use client"

import { motion } from "framer-motion"
import { Dna, Coffee, TrendingUp, LucideIcon } from "lucide-react"

interface CategoryConfig {
    icon: LucideIcon
    gradient: string
    description: string
}

const categoryConfigs: Record<string, CategoryConfig> = {
    "Bio Knowledge": {
        icon: Dna,
        gradient: "from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400",
        description: "최신 생명공학 트렌드, 연구 분석, 그리고 건강에 대한 깊이 있는 통찰력을 제공합니다."
    },
    "Daily Life": {
        icon: Coffee,
        gradient: "from-orange-500 to-pink-500 dark:from-orange-400 dark:to-pink-400",
        description: "생산성 도구, 효율적인 시간 관리, 그리고 삶의 질을 높이는 실용적인 노하우를 공유합니다."
    },
    "Assets": {
        icon: TrendingUp,
        gradient: "from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400",
        description: "에셋 리포트와 시장 흐름을 참고용 공개 노트로 정리합니다."
    }
}

interface CategoryHeroProps {
    category: string
    postCount: number
}

export function CategoryHero({ category, postCount }: CategoryHeroProps) {
    const config = categoryConfigs[category] || {
        icon: Dna,
        gradient: "from-primary to-primary",
        description: `'${category}' 카테고리의 글 모음입니다.`
    }

    const Icon = config.icon

    return (
        <div className="relative overflow-hidden py-16 md:py-20 mb-12">
            {/* Background Gradient Blob */}
            <div className="absolute inset-0 -z-10 opacity-20 dark:opacity-10">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r ${config.gradient} rounded-full blur-3xl`} />
            </div>

            <div className="container mx-auto px-4 text-center max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6"
                >
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r ${config.gradient} p-0.5 shadow-lg`}>
                        <div className="w-full h-full bg-background rounded-2xl flex items-center justify-center">
                            <Icon className="w-10 h-10 text-foreground" />
                        </div>
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl sm:text-5xl font-bold font-heading mb-4"
                >
                    <span className={`bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                        {category}
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg text-muted-foreground mb-4 leading-relaxed"
                >
                    {config.description}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-sm text-muted-foreground"
                >
                    총 <span className="font-semibold text-foreground">{postCount}개</span>의 글
                </motion.div>
            </div>
        </div>
    )
}
