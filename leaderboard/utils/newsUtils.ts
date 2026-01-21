/**
 * 新闻文章工具函数
 * 基于通用 articleUtils 的封装
 */

import {
  createArticleUtils,
  formatDate as formatArticleDate,
} from './articleUtils';
import { NewsPost, NewsMetadata } from '../types/news';

// 创建新闻专用的工具函数实例
const newsUtils = createArticleUtils('news');

/**
 * 获取指定语言的所有新闻文章元数据
 * @param language 语言 ('zh' | 'en')
 * @returns 新闻元数据数组，按日期降序排序
 */
export function getAllNewsPosts(language: 'zh' | 'en'): NewsMetadata[] {
  return newsUtils.getAllPosts(language);
}

/**
 * 获取指定slug的新闻文章完整内容
 * @param slug 文章slug
 * @param language 语言
 * @returns 新闻文章对象
 */
export function getNewsPost(
  slug: string,
  language: 'zh' | 'en'
): NewsPost | null {
  return newsUtils.getPost(slug, language);
}

/**
 * 获取指定语言的最新新闻文章
 * @param language 语言
 * @returns 新闻文章对象
 */
export function getLatestNewsPost(language: 'zh' | 'en'): NewsPost | null {
  return newsUtils.getLatestPost(language);
}

/**
 * 获取所有新闻文章的slugs
 * @param language 语言
 * @returns slug数组
 */
export function getAllNewsSlugs(language: 'zh' | 'en'): string[] {
  return newsUtils.getAllSlugs(language);
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
