import { getPostBySlug, getAllPosts } from '@/lib/mdx';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="relative mx-auto max-w-4xl px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_58%)]" />
      <header className="mb-10 border-b border-border pb-8">
        <div className="mb-4 inline-flex items-center rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-semibold tracking-wide text-background">
          {post.category}
        </div>
        <h1 className="mb-4 text-balance font-heading text-3xl font-bold leading-tight text-foreground md:text-5xl">
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
      </header>

      <div className="bw-prose prose prose-lg max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {post.tags && post.tags.length > 0 && (
        <footer className="mt-12 border-t border-border pt-8">
          <div className="flex items-center gap-2">
            <strong className="text-foreground">Tags:</strong>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
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
