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
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.1),transparent_58%)]" />
      <header className="mb-10 border-b border-black/10 pb-8">
        <div className="mb-4 inline-flex items-center rounded-full border border-black bg-black px-3 py-1 text-xs font-semibold tracking-wide text-white">
          {post.category}
        </div>
        <h1 className="mb-4 text-balance font-heading text-3xl font-bold leading-tight text-black md:text-5xl">
          {post.title}
        </h1>
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-black/60">
          <time dateTime={post.date}>{post.date}</time>
          <span>•</span>
          <span>{post.readingTime}</span>
        </div>
        {post.description && (
          <p className="rounded-r-md border-l-4 border-black bg-white px-4 py-3 text-base italic leading-relaxed text-black/75 md:text-lg">
            {post.description}
          </p>
        )}
      </header>

      <div className="bw-prose prose prose-lg max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {post.tags && post.tags.length > 0 && (
        <footer className="mt-12 border-t border-black/10 pt-8">
          <div className="flex items-center gap-2">
            <strong className="text-black">Tags:</strong>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/20 bg-white px-3 py-1 text-sm text-black/75"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </footer>
      )}

      <div className="mt-12 border-t border-black/10 pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center rounded-md border border-black bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
        >
          ← 블로그로 돌아가기
        </Link>
      </div>
    </article>
  );
}
