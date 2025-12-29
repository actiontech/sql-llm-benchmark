/**
 * 博客相关类型定义
 */

export interface BlogPost {
    slug: string;           // URL slug
    title: string;          // 标题
    date: string;           // 发布日期 (YYYY-MM-DD)
    author: string;         // 作者
    excerpt: string;        // 摘要
    tags: string[];         // 标签
    content: string;        // 完整内容（Markdown）
    language: 'zh' | 'en';  // 语言
}

export interface BlogMetadata {
    slug: string;
    title: string;
    date: string;
    author: string;
    excerpt: string;
    tags: string[];
    language: 'zh' | 'en';
}

export interface BlogListProps {
    posts: BlogMetadata[];
}

export interface BlogDetailProps {
    post: BlogPost;
}

