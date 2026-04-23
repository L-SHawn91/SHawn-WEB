// i18n-exempt: i18n wiring lives in components/bio/bio-hub-client.tsx (client component)
import { BioHubClient } from "@/components/bio/bio-hub-client";
import { getPostsByCategory } from "@/lib/mdx";

export default function SHawnbioHubPage() {
  const recentPosts = getPostsByCategory("bio-science")
    .slice(0, 4)
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      readingTime: post.readingTime,
      description: post.description,
    }));

  return <BioHubClient recentPosts={recentPosts} />;
}
