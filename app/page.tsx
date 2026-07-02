// Server shell: homepage copy is rendered by HomePageClient.
import { HomePageClient, type HomePost } from "@/components/home/home-page-client";
import { getAllPosts } from "@/lib/mdx";

export default function Home() {
  const recentPosts: HomePost[] = getAllPosts()
    .slice(0, 3)
    .map(({ slug, title, date, description, category, image }) => ({
      slug,
      title,
      date,
      description,
      category,
      image,
    }));

  return <HomePageClient recentPosts={recentPosts} />;
}
