import React from 'react';
import Link from 'next/link';
import { ArticleMetadata } from '../../types/article';
import { CategoryTag } from '../Blog/CategoryTag';

interface ArticleCardProps {
  post: ArticleMetadata;
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

export const ArticleCard: React.FC<ArticleCardProps> = ({ 
  post,
  articleType,
  styleModule: styles
}) => {
  const imageBgClass =
    articleType === 'news' ? styles.postCardImageBgNews : styles.postCardImageBgBlog;

  return (
    <li className={styles.postCardItem}>
      <Link href={`/${articleType}/${post.slug}`} className={styles.postCardLink}>
        <article className={styles.postCard}>
          {/* 上方图片 */}
          <div className={styles.postCardImage}>
            {post.coverImage ? (
              // 使用自定义封面图
              <>
                <img 
                  src={post.coverImage} 
                  alt={post.title}
                  className={`${styles.postCardImageBg} ${imageBgClass}`}
                  style={{ 
                    objectFit: 'cover', 
                    objectPosition: 'left center',
                    width: '100%',
                    height: '100%'
                  }}
                />
                <div className={styles.postCardImageText}>{post.title}</div>
              </>
            ) : (
              // 使用默认渐变背景
              <>
                <div className={`${styles.postCardImageBg} ${imageBgClass}`} />
                <div className={styles.postCardImageText}>{post.title}</div>
              </>
            )}
          </div>
          {/* 下方内容 */}
          <div className={styles.postCardContent}>
            {post.category && (
              <CategoryTag category={post.category} baseClassName={styles.postCardCategory} />
            )}
            <h2 className={styles.postCardTitle}>{post.title}</h2>
            <div className={styles.postCardMeta}>
              <span className={styles.postCardAuthor}>{post.author}</span>
              <span className={styles.postCardDate}>
                {formatDate(post.date, post.language).toUpperCase()}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
};

