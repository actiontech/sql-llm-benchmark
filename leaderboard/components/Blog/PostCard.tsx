/**
 * 博客文章卡片组件
 * 基于通用 ArticleCard 组件的薄包装
 */

import React from 'react';
import { ArticleCard } from '../Article/ArticleCard';
import { BlogMetadata } from '../../types/blog';
import styles from '../../styles/Article.module.css';

interface PostCardProps {
  post: BlogMetadata;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <ArticleCard 
      post={post} 
      articleType="blog" 
      styleModule={styles} 
    />
  );
};
