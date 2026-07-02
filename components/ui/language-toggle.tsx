"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();
    const options = [
        { value: "ko" as const, label: "KO" },
        { value: "en" as const, label: "EN" },
    ];

    return (
        <div
            className="inline-flex items-center gap-1 rounded-full border border-[#D8DEE6] bg-[#F7F3EA]/80 p-1 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80"
            aria-label="Language switcher"
        >
            <Languages className="ml-1 h-3.5 w-3.5 text-[#2A9D8F]" aria-hidden="true" />
            {options.map((option) => {
                const active = language === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setLanguage(option.value)}
                        aria-pressed={active}
                        className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-bold tracking-[0.14em] transition",
                            active
                                ? "bg-[#10243A] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                                : "text-[#263238]/55 hover:bg-white/80 hover:text-[#10243A] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
