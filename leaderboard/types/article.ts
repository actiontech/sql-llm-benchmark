/**
 * 通用文章类型定义
 * 适用于 Blog、News 等所有文章类型的内容
 */

export interface ArticlePost {
  slug: string; // URL slug
  title: string; // 标题
  date: string; // 发布日期 (YYYY-MM-DD)
  author: string; // 作者
  excerpt: string; // 摘要
  tags: string[]; // 标签
  category?: string; // 分类
  content: string; // 完整内容（Markdown）
  language: 'zh' | 'en'; // 语言
  top?: boolean; // 是否置顶
  coverImage: string | null; // 封面图片路径（可选，使用 null 而不是 undefined 以支持 JSON 序列化）
}

export interface ArticleMetadata extends Omit<ArticlePost, 'content'> {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  category?: string;
  language: 'zh' | 'en';
  top?: boolean;
  coverImage: string | null;
}

export interface ArticleListProps {
  posts: ArticleMetadata[];
}

export interface ArticleDetailProps {
  post: ArticlePost;
}

