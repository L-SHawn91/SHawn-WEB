import type { PostMeta } from "@/lib/mdx"
import { PostCard } from "./post-card"

interface RelatedPostsProps {
    posts: PostMeta[]
    currentSlug: string
    currentCategory: string
    currentTags: string[]
}

const LANE_TAGS = new Set(["ai", "bio", "assets", "tools", "science", "evidence", "education", "field notes", "market signals"])

export function RelatedPosts({ posts, currentSlug, currentCategory, currentTags }: RelatedPostsProps) {
    const meaningfulCurrentTags = currentTags.filter((tag) => !LANE_TAGS.has(tag.toLowerCase()))
    const scoredPosts = posts
        .filter((post) => post.slug !== currentSlug)
        .map((post) => {
            let score = post.category === currentCategory ? 10 : 0
            const matchingTags = post.tags.filter((tag) => meaningfulCurrentTags.includes(tag))
            score += matchingTags.length * 4
            return { post, score }
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
        .slice(0, 3)

    if (scoredPosts.length === 0) return null

    return (
        <div className="mt-16 border-t pt-8">
            <h2 className="mb-6 font-heading text-2xl font-bold">관련 글</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {scoredPosts.map(({ post }) => (
                    <PostCard key={post.slug} post={post} />
                ))}
            </div>
        </div>
    )
}
