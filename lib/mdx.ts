import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export type PostMeta = {
    slug: string;
    title: string;
    date: string;
    description: string;
    category: string;
    kind?: string;
    tags: string[];
    image?: string;
    readingTime: string;
    featured?: boolean;
};

export type Post = PostMeta & {
    content: string;
};

function normalizeTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];
    const normalized = tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.replace(/^#+/, '').trim())
        .filter(Boolean);

    return Array.from(new Set(normalized));
}

function getPostFiles(): string[] {
    if (!fs.existsSync(postsDirectory)) return [];
    return fs.readdirSync(postsDirectory).filter((fileName) => fileName.endsWith('.mdx'));
}

function parsePostFile(fileName: string): Post {
    const slug = fileName.replace(/\.mdx$/, '');
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
        slug,
        title: data.title || 'Untitled',
        date: new Date(data.date).toISOString().split('T')[0],
        description: data.description || '',
        category: data.category || 'research',
        kind: data.kind || undefined,
        tags: normalizeTags(data.tags),
        image: data.image,
        content,
        readingTime: Math.ceil(readingTime(content).minutes) + '분 소요',
        featured: data.featured || false,
    };
}

function toPostMeta({ content: _content, ...meta }: Post): PostMeta {
    return meta;
}

function sortNewestFirst<T extends PostMeta>(posts: T[]): T[] {
    return posts.sort((a, b) => (new Date(a.date) > new Date(b.date) ? -1 : 1));
}

export function getAllPosts(): Post[] {
    return sortNewestFirst(getPostFiles().map(parsePostFile));
}

export function getAllPostMeta(): PostMeta[] {
    return sortNewestFirst(getPostFiles().map((fileName) => toPostMeta(parsePostFile(fileName))));
}

export function getPostBySlug(slug: string): Post | null {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    if (!fs.existsSync(fullPath)) return null;
    return parsePostFile(`${slug}.mdx`);
}

export function getPostsByCategory(category: string): Post[] {
    return getAllPosts().filter((post) => post.category.toLowerCase() === category.toLowerCase());
}

export function getFeaturedPosts(): PostMeta[] {
    return getAllPostMeta().filter((post) => post.featured);
}
