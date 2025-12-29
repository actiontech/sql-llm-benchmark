import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from 'antd';
import { HomeOutlined, FileTextOutlined, GlobalOutlined } from '@ant-design/icons';
import styles from '../styles/Header.module.css';

const Header: React.FC = () => {
    const { t, i18n } = useTranslation('common');
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 监听滚动，实现导航栏收窄
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setIsScrolled(scrollTop > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 获取当前路径，判断是否在博客页面
    const isBlogPage = router.pathname.startsWith('/blog');
    const isHomePage = router.pathname === '/' || router.pathname.startsWith('/ranking');

    const handleLanguageChange = () => {
        const newLang = i18n.language === 'en' ? 'zh' : 'en';
        i18n.changeLanguage(newLang);
    };

    if (!mounted) {
        return null;
    }

    return (
        <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
            <div className={styles.headerContainer}>
                {/* Logo - Left */}
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoText}>SCALE</span>
                </Link>

                {/* Navigation and Language Button - Right */}
                <div className={styles.headerRight}>
                    <nav className={styles.nav}>
                        <Link href="/" passHref legacyBehavior>
                            <a className={`${styles.navLink} ${isHomePage ? styles.active : ''}`}>
                                <HomeOutlined className={styles.navIcon} />
                                <span>{t('nav.home')}</span>
                            </a>
                        </Link>
                        <Link href="/blog" passHref legacyBehavior>
                            <a className={`${styles.navLink} ${isBlogPage ? styles.active : ''}`}>
                                <FileTextOutlined className={styles.navIcon} />
                                <span>{t('nav.blog')}</span>
                            </a>
                        </Link>
                    </nav>

                    {/* Language Button - Rightmost */}
                    <div className={styles.headerActions}>
                        <Tooltip title={i18n.language === 'en' ? '切换到中文' : 'Switch to English'}>
                            <Button
                                type="text"
                                onClick={handleLanguageChange}
                                className={styles.languageButton}
                                icon={<GlobalOutlined />}
                            >
                                <span className={styles.languageText}>
                                    {i18n.language === 'en' ? '中文' : 'EN'}
                                </span>
                            </Button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
