"use client"

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Post } from "@/lib/mdx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

interface PostCardProps {
    post: Post;
    index?: number;
}

// Category style mapping
const categoryColors: Record<string, { badge: string; border: string }> = {
    "AI Notes": {
        badge: "bg-[#10243A] text-white border-[#10243A]",
        border: "group-hover:border-[#10243A]/70"
    },
    "Bio Notes": {
        badge: "bg-[#2A9D8F] text-white border-[#2A9D8F]",
        border: "group-hover:border-[#2A9D8F]/70"
    },
    "Asset Signals": {
        badge: "bg-[#E76F51] text-white border-[#E76F51]",
        border: "group-hover:border-[#E76F51]/70"
    },
    "Bio Knowledge": {
        badge: "bg-foreground text-background border-foreground",
        border: "group-hover:border-foreground"
    },
    "Daily Life": {
        badge: "bg-background text-foreground border-foreground/70",
        border: "group-hover:border-foreground"
    },
    "Revenue": {
        badge: "bg-muted text-foreground border-border",
        border: "group-hover:border-foreground"
    },
};

export function PostCard({ post, index = 0 }: PostCardProps) {
    const categoryStyle = categoryColors[post.category] || {
        badge: "bg-foreground text-background border-foreground",
        border: "group-hover:border-foreground"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
        >
            <Link href={`/blog/${post.slug}`}>
                <Card className={`group flex h-full flex-col overflow-hidden border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] ${categoryStyle.border}`}>
                    {post.image && (
                        <div className="aspect-[16/9] overflow-hidden border-b border-border bg-muted">
                            <Image
                                src={post.image}
                                alt={`${post.title} 대표 이미지`}
                                width={960}
                                height={540}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            />
                        </div>
                    )}
                    <CardHeader>
                        <div className={`inline-flex items-center w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold mb-3 ${categoryStyle.badge}`}>
                            {post.category}
                        </div>
                        <CardTitle className="line-clamp-2 text-card-foreground transition-colors group-hover:text-foreground/80">
                            {post.title}
                        </CardTitle>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <time dateTime={post.date}>
                                {format(new Date(post.date), "yyyy. MM. dd")}
                            </time>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <CardDescription className="line-clamp-3 leading-relaxed text-muted-foreground">
                            {post.description}
                        </CardDescription>
                    </CardContent>
                    {post.tags && post.tags.length > 0 && (
                        <CardFooter className="flex gap-2 flex-wrap">
                            {post.tags.slice(0, 3).map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/50"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </CardFooter>
                    )}
                </Card>
            </Link>
        </motion.div>
    );
}
