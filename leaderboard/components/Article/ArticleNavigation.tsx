import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { ArticleMetadata } from '../../types/article';
import styles from '../../styles/Article.module.css';

interface ArticleNavigationProps {
  prevPost: ArticleMetadata | null;
  nextPost: ArticleMetadata | null;
  articleType: 'blog' | 'news';
}

export const ArticleNavigation: React.FC<ArticleNavigationProps> = ({
  prevPost,
  nextPost,
  articleType,
}) => {
  const { t } = useTranslation('common');

  return (
    <nav className={styles.articleNavigation}>
      {prevPost && (
        <Link href={`/${articleType}/${prevPost.slug}`} className={styles.articleNavigationLink}>
          <div className={styles.articleNavigationPrev}>
            <div className={styles.articleNavigationIcon}>
              <LeftOutlined />
            </div>
            <div className={styles.articleNavigationContent}>
              <div className={styles.articleNavigationLabel}>
                {articleType === 'blog' ? t('blog.previous') : t('news.previous')}
              </div>
              <div className={styles.articleNavigationTitle}>{prevPost.title}</div>
            </div>
          </div>
        </Link>
      )}
      {!prevPost && <div className={styles.articleNavigationSpacer} />}
      
      {nextPost && (
        <Link href={`/${articleType}/${nextPost.slug}`} className={styles.articleNavigationLink}>
          <div className={styles.articleNavigationNext}>
            <div className={styles.articleNavigationContent}>
              <div className={styles.articleNavigationLabel}>
                {articleType === 'blog' ? t('blog.next') : t('news.next')}
              </div>
              <div className={styles.articleNavigationTitle}>{nextPost.title}</div>
            </div>
            <div className={styles.articleNavigationIcon}>
              <RightOutlined />
            </div>
          </div>
        </Link>
      )}
      {!nextPost && <div className={styles.articleNavigationSpacer} />}
    </nav>
  );
};

