/**
 * 新闻相关类型定义
 * 基于通用 Article 类型的类型别名
 */

import {
  ArticlePost,
  ArticleMetadata,
  ArticleListProps,
  ArticleDetailProps,
} from './article';

export type NewsPost = ArticlePost;
export type NewsMetadata = ArticleMetadata;
export type NewsListProps = ArticleListProps;
export type NewsDetailProps = ArticleDetailProps;
