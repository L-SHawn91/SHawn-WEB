// i18n-exempt: article body follows source MDX language; shared chrome handles language switching.
import { getPostBySlug, getAllPosts } from '@/lib/mdx';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import type { Metadata } from 'next';
import { RelatedPosts } from '@/components/blog/related-posts';
import { ShareButtons } from '@/components/blog/share-buttons';
import { getPublicCategoryLabel, getPublicTagLabels } from '@/lib/public-labels';
import { SITE_URL } from '@/lib/site-url';
import { AdSlot } from '@/components/monetization/adsense';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const description = post.description || `${post.title} | SHawn_LAB`;
  const absoluteImage = post.image ? new URL(post.image, SITE_URL).toString() : undefined;
  const publicTags = getPublicTagLabels(post.tags);

  return {
    title: post.title,
    description,
    keywords: publicTags,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      type: 'article',
      url: postUrl,
      title: post.title,
      description,
      siteName: 'SHawn_LAB',
      locale: 'ko_KR',
      publishedTime: post.date,
      tags: publicTags,
      images: absoluteImage ? [{ url: absoluteImage, alt: post.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: absoluteImage ? [absoluteImage] : undefined,
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  const allPosts = getAllPosts().map((item) => ({
    ...item,
    category: getPublicCategoryLabel(item.category),
    tags: getPublicTagLabels(item.tags),
  }));

  if (!post) {
    notFound();
  }

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const absoluteImage = post.image ? new URL(post.image, SITE_URL).toString() : undefined;
  const publicCategory = getPublicCategoryLabel(post.category);
  const publicTags = getPublicTagLabels(post.tags);
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: 'SHawn',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SHawn_LAB',
      url: SITE_URL,
    },
    mainEntityOfPage: postUrl,
    image: absoluteImage,
    keywords: publicTags.join(', '),
    articleSection: publicCategory,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${SITE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  return (
    <article className="relative mx-auto max-w-4xl px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_58%)]" />
      <header className="mb-10 border-b border-border pb-8">
        <div className="mb-4 inline-flex items-center rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-semibold tracking-wide text-background">
          {publicCategory}
        </div>
        <h1 className="mb-4 text-balance font-heading text-3xl font-bold leading-tight text-foreground md:text-4xl">
          {post.title}
        </h1>
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <time dateTime={post.date}>{post.date}</time>
        </div>
        {post.description && (
          <p className="rounded-r-md border-l-4 border-foreground/50 bg-muted/40 px-4 py-3 text-base italic leading-relaxed text-foreground/85 md:text-lg">
            {post.description}
          </p>
        )}
        {post.image && (
          <figure className="mt-6 overflow-hidden rounded-2xl border border-border bg-muted/30">
            <Image src={post.image} alt={`${post.title} 대표 이미지`} width={1280} height={720} className="w-full object-cover" priority />
          </figure>
        )}
        <div className="mt-6">
          <ShareButtons title={post.title} url={postUrl} />
        </div>
      </header>

      <div className="bw-prose prose prose-base max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {/* in-article ad: between body and footer; inert until AdSense env is set */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE || ""} className="my-10" />

      {publicTags.length > 0 && (
        <footer className="mt-12 border-t border-border pt-8">
          <div className="flex items-center gap-2">
            <strong className="text-foreground">Tags:</strong>
            <div className="flex flex-wrap gap-2">
              {publicTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted/35 px-3 py-1 text-sm text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </footer>
      )}

      <section className="mt-12 rounded-2xl border border-border bg-muted/30 p-6">
        <h2 className="font-heading text-xl font-bold text-foreground">다음 액션</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          실전 운영/리서치 사례를 주간으로 받아보려면 블로그를 북마크하고, 필요한 주제는 문의로 남겨주세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="inline-flex items-center rounded-md border border-foreground bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-background hover:text-foreground"
          >
            최신 글 더 보기
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
          >
            협업/문의
          </Link>
        </div>
      </section>

      <RelatedPosts
        posts={allPosts}
        currentSlug={post.slug}
        currentCategory={publicCategory}
        currentTags={publicTags}
      />

      <div className="mt-12 border-t border-border pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center rounded-md border border-foreground bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-background hover:text-foreground"
        >
          ← 블로그로 돌아가기
        </Link>
      </div>
    </article>
  );
}
