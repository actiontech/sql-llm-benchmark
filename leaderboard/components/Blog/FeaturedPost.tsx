/**
 * 博客置顶文章组件
 * 基于通用 FeaturedArticle 组件的薄包装
 */

import React from 'react';
import { FeaturedArticle } from '../Article/FeaturedArticle';
import { BlogMetadata } from '../../types/blog';
import styles from '../../styles/Article.module.css';

interface FeaturedPostProps {
  post: BlogMetadata;
  variant?: 'link' | 'detail';
}

export const FeaturedPost: React.FC<FeaturedPostProps> = ({ post, variant = 'link' }) => {
  return (
    <FeaturedArticle 
      post={post} 
      variant={variant}
      articleType="blog" 
      styleModule={styles} 
    />
  );
};
