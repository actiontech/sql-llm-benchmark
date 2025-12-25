import React, { useState, useEffect, useRef } from 'react';
import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Typography, Divider, Tag, Space, Button, Spin } from 'antd';
import {
    ClockCircleOutlined,
    UserOutlined,
    TagsOutlined,
    VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { BlogPost } from '../../types/blog';
import { getBlogPost, getAllBlogSlugs } from '../../utils/blogUtils';
import { MarkdownRenderer } from '../../components/Blog/MarkdownRenderer';
import styles from '../../styles/Blog.module.css';
import containerStyles from '../../styles/Container.module.css';

const { Title } = Typography;

// 客户端日期格式化函数
const formatDate = (dateString: string, language: 'zh' | 'en'): string => {
    const date = new Date(dateString);

    if (language === 'zh') {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

interface BlogDetailPageProps {
    zhPost: BlogPost | null;
    enPost: BlogPost | null;
}

const BlogDetailPage: React.FC<BlogDetailPageProps> = ({ zhPost, enPost }) => {
    const { t, i18n } = useTranslation('common');
    const [currentLang, setCurrentLang] = useState<'zh' | 'en'>('zh');
    const [mounted, setMounted] = useState(false);
    const [showTopButton, setShowTopButton] = useState(false);
    const parallaxRef = useRef<HTMLDivElement>(null);
    const articleRef = useRef<HTMLElement>(null);

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

    // 视差滚动效果 - 让正文卡片比背景移动更快
    useEffect(() => {
        const handleScroll = () => {
            if (parallaxRef.current && articleRef.current) {
                const scrolled = window.pageYOffset;
                const parallax = parallaxRef.current;
                const article = articleRef.current;
                const heroHeight = 400; // hero区域高度

                // 只在hero区域可见时应用视差效果
                if (scrolled < heroHeight) {
                    // 背景图片向上移动，速度较慢（视差效果）
                    parallax.style.transform = `translateY(${scrolled * 0.3}px)`;

                    // 正文卡片向上移动更快，产生侵入效果
                    // 负值表示向上移动，速度比背景快，产生立体感
                    article.style.transform = `translateY(${scrolled * -0.3}px)`;
                } else {
                    // 滚动超过hero区域后，保持最终位置
                    parallax.style.transform = `translateY(${heroHeight * 0.3}px)`;
                    article.style.transform = `translateY(${heroHeight * -0.3}px)`;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        // 初始化时调用一次，确保初始状态正确
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 监听滚动，显示/隐藏 TOP 按钮
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowTopButton(scrollTop > 400);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 返回顶部
    const scrollToTop = () => {
        // 立即重置视差效果，避免延迟
        if (parallaxRef.current && articleRef.current) {
            parallaxRef.current.style.transform = 'translateY(0px)';
            articleRef.current.style.transform = 'translateY(0px)';
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // 根据当前语言选择对应的文章
    const post = currentLang === 'zh' ? zhPost : enPost;

    // 如果当前语言没有文章，尝试使用另一种语言
    const displayPost = post || zhPost || enPost;

    if (!displayPost) {
        return (
            <div className={styles.blogDetailPage}>
                <div className={styles.emptyState}>
                    <h2>{t('blog.notFound')}</h2>
                    <Link href="/blog">
                        <Button type="primary">
                            {t('blog.backToList')}
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }


    // 服务器端渲染时显示加载状态，避免hydration错误
    if (!mounted) {
        return (
            <div className={styles.blogDetailPage}>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.blogDetailPage}>
            <Head>
                <title>{displayPost.title} - SCALE SQL LLM Leaderboard</title>
                <meta name="description" content={displayPost.excerpt} />
                <meta property="og:title" content={displayPost.title} />
                <meta property="og:description" content={displayPost.excerpt} />
                <meta property="og:type" content="article" />
            </Head>

            {/* Hero Section */}
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
                        {displayPost.title}
                    </Title>
                </div>
            </div>

            {/* Article Content */}
            <article ref={articleRef} className={styles.blogDetailArticle}>
                <header className={styles.blogDetailHeader}>
                    {/* <Title level={1} className={styles.blogDetailTitle}>
                        {displayPost.title}
                    </Title> */}

                    <div className={styles.blogDetailMeta}>
                        <Space size={16} wrap>
                            <span className={styles.blogDetailMetaItem}>
                                <ClockCircleOutlined style={{ marginRight: 6 }} />
                                {formatDate(displayPost.date, displayPost.language)}
                            </span>
                            <span className={styles.blogDetailMetaItem}>
                                <UserOutlined style={{ marginRight: 6 }} />
                                {displayPost.author}
                            </span>
                        </Space>
                    </div>

                    {displayPost.tags && displayPost.tags.length > 0 && (
                        <div className={styles.blogDetailTags}>
                            <TagsOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                            {displayPost.tags.map(tag => (
                                <Tag key={tag} className={styles.blogDetailTag}>
                                    {tag}
                                </Tag>
                            ))}
                        </div>
                    )}

                    <Divider />
                </header>

                {/* Article Content */}
                <div className={styles.blogDetailContent}>
                    <MarkdownRenderer content={displayPost.content} />
                </div>
            </article>

            {/* TOP Button - Fixed on Right Side */}
            {showTopButton && (
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<VerticalAlignTopOutlined />}
                    onClick={scrollToTop}
                    className={styles.topButton}
                    aria-label="返回顶部"
                />
            )}
        </div>
    );
};

export const getStaticPaths: GetStaticPaths = async () => {
    const zhSlugs = getAllBlogSlugs('zh');
    const enSlugs = getAllBlogSlugs('en');

    const allSlugs = Array.from(new Set([...zhSlugs, ...enSlugs]));

    return {
        paths: allSlugs.map(slug => ({
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

    return {
        props: {
            zhPost,
            enPost,
        },
    };
};

export default BlogDetailPage;

