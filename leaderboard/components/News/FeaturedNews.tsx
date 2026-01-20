/**
 * 新闻置顶文章组件
 * 基于通用 FeaturedArticle 组件的薄包装
 */

import React from 'react';
import { FeaturedArticle } from '../Article/FeaturedArticle';
import { NewsMetadata } from '../../types/news';
import styles from '../../styles/Article.module.css';

interface FeaturedNewsProps {
  post: NewsMetadata;
  variant?: 'link' | 'detail';
}

export const FeaturedNews: React.FC<FeaturedNewsProps> = ({ post, variant = 'link' }) => {
  return (
    <FeaturedArticle 
      post={post} 
      variant={variant}
      articleType="news" 
      styleModule={styles} 
    />
  );
};

