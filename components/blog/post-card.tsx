"use client"

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
    "Bio Knowledge": {
        badge: "bg-black text-white border-black",
        border: "group-hover:border-black"
    },
    "Daily Life": {
        badge: "bg-white text-black border-black/70",
        border: "group-hover:border-black"
    },
    "Revenue": {
        badge: "bg-zinc-900 text-white border-zinc-900",
        border: "group-hover:border-black"
    },
};

export function PostCard({ post, index = 0 }: PostCardProps) {
    const categoryStyle = categoryColors[post.category] || {
        badge: "bg-black text-white border-black",
        border: "group-hover:border-black"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
        >
            <Link href={`/blog/${post.slug}`}>
                <Card className={`group flex h-full flex-col border border-black/15 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] ${categoryStyle.border}`}>
                    <CardHeader>
                        <div className={`inline-flex items-center w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold mb-3 ${categoryStyle.badge}`}>
                            {post.category}
                        </div>
                        <CardTitle className="line-clamp-2 text-black transition-colors group-hover:text-black/80">
                            {post.title}
                        </CardTitle>
                        <div className="mt-2 flex items-center gap-2 text-sm text-black/60">
                            <time dateTime={post.date}>
                                {format(new Date(post.date), "yyyy. MM. dd")}
                            </time>
                            <span>•</span>
                            <span>{post.readingTime}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <CardDescription className="line-clamp-3 leading-relaxed text-black/75">
                            {post.description}
                        </CardDescription>
                    </CardContent>
                    {post.tags && post.tags.length > 0 && (
                        <CardFooter className="flex gap-2 flex-wrap">
                            {post.tags.slice(0, 3).map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full border border-black/20 bg-white px-2.5 py-0.5 text-xs font-medium text-black/65 transition-colors hover:border-black/40"
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
