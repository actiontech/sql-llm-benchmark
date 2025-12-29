import React, { useState, useEffect, useRef } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import { Typography, Pagination, Input, Card } from 'antd';
import { FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import { BlogMetadata } from '../../types/blog';
import { getAllBlogPosts } from '../../utils/blogUtils';
import { BlogListItem } from '../../components/Blog/BlogListItem';
import styles from '../../styles/Blog.module.css';

const { Title, Paragraph } = Typography;
const { Search } = Input;

interface BlogListPageProps {
    zhPosts: BlogMetadata[];
    enPosts: BlogMetadata[];
}

const POSTS_PER_PAGE = 10; // 每页显示10篇文章

const BlogListPage: React.FC<BlogListPageProps> = ({ zhPosts, enPosts }) => {
    const { t, i18n } = useTranslation('common');
    const [currentLang, setCurrentLang] = useState<'zh' | 'en'>('zh');
    const [mounted, setMounted] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const parallaxRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // 客户端挂载后获取真实的语言设置
    useEffect(() => {
        setMounted(true);
        setCurrentLang(i18n.language as 'zh' | 'en');
    }, [i18n.language]);

    // 视差滚动效果
    useEffect(() => {
        const handleScroll = () => {
            if (parallaxRef.current && contentRef.current) {
                const scrolled = window.pageYOffset;
                const parallax = parallaxRef.current;
                const content = contentRef.current;
                const heroHeight = 400; // hero区域高度

                // 只在hero区域可见时应用视差效果
                if (scrolled < heroHeight) {
                    // 底图向上移动，速度较慢（视差效果）
                    parallax.style.transform = `translateY(${scrolled * 0.3}px)`;

                    // 内容区域向上移动更快，产生侵入效果
                    // 负值表示向上移动，速度比背景快
                    content.style.transform = `translateY(${scrolled * -0.2}px)`;
                } else {
                    // 滚动超过hero区域后，重置transform
                    parallax.style.transform = `translateY(${heroHeight * 0.3}px)`;
                    content.style.transform = `translateY(${heroHeight * -0.2}px)`;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const posts = currentLang === 'zh' ? zhPosts : enPosts;

    // 搜索过滤
    const filteredPosts = posts.filter(post => {
        if (!searchText) return true;
        const searchLower = searchText.toLowerCase();
        return (
            post.title.toLowerCase().includes(searchLower) ||
            post.excerpt.toLowerCase().includes(searchLower) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
    });

    // 分页逻辑
    const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const currentPosts = filteredPosts.slice(startIndex, endIndex);

    // 监听语言变化
    useEffect(() => {
        setCurrentLang(i18n.language as 'zh' | 'en');
        setCurrentPage(1); // 切换语言时重置到第一页
    }, [i18n.language]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearch = (value: string) => {
        setSearchText(value);
        setCurrentPage(1); // 搜索时重置到第一页
    };

    // 服务器端渲染时使用默认内容，避免hydration错误
    if (!mounted) {
        return (
            <div className={styles.blogPageWrapper}>
                <Head>
                    <title>{t('blog.title')} - SCALE SQL LLM Leaderboard</title>
                    <meta name="description" content={t('blog.description')} />
                </Head>
                <div className={styles.blogHero}>
                    <div className={styles.blogHeroContent}>
                        <FileTextOutlined className={styles.blogHeaderIcon} />
                        <Title level={1} className={styles.blogHeaderTitle}>
                            {t('blog.title')}
                        </Title>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.blogPageWrapper}>
            <Head>
                <title>{t('blog.title')} - SCALE SQL LLM Leaderboard</title>
                <meta name="description" content={t('blog.description')} />
                <meta property="og:title" content={t('blog.title')} />
                <meta property="og:description" content={t('blog.description')} />
            </Head>

            {/* Hero Section with Parallax Background */}
            <div className={styles.blogHero}>
                <div ref={parallaxRef} className={styles.blogParallaxBg}>
                    <div
                        className={styles.blogParallaxImage}
                        style={{
                            backgroundImage: 'url(/blog/images/bg5.jpg)'
                        }}
                    />
                </div>
                <div className={styles.blogHeroContent}>
                    <Title level={1} className={styles.blogHeaderTitle}>
                        {t('blog.title')}
                    </Title>
                    <Paragraph className={styles.blogHeaderDescription}>
                        {t('blog.description')}
                    </Paragraph>

                </div>
            </div>

            {/* Blog Content - Card Container */}
            <div ref={contentRef} className={styles.blogContent}>
                <div className={styles.blogContentContainer}>
                    <div className={styles.blogMainContent}>
                        {currentPosts.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                                <p>{t('blog.noPosts')}</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.blogList}>
                                    {currentPosts.map(post => (
                                        <BlogListItem key={post.slug} post={post} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className={styles.blogPagination}>
                                        <Pagination
                                            current={currentPage}
                                            total={filteredPosts.length}
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

                    {/* Sidebar */}
                    <aside className={styles.blogSidebar}>
                        <Card className={styles.sidebarCard}>
                            <div className={styles.sidebarSection}>
                                <h3 className={styles.sidebarTitle}>{t('blog.search', { defaultValue: '搜索' })}</h3>
                                <Search
                                    placeholder={t('blog.searchPlaceholder', { defaultValue: '搜索文章...' })}
                                    allowClear
                                    onSearch={handleSearch}
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            handleSearch('');
                                        }
                                    }}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export const getStaticProps: GetStaticProps = async () => {
    const zhPosts = getAllBlogPosts('zh');
    const enPosts = getAllBlogPosts('en');

    return {
        props: {
            zhPosts,
            enPosts,
        },
    };
};

export default BlogListPage;
