/**
 * 新闻文章卡片组件
 * 基于通用 ArticleCard 组件的薄包装
 */

import React from 'react';
import { ArticleCard } from '../Article/ArticleCard';
import { NewsMetadata } from '../../types/news';
import styles from '../../styles/Article.module.css';

interface NewsCardProps {
  post: NewsMetadata;
}

export const NewsCard: React.FC<NewsCardProps> = ({ post }) => {
  return (
    <ArticleCard 
      post={post} 
      articleType="news" 
      styleModule={styles} 
    />
  );
};

