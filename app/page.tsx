// Server shell: homepage copy is rendered by HomePageClient.
import { HomePageClient, type HomePost } from "@/components/home/home-page-client";
import { getAllPosts } from "@/lib/mdx";
import { getPublicCategoryLabel } from "@/lib/public-labels";

export default function Home() {
  const recentPosts: HomePost[] = getAllPosts()
    .slice(0, 3)
    .map(({ slug, title, date, description, category, image }) => ({
      slug,
      title,
      date,
      description,
      category: getPublicCategoryLabel(category),
      image,
    }));

  return <HomePageClient recentPosts={recentPosts} />;
}
