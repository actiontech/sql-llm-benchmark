/**
 * 博客文章工具函数
 * 基于通用 articleUtils 的封装
 */

import { createArticleUtils, formatDate as formatArticleDate } from './articleUtils';
import { BlogPost, BlogMetadata } from '../types/blog';

// 创建博客专用的工具函数实例
const blogUtils = createArticleUtils('blog');

/**
 * 获取指定语言的所有博客文章元数据
 * @param language 语言 ('zh' | 'en')
 * @returns 博客元数据数组，按日期降序排序
 */
export function getAllBlogPosts(language: 'zh' | 'en'): BlogMetadata[] {
  return blogUtils.getAllPosts(language);
}

/**
 * 获取指定slug的博客文章完整内容
 * @param slug 文章slug
 * @param language 语言
 * @returns 博客文章对象
 */
export function getBlogPost(slug: string, language: 'zh' | 'en'): BlogPost | null {
  return blogUtils.getPost(slug, language);
}

/**
 * 获取所有博客文章的slugs
 * @param language 语言
 * @returns slug数组
 */
export function getAllBlogSlugs(language: 'zh' | 'en'): string[] {
  return blogUtils.getAllSlugs(language);
}

/**
 * 格式化日期显示
 * @param dateString 日期字符串
 * @param language 语言
 * @returns 格式化后的日期
 */
export function formatDate(dateString: string, language: 'zh' | 'en'): string {
  return formatArticleDate(dateString, language);
}

