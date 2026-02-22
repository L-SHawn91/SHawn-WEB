import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export type Post = {
    slug: string;
    title: string;
    date: string;
    description: string;
    category: string;
    tags: string[];
    image?: string;
    content: string;
    readingTime: string;
    featured?: boolean;
};

function normalizeTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];
    const normalized = tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.replace(/^#+/, '').trim())
        .filter(Boolean);

    return Array.from(new Set(normalized));
}

export function getAllPosts(): Post[] {
    if (!fs.existsSync(postsDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    const allPosts = fileNames
        .filter((fileName) => fileName.endsWith('.mdx'))
        .map((fileName) => {
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
                tags: normalizeTags(data.tags),
                image: data.image,
                content,
                readingTime: Math.ceil(readingTime(content).minutes) + '분 소요',
                featured: data.featured || false,
            } as Post;
        });

    return allPosts.sort((a, b) => (new Date(a.date) > new Date(b.date) ? -1 : 1));
}

export function getPostBySlug(slug: string): Post | null {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);

    if (!fs.existsSync(fullPath)) {
        return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
        slug,
        title: data.title || 'Untitled',
        date: new Date(data.date).toISOString().split('T')[0],
        description: data.description || '',
        category: data.category || 'research',
        tags: normalizeTags(data.tags),
        image: data.image,
        content,
        readingTime: Math.ceil(readingTime(content).minutes) + '분 소요',
        featured: data.featured || false,
    } as Post;
}

export function getPostsByCategory(category: string): Post[] {
    const allPosts = getAllPosts();
    return allPosts.filter((post) => post.category.toLowerCase() === category.toLowerCase());
}

export function getFeaturedPosts(): Post[] {
    const allPosts = getAllPosts();
    return allPosts.filter((post) => post.featured);
}
