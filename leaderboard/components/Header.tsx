import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip, Select, Space, Modal, Typography } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  GlobalOutlined,
  GithubOutlined,
  FormOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { cn } from '../utils/cn';
import { SubmissionGuideModal } from './SubmissionGuideModal';
import { FormulaRuleModal } from './FormulaRuleModal';
import { StarOutlined } from './StarOutlined';

// 获取系统当前月份（格式：YYYY-MM）
const getCurrentSystemMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const Header: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [months, setMonths] = useState<string[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [isFormulaModalVisible, setIsFormulaModalVisible] = useState(false);
  const [isSubmissionGuideVisible, setIsSubmissionGuideVisible] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取月份列表（从静态文件）
  useEffect(() => {
    const fetchMonths = async () => {
      setLoadingMonths(true);
      try {
        const res = await fetch('/data/months.json');
        const data = await res.json();
        setMonths(data.months || []);
      } catch (error) {
        console.error('Error fetching months:', error);
      } finally {
        setLoadingMonths(false);
      }
    };

    fetchMonths();
  }, []);

  // 监听滚动，实现导航栏收窄
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 获取当前路径，判断是否在博客页面、新闻页面和排行榜页面
  const isBlogPage = router.pathname.startsWith('/blog');
  const isNewsPage = router.pathname.startsWith('/news');
  const isAboutPage = router.pathname === '/about';
  const isHomePage =
    router.pathname === '/' || router.pathname.startsWith('/ranking');

  // 判断是否在需要月份选择器的页面
  const isRankingPage =
    router.pathname.startsWith('/ranking') ||
    router.pathname.startsWith('/compare') ||
    router.pathname.startsWith('/indicators');

  // 获取当前选中的月份
  const currentMonth =
    (router.query.month as string) ||
    (router.query.date as string) ||
    months[0];

  // 判断是否为实时月份
  const systemCurrentMonth = getCurrentSystemMonth();
  const latestMonth = months[0];
  const isLatestMonthCurrent = latestMonth === systemCurrentMonth;

  const handleLanguageChange = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleMonthChange = (newMonth: string) => {
    // 保留除了 month 和 date 之外的所有查询参数
    const { month, date, ...restQuery } = router.query;

    // 根据当前页面类型切换到对应的新月份页面
    if (router.pathname.startsWith('/compare')) {
      router.push({
        pathname: `/compare/${newMonth}`,
        query: restQuery,
      });
    } else if (router.pathname.startsWith('/indicators')) {
      router.push({
        pathname: `/indicators/${newMonth}`,
        query: restQuery,
      });
    } else if (router.pathname.startsWith('/models')) {
      // models页面路径格式为 /models/[id]/[date]
      const modelId = router.query.id as string;
      if (modelId) {
        // 从 restQuery 中移除 id，因为它是路径参数
        const { id, ...queryWithoutId } = restQuery;
        router.push({
          pathname: `/models/${modelId}/${newMonth}`,
          query: queryWithoutId,
        });
      }
    } else {
      // 默认跳转到ranking页面
      router.push({
        pathname: `/ranking/${newMonth}`,
        query: restQuery,
      });
    }
  };

  const showFormulaModal = () => {
    setIsFormulaModalVisible(true);
  };

  const handleFormulaModalCancel = () => {
    setIsFormulaModalVisible(false);
  };

  const showSubmissionGuide = () => {
    setIsSubmissionGuideVisible(true);
  };

  const handleSubmissionGuideCancel = () => {
    setIsSubmissionGuideVisible(false);
  };

  if (!mounted) {
    return null;
  }

  // 导航链接基础样式
  const navLinkBase = cn(
    'flex items-center gap-2',
    'px-4 py-2',
    'text-sm font-normal',
    'rounded-md',
    'transition-all duration-200',
    'cursor-pointer no-underline'
  );

  // 主导航样式（首页、News、About）
  const navLinkStyles = (isActive: boolean) =>
    cn(
      navLinkBase,
      isActive
        ? '!bg-blue-50 text-blue-600 font-semibold'
        : 'hover:bg-blue-50 hover:text-blue-600'
    );

  // 辅助按钮样式（榜单规则、贡献测评集）
  const actionButtonStyles = cn(
    'flex items-center gap-1.5',
    'px-3.5 py-2',
    'text-sm font-normal',
    'bg-transparent border-none',
    'rounded-md',
    'transition-colors duration-200',
    'cursor-pointer',
    'hover:text-blue-500'
  );

  // 图标按钮样式
  const iconButtonStyles = cn(
    'flex items-center justify-center',
    'text-gray-600',
    'border-none',
    'hover:bg-gray-100 hover:text-blue-500',
    '!transition-all !duration-200'
  );

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-1000',
        'bg-[#f0f2f550] backdrop-blur-md',
        'border-b border-gray-200',
        'shadow-sm',
        'transition-all duration-300',
        isScrolled && 'shadow-md'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          'px-8',
          'transition-all duration-300',
          isScrolled ? 'h-11' : 'h-14'
        )}
      >
        {/* Left Navigation */}
        <div className="flex flex-1 items-center">
          <nav className="flex flex-1 items-center gap-2">
            {/* 首页 */}
            <Link href="/" passHref legacyBehavior>
              <a className={navLinkStyles(isHomePage)}>
                <HomeOutlined className="text-lg" />
                <span>{t('nav.home_label')}</span>
              </a>
            </Link>

            {/* 月份榜单选择器 - 仅在 ranking 页面显示 */}
            {isRankingPage && months.length > 0 && (
              <div className="mx-1">
                <Select
                  value={currentMonth}
                  onChange={handleMonthChange}
                  loading={loadingMonths}
                  style={{ width: 180 }}
                  size="middle"
                  className="header-month-selector"
                >
                  {months.map((m) => {
                    const isLatestMonth = m === latestMonth;
                    const isRealTime = isLatestMonth && isLatestMonthCurrent;

                    return (
                      <Select.Option key={m} value={m}>
                        {isRealTime ? t('ranking.current_month_realtime') : m}
                      </Select.Option>
                    );
                  })}
                </Select>
              </div>
            )}

            {/* Blog */}
            <Link href="/blog" passHref legacyBehavior>
              <a className={navLinkStyles(isBlogPage)}>
                <FileTextOutlined className="text-lg" />
                <span>{t('nav.blog')}</span>
              </a>
            </Link>

            {/* News */}
            <Link href="/news" passHref legacyBehavior>
              <a className={navLinkStyles(isNewsPage)}>
                <FileTextOutlined className="text-lg" />
                <span>News</span>
              </a>
            </Link>
            {/* 榜单规则 - 仅在 ranking 页面显示 */}
            {isRankingPage && (
              <button className={actionButtonStyles} onClick={showFormulaModal}>
                <FormOutlined className="text-base" />
                <span>{t('evaluation_cases.formula_button')}</span>
              </button>
            )}

            {/* 贡献测评集 - 仅在 ranking 页面显示 */}
            {isRankingPage && (
              <button
                className={actionButtonStyles}
                onClick={showSubmissionGuide}
              >
                <StarOutlined className="text-base w-4 h-4" />
                <span>{t('nav.contribute_evaluation')}</span>
              </button>
            )}

            {/* 分隔线 - 仅在 ranking 页面显示 */}
            {isRankingPage && <div className="mx-3 h-5 w-px bg-gray-300"></div>}

            {/* About */}
            <Link href="/about" passHref legacyBehavior>
              <a className={navLinkStyles(isAboutPage)}>
                <InfoCircleOutlined className="text-lg" />
                <span>{t('nav.about')}</span>
              </a>
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* GitHub 图标 */}
          <Tooltip title={t('nav.github')}>
            <Button
              type="text"
              onClick={() =>
                window.open(
                  'https://github.com/actiontech/sql-llm-benchmark',
                  '_blank'
                )
              }
              className={iconButtonStyles}
              icon={<GithubOutlined style={{ fontSize: '18px' }} />}
            />
          </Tooltip>

          {/* 语言切换图标 */}
          <Tooltip
            title={i18n.language === 'en' ? '切换到中文' : 'Switch to English'}
          >
            <Button
              type="text"
              onClick={handleLanguageChange}
              className={iconButtonStyles}
              icon={<GlobalOutlined style={{ fontSize: '18px' }} />}
            />
          </Tooltip>
        </div>
      </div>

      {/* 榜单规则模块 */}
      <FormulaRuleModal
        visible={isFormulaModalVisible}
        onClose={handleFormulaModalCancel}
      />

      {/* 提交报告指南模块 */}
      <SubmissionGuideModal
        visible={isSubmissionGuideVisible}
        onClose={handleSubmissionGuideCancel}
      />
    </header>
  );
};;;;;;;;;;

export default Header;
