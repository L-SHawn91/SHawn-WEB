import type { MetadataRoute } from "next";
import { getAllPostMeta } from "@/lib/mdx";
import { SITE_URL } from "@/lib/site-url";

function latestContentDate(posts: ReturnType<typeof getAllPostMeta>) {
  const timestamps = posts
    .map((post) => Date.parse(post.date))
    .filter((timestamp) => Number.isFinite(timestamp));
  return new Date(timestamps.length > 0 ? Math.max(...timestamps) : Date.UTC(2026, 0, 1));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPostMeta();
  const lastModified = latestContentDate(posts);
  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/blog`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/bio`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/papers`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/datasets`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/invest`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/invest/reports`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/invest/archive`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/invest/dashboard`, lastModified, changeFrequency: "weekly", priority: 0.7 },
  ];

  return [...staticEntries, ...postEntries];
}
