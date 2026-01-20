import React, { useState, useEffect } from 'react';
import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Tag, Button, Spin, BackTop } from 'antd';
import { TagsOutlined } from '@ant-design/icons';
import { BlogPost, BlogMetadata } from '../../types/blog';
import { getBlogPost, getAllBlogSlugs, getAllBlogPosts } from '../../utils/blogUtils';
import { MarkdownRenderer } from '../../components/Blog/MarkdownRenderer';
import { FeaturedPost } from '../../components/Blog/FeaturedPost';
import { TableOfContents } from '../../components/Blog/TableOfContents';
import { ArticleNavigation } from '../../components/Article/ArticleNavigation';
import styles from '../../styles/Article.module.css';

interface BlogDetailPageProps {
  zhPost: BlogPost | null;
  enPost: BlogPost | null;
  zhPrevPost: BlogMetadata | null;
  zhNextPost: BlogMetadata | null;
  enPrevPost: BlogMetadata | null;
  enNextPost: BlogMetadata | null;
}

const BlogDetailPage: React.FC<BlogDetailPageProps> = ({ 
  zhPost, 
  enPost,
  zhPrevPost,
  zhNextPost,
  enPrevPost,
  enNextPost
}) => {
  const { t, i18n } = useTranslation('common');
  const [currentLang, setCurrentLang] = useState<'zh' | 'en'>('zh');
  const [mounted, setMounted] = useState(false);

  // 获取标准化的语言代码
  const getNormalizedLang = (lang: string): 'zh' | 'en' => {
    if (lang && lang.toLowerCase().startsWith('zh')) {
      return 'zh';
    }
    return 'en';
  };

  // 客户端挂载后获取真实的语言设置
  useEffect(() => {
    setMounted(true);
    setCurrentLang(getNormalizedLang(i18n.language));
  }, []);

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(getNormalizedLang(lng));
    };

    // 监听 i18n 语言变化事件
    i18n.on('languageChanged', handleLanguageChange);

    // 初始化时设置当前语言
    setCurrentLang(getNormalizedLang(i18n.language));

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // 根据当前语言选择对应的文章
  const post = currentLang === 'zh' ? zhPost : enPost;
  const prevPost = currentLang === 'zh' ? zhPrevPost : enPrevPost;
  const nextPost = currentLang === 'zh' ? zhNextPost : enNextPost;

  // 如果当前语言没有文章，尝试使用另一种语言
  const displayPost = post || zhPost || enPost;
  const displayPrevPost = prevPost || zhPrevPost || enPrevPost;
  const displayNextPost = nextPost || zhNextPost || enNextPost;

  if (!displayPost) {
    return (
      <div className={styles.articleDetailPage}>
        <div className={styles.emptyState}>
          <h2>{t('blog.notFound')}</h2>
          <Link href="/blog">
            <Button type="primary">{t('blog.backToList')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 服务器端渲染时显示加载状态，避免hydration错误
  if (!mounted) {
    return (
      <div className={styles.articleDetailPage}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.articleDetailPage}>
      <Head>
        <title>{displayPost.title} - SCALE SQL LLM Leaderboard</title>
        <meta name="description" content={displayPost.excerpt} />
        <meta property="og:title" content={displayPost.title} />
        <meta property="og:description" content={displayPost.excerpt} />
        <meta property="og:type" content="article" />
      </Head>

      {/* Featured Post Header */}
      <FeaturedPost post={displayPost} variant="detail" />
      {/* Tags Section */}
      {displayPost.tags && displayPost.tags.length > 0 && (
        <div className={styles.articleDetailTagsSection}>
          <TagsOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
          {displayPost.tags.map((tag) => (
            <Tag key={tag} className={styles.articleDetailTag}>
              {tag}
            </Tag>
          ))}
        </div>
      )}

      {/* Article Content with TOC */}
      <div className={styles.articleDetailContentWrapper}>
        <article className={styles.articleDetailArticle}>
          <div className={styles.articleDetailContent}>
            <MarkdownRenderer content={displayPost.content} />
          </div>
          
          {/* Article Navigation */}
          <ArticleNavigation 
            prevPost={displayPrevPost}
            nextPost={displayNextPost}
            articleType="blog"
          />
        </article>

        {/* Table of Contents - Only visible on >= 1366px */}
        <aside className={styles.articleDetailTOC}>
          <TableOfContents content={displayPost.content} />
        </aside>
      </div>

      {/* BackTop Button */}
      <BackTop className="z-50!" />
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const zhSlugs = getAllBlogSlugs('zh');
  const enSlugs = getAllBlogSlugs('en');

  const allSlugs = Array.from(new Set([...zhSlugs, ...enSlugs]));

  return {
    paths: allSlugs.map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;

  // 获取中文和英文版本
  const zhPost = getBlogPost(slug, 'zh');
  const enPost = getBlogPost(slug, 'en');

  // 如果两个版本都不存在，返回404
  if (!zhPost && !enPost) {
    return {
      notFound: true,
    };
  }

  // 获取所有文章列表（用于导航）
  const zhPosts = getAllBlogPosts('zh');
  const enPosts = getAllBlogPosts('en');

  // 查找当前文章的索引并获取上一篇/下一篇文章
  const findAdjacentPosts = (posts: BlogMetadata[], currentSlug: string) => {
    const currentIndex = posts.findIndex(post => post.slug === currentSlug);
    if (currentIndex === -1) {
      return { prevPost: null, nextPost: null };
    }
    
    // 由于文章按日期降序排序，所以：
    // prevPost 是索引 +1（更早的文章）
    // nextPost 是索引 -1（更新的文章）
    const prevPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
    const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
    
    return { prevPost, nextPost };
  };

  const zhAdjacent = findAdjacentPosts(zhPosts, slug);
  const enAdjacent = findAdjacentPosts(enPosts, slug);

  return {
    props: {
      zhPost,
      enPost,
      zhPrevPost: zhAdjacent.prevPost,
      zhNextPost: zhAdjacent.nextPost,
      enPrevPost: enAdjacent.prevPost,
      enNextPost: enAdjacent.nextPost,
    },
  };
};

export default BlogDetailPage;
