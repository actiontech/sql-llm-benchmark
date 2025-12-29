import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BlogPost, BlogMetadata } from '../types/blog';

const BLOG_DIR = path.join(process.cwd(), 'public', 'blog');

/**
 * 获取指定语言的所有博客文章元数据
 * @param language 语言 ('zh' | 'en')
 * @returns 博客元数据数组，按日期降序排序
 */
export function getAllBlogPosts(language: 'zh' | 'en'): BlogMetadata[] {
    const langDir = path.join(BLOG_DIR, language);

    // 如果目录不存在，返回空数组
    if (!fs.existsSync(langDir)) {
        return [];
    }

    const files = fs.readdirSync(langDir).filter(file => file.endsWith('.md'));

    const posts = files.map(filename => {
        const slug = filename.replace(/\.md$/, '');
        const filePath = path.join(langDir, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);

        return {
            slug,
            title: data.title || '',
            date: data.date || '',
            author: data.author || '',
            excerpt: data.excerpt || '',
            tags: data.tags || [],
            language,
        };
    });

    // 按日期降序排序
    return posts.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

/**
 * 获取指定slug的博客文章完整内容
 * @param slug 文章slug
 * @param language 语言
 * @returns 博客文章对象
 */
export function getBlogPost(slug: string, language: 'zh' | 'en'): BlogPost | null {
    try {
        const filePath = path.join(BLOG_DIR, language, `${slug}.md`);

        if (!fs.existsSync(filePath)) {
            return null;
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);

        return {
            slug,
            title: data.title || '',
            date: data.date || '',
            author: data.author || '',
            excerpt: data.excerpt || '',
            tags: data.tags || [],
            content,
            language,
        };
    } catch (error) {
        console.error(`Error reading blog post ${slug}:`, error);
        return null;
    }
}

/**
 * 获取所有博客文章的slugs
 * @param language 语言
 * @returns slug数组
 */
export function getAllBlogSlugs(language: 'zh' | 'en'): string[] {
    const langDir = path.join(BLOG_DIR, language);

    if (!fs.existsSync(langDir)) {
        return [];
    }

    const files = fs.readdirSync(langDir).filter(file => file.endsWith('.md'));
    return files.map(filename => filename.replace(/\.md$/, ''));
}

/**
 * 格式化日期显示
 * @param dateString 日期字符串
 * @param language 语言
 * @returns 格式化后的日期
 */
export function formatDate(dateString: string, language: 'zh' | 'en'): string {
    const date = new Date(dateString);

    if (language === 'zh') {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

