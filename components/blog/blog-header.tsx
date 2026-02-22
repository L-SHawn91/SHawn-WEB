"use client"

import { motion } from "framer-motion"

export function BlogHeader() {
    return (
        <div className="mb-12 text-center max-w-3xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl sm:text-5xl font-bold font-heading mb-4 text-foreground">
                    블로그
                </h1>
                <p className="text-lg text-foreground/70 leading-relaxed">
                    바이오 지식, 일상의 효율, 그리고 수익 창출에 대한 최신 인사이트를 탐험하세요.
                </p>
            </motion.div>
        </div>
    )
}
