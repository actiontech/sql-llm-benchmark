import React from 'react';
import Link from 'next/link';
import { ArticleMetadata } from '../../types/article';
import { CategoryTag } from '../Blog/CategoryTag';

interface FeaturedArticleProps {
  post: ArticleMetadata;
  variant?: 'link' | 'detail'; // 'link' 为链接模式（列表页），'detail' 为详情页模式
  articleType: 'blog' | 'news'; // 用于生成正确的链接
  styleModule: any; // CSS Module 样式对象
}

// 客户端日期格式化函数
const formatDate = (dateString: string, language: 'zh' | 'en'): string => {
  const date = new Date(dateString);

  if (language === 'zh') {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
};

export const FeaturedArticle: React.FC<FeaturedArticleProps> = ({ 
  post, 
  variant = 'link',
  articleType,
  styleModule: styles
}) => {
  const featuredBgClass =
    articleType === 'news' ? styles.featuredImageBgNews : styles.featuredImageBgBlog;

  const content = (
    <div className={styles.featuredContent}>
      {/* 左侧内容 */}
      <div className={styles.featuredLeft}>
        {post.category && (
          <CategoryTag category={post.category} baseClassName={styles.featuredCategory} />
        )}
        <h1 className={styles.featuredTitle}>{post.title}</h1>
        <div className={styles.featuredMeta}>
          <span className={styles.featuredAuthor}>{post.author}</span>
          <span className={styles.featuredDate}>
            {formatDate(post.date, post.language).toUpperCase()}
          </span>
        </div>
      </div>
      {/* 右侧图片 */}
      <div className={styles.featuredRight}>
        <div className={styles.featuredImage}>
          {post.coverImage ? (
            // 使用自定义封面图
            <>
              <img 
                src={post.coverImage} 
                alt={post.title}
                className={`${styles.featuredImageBg} ${featuredBgClass}`}
                style={{ 
                  objectFit: 'initial', 
                  objectPosition: 'left center',
                  height: '100%'
                }}
              />
              <div className={styles.featuredImageText}>{post.title}</div>
            </>
          ) : (
            // 使用默认渐变背景
            <>
              <div className={`${styles.featuredImageBg} ${featuredBgClass}`} />
              <div className={styles.featuredImageText}>{post.title}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className={styles.featuredSection}>
      <article className={styles.featuredArticle}>
        {variant === 'link' ? (
          <Link href={`/${articleType}/${post.slug}`} className={styles.featuredLink}>
            {content}
          </Link>
        ) : (
          <div className={styles.featuredDetail}>
            {content}
          </div>
        )}
      </article>
    </section>
  );
};

