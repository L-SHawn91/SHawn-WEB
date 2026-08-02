// Server shell: homepage copy is rendered by HomePageClient.
import { HomePageClient, type HomePost } from "@/components/home/home-page-client";
import { getAllPostMeta } from "@/lib/mdx";
import { BLOG_LANES, getPublicCategoryLabel } from "@/lib/public-labels";

export default function Home() {
  const posts = getAllPostMeta();
  const recentPosts: HomePost[] = BLOG_LANES.flatMap((lane) => {
    const post = posts.find((candidate) => getPublicCategoryLabel(candidate.category) === lane);
    if (!post) return [];

    return [{
      slug: post.slug,
      title: post.title,
      date: post.date,
      description: post.description,
      category: lane,
      image: post.image,
    }];
  });

  return <HomePageClient recentPosts={recentPosts} />;
}
