"use client"

import { useState } from "react"
import { Share2, Twitter, Facebook, Linkedin, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

interface ShareButtonsProps {
    title: string
    url: string
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
    const [copied, setCopied] = useState(false)
    const { language } = useLanguage()
    const label = language === "ko"
        ? { share: "공유하기:", copy: "링크 복사", copied: "복사됨!" }
        : { share: "Share:", copy: "Copy link", copied: "Copied!" }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy:", err)
        }
    }

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-medium text-muted-foreground">{label.share}</span>

            <Button variant="outline" size="sm" onClick={() => window.open(shareLinks.twitter, "_blank")} className="gap-2">
                <Twitter className="h-4 w-4" />
                <span className="hidden sm:inline">Twitter</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => window.open(shareLinks.facebook, "_blank")} className="gap-2">
                <Facebook className="h-4 w-4" />
                <span className="hidden sm:inline">Facebook</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => window.open(shareLinks.linkedin, "_blank")} className="gap-2">
                <Linkedin className="h-4 w-4" />
                <span className="hidden sm:inline">LinkedIn</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
                {copied ? (
                    <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="hidden text-green-500 sm:inline">{label.copied}</span>
                    </>
                ) : (
                    <>
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline">{label.copy}</span>
                    </>
                )}
            </Button>
        </div>
    )
}
