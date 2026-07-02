"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();
    const options = [
        { value: "ko" as const, label: "KOR" },
        { value: "en" as const, label: "ENG" },
    ];

    return (
        <div
            className="inline-flex min-h-10 items-center rounded-full border border-[#10243A]/15 bg-white/85 p-1 shadow-sm backdrop-blur dark:border-white/15 dark:bg-slate-950/75"
            aria-label="Language switcher"
        >
            {options.map((option) => {
                const active = language === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setLanguage(option.value)}
                        aria-pressed={active}
                        className={cn(
                            "min-h-8 rounded-full px-3 text-[11px] font-bold tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F] focus-visible:ring-offset-2",
                            active
                                ? "bg-[#10243A] text-white shadow-sm dark:bg-white dark:text-slate-950"
                                : "text-[#263238]/60 hover:bg-[#F7F3EA] hover:text-[#10243A] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
