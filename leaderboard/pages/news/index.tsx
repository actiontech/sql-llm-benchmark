import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import { Pagination } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { NewsMetadata } from '../../types/news';
import { getAllNewsPosts } from '../../utils/newsUtils';
import { FeaturedNews } from '../../components/News/FeaturedNews';
import { NewsCard } from '../../components/News/NewsCard';
import styles from '../../styles/Article.module.css';

interface NewsListPageProps {
  zhPosts: NewsMetadata[];
  enPosts: NewsMetadata[];
}

const POSTS_PER_PAGE = 9; // 每页显示9篇文章

const NewsListPage: React.FC<NewsListPageProps> = ({ zhPosts, enPosts }) => {
  const { t, i18n } = useTranslation('common');
  const [currentLang, setCurrentLang] = useState<'zh' | 'en'>('zh');
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // 客户端挂载后获取真实的语言设置
  useEffect(() => {
    setMounted(true);
    setCurrentLang(i18n.language as 'zh' | 'en');
  }, [i18n.language]);

  const posts = currentLang === 'zh' ? zhPosts : enPosts;

  // 获取置顶文章（第一篇文章）
  const featuredPost = posts.find((item) => item.top) ?? posts?.[0];

  // 分页逻辑（只对非置顶文章分页）
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const currentPosts = posts.slice(startIndex, endIndex);

  // 监听语言变化
  useEffect(() => {
    setCurrentLang(i18n.language as 'zh' | 'en');
    setCurrentPage(1); // 切换语言时重置到第一页
  }, [i18n.language]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 服务器端渲染时使用默认内容，避免hydration错误
  if (!mounted) {
    return (
      <div className={styles.articlePageWrapper}>
        <Head>
          <title>{t('news.title')} - SCALE SQL LLM Leaderboard</title>
          <meta name="description" content={t('news.description')} />
        </Head>
      </div>
    );
  }

  return (
    <div className={styles.articlePageWrapper}>
      <Head>
        <title>{t('news.title')} - SCALE SQL LLM Leaderboard</title>
        <meta name="description" content={t('news.description')} />
        <meta property="og:title" content={t('news.title')} />
        <meta property="og:description" content={t('news.description')} />
      </Head>

      <main className={styles.articleMain}>
        {/* 置顶文章 */}
        {featuredPost && <FeaturedNews post={featuredPost} />}

        {/* 历史文章列表 */}
        <section className={styles.postsSection}>
          <div className={styles.postsContainer}>
            {currentPosts.length === 0 ? (
              <div className={styles.emptyState}>
                <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <p>{t('news.noPosts')}</p>
              </div>
            ) : (
              <>
                <ul className={styles.postsGrid}>
                  {currentPosts.map((post) => (
                    <NewsCard key={post.slug} post={post} />
                  ))}
                </ul>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.articlePagination}>
                    <Pagination
                      current={currentPage}
                      total={posts.length}
                      pageSize={POSTS_PER_PAGE}
                      onChange={handlePageChange}
                      showSizeChanger={false}
                      showQuickJumper
                      showTotal={(total) => t('pagination.total', { total })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const zhPosts = getAllNewsPosts('zh');
  const enPosts = getAllNewsPosts('en');

  return {
    props: {
      zhPosts,
      enPosts,
    },
  };
};

export default NewsListPage;

