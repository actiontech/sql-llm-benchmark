import React, { useRef, useState, useMemo, useEffect } from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import fs from "fs";
import path from "path";
import Head from "next/head";
import { useRouter } from "next/router";
import NProgress from 'nprogress'; // 导入 NProgress
import {
  Button,
  Card,
  Typography,
  Tooltip,
  Checkbox,
  Badge,
  Spin,
} from 'antd';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ActionType, ProTable } from '@ant-design/pro-table';
import {
  UpOutlined,
  DownOutlined,
  SearchOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

// 导入拆分的组件和工具
import { Model, RankingPageProps } from '../../types/ranking';
import { getLatestNewsPost, getNewsPost } from '../../utils/newsUtils';
import {
  getTopModelsByCategory,
  getMaxScoresByCategory,
} from '../../utils/ranking';
import { SubmissionGuideModal } from '../../components/SubmissionGuideModal';
import { FormulaRuleModal } from '../../components/FormulaRuleModal';
import { Podium } from '../../components/Podium';
import { createRankingTableColumns } from '../../components/RankingTableColumns';
import { RankingTableToolbar } from '../../components/RankingTableToolbar';
import { addRankingToModels } from '../../utils/rankingUtils';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const { Title, Paragraph, Text } = Typography;

// 获取系统当前月份（格式：YYYY-MM）
const getCurrentSystemMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const RankingPage: React.FC<RankingPageProps> = ({
  months,
  logoInfo,
  modelLogoInfo = {} as Record<string, { ext: string; originalName: string }>,
  zhNewsPost,
  enNewsPost,
}) => {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const { month: currentMonthParam } = router.query;
  const currentMonth = Array.isArray(currentMonthParam)
    ? currentMonthParam[0]
    : currentMonthParam || months[0]; // 确保 currentMonth 有值

  // 获取系统当前月份
  const systemCurrentMonth = getCurrentSystemMonth();
  // 判断最新月份是否为系统当前月份
  const latestMonth = months[0];
  const isLatestMonthCurrent = latestMonth === systemCurrentMonth;

  const actionRef = useRef<ActionType | undefined>(undefined);
  const [models, setModels] = useState<Model[]>([]); // 客户端状态管理 models
  const [mounted, setMounted] = useState(false); // 客户端挂载状态
  const [isLoading, setIsLoading] = useState(true); // 数据加载状态
  const [searchText, setSearchText] = useState<string>('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isSubmissionGuideVisible, setIsSubmissionGuideVisible] =
    useState<boolean>(false);
  const [isFormulaModalVisible, setIsFormulaModalVisible] =
    useState<boolean>(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [sortedInfo, setSortedInfo] = useState<any>({});
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [showCompareMode, setShowCompareMode] = useState<boolean>(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // 客户端挂载后设置 mounted 状态
  useEffect(() => {
    setMounted(true);
  }, []);

  // 客户端数据获取函数
  const fetchModels = async (month: string) => {
    setIsLoading(true);
    NProgress.start();
    try {
      const res = await fetch(`/data/eval_reports/models-${month}.json`);
      if (!res.ok) {
        throw new Error(`Failed to fetch models for month: ${month}`);
      }
      const jsonData = await res.json();
      const sortedModels = (jsonData.models || []).sort(
        (a: Model, b: Model) => {
          const scoreA = a.scores?.sql_optimization?.ability_score ?? 0;
          const scoreB = b.scores?.sql_optimization?.ability_score ?? 0;
          return scoreB - scoreA;
        }
      );
      setModels(sortedModels);
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([]); // 清空数据或显示错误状态
    } finally {
      setIsLoading(false);
      NProgress.done();
    }
  };

  // 在组件挂载和 currentMonth 变化时加载数据（仅在客户端挂载后）
  useEffect(() => {
    if (currentMonth && mounted) {
      fetchModels(currentMonth);
    }
  }, [currentMonth, mounted]);

  const handleTableChange = (
    pagination: any,
    filters: any,
    sorter: any,
    extra: any
  ) => {
    let newSortedInfo = sorter || {};
    if (Array.isArray(sorter)) {
      newSortedInfo = sorter[0] || {};
    }

    if (!newSortedInfo.order) {
      // 当用户取消排序时，恢复默认视觉状态（但数据仍是最后一次排序的状态）
      setSortedInfo({});
    } else {
      setSortedInfo({
        columnKey: newSortedInfo.columnKey,
        order: newSortedInfo.order,
      });
    }
  };

  const topModelsByCategory = useMemo(
    () => getTopModelsByCategory(models),
    [models]
  );

  const maxScoresByCategory = useMemo(
    () => getMaxScoresByCategory(models),
    [models]
  );

  const filteredModels = useMemo(() => {
    let data = [...models];

    if (sortedInfo.columnKey && sortedInfo.order) {
      data.sort((a, b) => {
        const { columnKey, order } = sortedInfo;

        if (columnKey === 'real_model_namne') {
          const valA = a.real_model_namne;
          const valB = b.real_model_namne;
          const compare = valA.localeCompare(valB);
          return order === 'descend' ? compare : -compare;
        }

        if (columnKey === 'releaseDate') {
          const valA = new Date(a.releaseDate).getTime();
          const valB = new Date(b.releaseDate).getTime();
          return order === 'descend' ? valA - valB : valB - valA;
        }

        const scoreA = a.scores?.[columnKey]?.ability_score ?? -1;
        const scoreB = b.scores?.[columnKey]?.ability_score ?? -1;

        return order === 'descend' ? scoreB - scoreA : scoreA - scoreB;
      });
    }

    const filteredData = data.filter((m: Model) =>
      m.real_model_namne.toLowerCase().includes(searchText.toLowerCase())
    );

    // 为过滤后的数据添加排名信息
    return addRankingToModels(filteredData, sortedInfo);
  }, [models, searchText, sortedInfo]);

  const showSubmissionGuide = () => {
    setIsSubmissionGuideVisible(true);
  };

  const handleSubmissionGuideCancel = () => {
    setIsSubmissionGuideVisible(false);
  };

  const showFormulaModal = () => {
    setIsFormulaModalVisible(true);
  };

  const handleFormulaModalCancel = () => {
    setIsFormulaModalVisible(false);
  };

  const handleMonthChange = (newMonth: string) => {
    NProgress.start();
    router.push(`/ranking/${newMonth}`);
  };

  const handleModelSelect = (modelId: string, checked: boolean) => {
    const newSelected = new Set(selectedModels);
    if (checked) {
      if (newSelected.size < 5) {
        // 最多选择5个模型
        newSelected.add(modelId);
      } else {
        // 已达到最大选择数量，给用户提示
        // 这里可以添加提示消息，比如使用antd的message
        return; // 不执行选择
      }
    } else {
      newSelected.delete(modelId);
    }
    setSelectedModels(newSelected);
  };

  const handleCompare = () => {
    if (selectedModels.size >= 2) {
      const modelIds = Array.from(selectedModels).join(',');
      NProgress.start();
      router.push(`/compare/${currentMonth}?models=${modelIds}`);
    }
  };

  const toggleCompareMode = () => {
    setShowCompareMode(!showCompareMode);
    if (!showCompareMode) {
      setSelectedModels(new Set()); // 清空选择
    }
  };

  useEffect(() => {
    if (isDescriptionExpanded && descriptionRef.current) {
      descriptionRef.current.style.maxHeight = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [i18n.language, isDescriptionExpanded]);

  const columns = useMemo(() => {
    const baseColumns = createRankingTableColumns({
      logoInfo,
      sortedInfo,
      maxScoresByCategory,
      currentMonth,
      t,
      isMobile,
    });

    if (showCompareMode) {
      // 在多选模式下，添加复选框列到表格开头
      return [
        {
          title: t('table.select'),
          dataIndex: 'select',
          key: 'select',
          width: 60,
          align: 'center' as const,
          render: (_: any, record: Model) => {
            const isSelected = selectedModels.has(record.id);
            const isDisabled = !isSelected && selectedModels.size >= 5;

            return (
              <Tooltip
                title={
                  isDisabled
                    ? t('compare.checkbox_tooltip.max_reached')
                    : isSelected
                      ? t('compare.checkbox_tooltip.deselect')
                      : t('compare.checkbox_tooltip.select')
                }
                placement="top"
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={(e) =>
                    handleModelSelect(record.id, e.target.checked)
                  }
                />
              </Tooltip>
            );
          },
        },
        ...baseColumns,
      ];
    }

    return baseColumns;
  }, [
    logoInfo,
    sortedInfo,
    maxScoresByCategory,
    currentMonth,
    t,
    showCompareMode,
    selectedModels,
    isMobile,
  ]);

  const pageTitle = t('seo.ranking_page.title', { month: currentMonth });
  const pageDescription = t('seo.ranking_page.description', {
    month: currentMonth,
  });
  const pageKeywords = t('seo.ranking_page.keywords', { month: currentMonth });
  const canonicalUrl = `http://sql-llm-leaderboard.com/ranking/${currentMonth}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={pageKeywords} />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />

        <meta property="twitter:url" content={canonicalUrl} />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={pageDescription} />
      </Head>
      <div
        className={cn(
          'min-h-screen w-full max-w-none p-0 box-border bg-[#f0f2f5]',
          '[&>*:first-child]:pt-0',
          '[&_.ant-pro-table-list-toolbar]:px-1!',
          '[&_..ant-pro-card]:bg-transparent!',
          '[&_.ant-pro-table-list-toolbar_.ant-pro-table-list-toolbar-left]:mb-0!',
          '[&_.ant-table-thead_.ant-table-column-has-sorters.ant-table-column-sort]:bg-[#e6f7ff] [&_.ant-table-thead_.ant-table-column-has-sorters.ant-table-column-sort]:shadow-[0_4px_8px_rgba(0,0,0,0.45)] [&_.ant-table-thead_.ant-table-column-has-sorters.ant-table-column-sort]:transition-all [&_.ant-table-thead_.ant-table-column-has-sorters.ant-table-column-sort]:duration-300 [&_.ant-table-thead_.ant-table-column-has-sorters.ant-table-column-sort]:ease-in-out'
        )}
      >
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
            marginBottom: '32px',
            background: 'linear-gradient(135deg, #f6f8fa 0%, #e9eef4 100%)',
            overflow: 'hidden',
          }}
        >
          <div
            className={cn(
              'relative overflow-hidden',
              'flex flex-col gap-6 p-0',
              'md:px-15 md:py-10 md:grid md:grid-cols-[1.5fr_1fr] md:grid-rows-[auto_auto_auto] md:gap-[60px]'
            )}
            style={{ position: 'relative' }}
          >
            {/* 1. 大标题 + 副标题（移动端/桌面均为第一项） */}
            <div className="z-2 text-left md:col-start-1 md:row-start-1">
              <Title
                level={1}
                className="whitespace-nowrap! text-[230px]! tracking-[-2px] max-md:text-[18vw]! max-md:tracking-[-2px] max-[375px]:text-[16vw]! max-[375px]:tracking-[-1px]"
                style={{
                  margin: 0,
                  fontWeight: 900,
                  color: '#2c3e50',
                  lineHeight: 1,
                  textShadow: '4px 4px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                {t('ranking.title')}
              </Title>
              <Title
                level={2}
                style={{
                  marginTop: 10,
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#34495e',
                  textAlign: 'left',
                  lineHeight: '1.3',
                }}
              >
                <span>
                  <span style={{ color: '#1890ff', fontWeight: 800 }}>S</span>
                  QL{' '}
                  <span style={{ color: '#1890ff', fontWeight: 800 }}>
                    Ca
                  </span>
                  pability{' '}
                  <span style={{ color: '#1890ff', fontWeight: 800 }}>
                    Le
                  </span>
                  aderboard for LLMs
                </span>
              </Title>
              <Paragraph
                style={{
                  fontSize: '18px',
                  color: '#555',
                  lineHeight: '1.7',
                }}
              >
                {t('ranking.description_part1')}{' '}
                <Link
                  href="https://github.com/actiontech/sql-llm-benchmark"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#1890ff',
                    fontSize: '25px',
                    fontWeight: 'bold',
                  }}
                >
                  GitHub
                </Link>
                {t('ranking.description_part2')}{' '}
                <Button
                  type="link"
                  onClick={showSubmissionGuide}
                  style={{
                    padding: 0,
                    fontSize: '18px',
                    height: 'auto',
                    lineHeight: 'inherit',
                    color: '#1890ff',
                    fontWeight: 'bold',
                    verticalAlign: 'baseline',
                  }}
                >
                  {t('ranking.description_part3_trigger')}
                </Button>
              </Paragraph>
            </div>

            {/* 2. 右侧描述卡片（移动端第二项，桌面右侧第一行） */}
            <div className="z-2 flex min-h-0 flex-col md:col-start-2 md:row-start-1">
              <div className="rounded-xl border border-black/8 bg-white/60 px-6 py-5 text-left shadow-[0_4px_12px_rgba(0,0,0,0.05)] md:px-8 md:py-6">
                <div
                  ref={descriptionRef}
                  className="relative overflow-hidden transition-[max-height] duration-500 ease-in-out"
                  style={{
                    maxHeight: isDescriptionExpanded
                      ? `${descriptionRef.current?.scrollHeight || 'none'}px`
                      : '120px',
                  }}
                >
                  <Paragraph style={{ fontSize: 16 }} className="m-0 text-base text-left leading-[1.7] text-[#34495e]">
                    {t('ranking.full_description')}
                  </Paragraph>
                  {!isDescriptionExpanded && (
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-2 h-[50px] bg-[linear-gradient(to_top,rgba(233,238,244,1),rgba(233,238,244,0))]"
                      aria-hidden
                    />
                  )}
                </div>
                {descriptionRef.current &&
                  descriptionRef.current.scrollHeight > 120 &&
                  isDescriptionExpanded && (
                    <div style={{ textAlign: 'center' }}>
                      <Button
                        type="link"
                        shape="round"
                      className="group"
                      icon={<UpOutlined className="transition-transform duration-300 ease-in-out group-hover:-translate-y-[2px]" />}
                        onClick={() => setIsDescriptionExpanded(false)}
                        style={{
                          marginTop: '15px',
                          background: 'rgba(24,114,255, 0.1)',
                          color: '#1890ff',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {t('actions.collapse')}
                      </Button>
                    </div>
                  )}
                {descriptionRef.current &&
                  descriptionRef.current.scrollHeight > 120 &&
                  !isDescriptionExpanded && (
                    <div style={{ textAlign: 'center' }}>
                      <Button
                        type="link"
                        shape="round"
                      className="group"
                      icon={<DownOutlined className="transition-transform duration-300 ease-in-out group-hover:-translate-y-[2px]" />}
                        onClick={() => setIsDescriptionExpanded(true)}
                        style={{
                          marginTop: '15px',
                          background: 'rgba(24,114,255, 0.1)',
                          color: '#1890ff',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {t('actions.expand')}
                      </Button>
                    </div>
                  )}
              </div>
            </div>

            {/* 3. Podium 领奖台（移动端第三项，桌面左侧第三行） */}
            <div className="z-2 md:col-start-1 md:row-start-2">
              <Podium
                topModelsByCategory={topModelsByCategory}
                logoInfo={logoInfo}
                modelLogoInfo={modelLogoInfo}
                onCategoryClick={(category) => {
                  setSortedInfo({
                    columnKey: category,
                    order: 'descend',
                  });
                }}
              />
            </div>

            {/* 4. 当月测评文章卡片（仅桌面显示，移动端隐藏） */}
            <div className="hidden md:col-start-2 md:row-start-2 md:block">
              {(() => {
                // 根据当前语言选择对应的博客
                const currentLang = i18n.language
                  ?.toLowerCase()
                  .startsWith('zh')
                  ? 'zh'
                  : 'en';
                const monthlyNewsPost =
                  currentLang === 'zh' ? zhNewsPost : enNewsPost;
                // 如果当前语言没有，尝试使用另一种语言
                const displayPost = monthlyNewsPost || zhNewsPost || enNewsPost;

                return displayPost ? (
                  <Link
                    href={`/news/${displayPost.slug}`}
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      marginTop: '24px',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1.8 / 1',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow =
                          '0 8px 24px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow =
                          '0 4px 12px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      {/* 背景图片 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundImage: "url('/blog/images/news.png')",
                          backgroundSize: 'cover',
                          backgroundPosition: 'left center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      />

                      {/* 文字内容 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '90%',
                          textAlign: 'center',
                          color: '#fff',
                          zIndex: 1,
                          paddingLeft: '22%'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            lineHeight: '1.4',
                          }}
                        >
                          {displayPost.title}
                        </div>
                        {displayPost.excerpt && (
                          <div
                            style={{
                              marginTop: '8px',
                              fontSize: '14px',
                              opacity: 0.9,
                              fontWeight: 400,
                              lineHeight: '1.5',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as const,
                              overflow: 'hidden',
                            }}
                          >
                            {displayPost.excerpt}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: '12px',
                            fontSize: '14px',
                            opacity: 0.85,
                            fontWeight: 400,
                          }}
                        >
                          {currentLang === 'zh'
                            ? '点击查看详情'
                            : 'Click to view details'}{' '}
                          →
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : null;
              })()}
            </div>
          </div>

          {/* 搜索框 + 对比模式提示 */}
          <div
            className={cn(
              'mt-6 mb-3',
              'max-md:space-y-4',
              'md:flex md:flex-wrap md:items-center md:justify-end md:gap-3'
            )}
          >
            <div className="w-full md:w-[400px] md:shrink-0">
              <div className="relative group">
                <SearchOutlined
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                  style={{ fontSize: 18 }}
                />
                <input
                  type="text"
                  placeholder={t('actions.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    actionRef.current?.reload();
                  }}
                />
              </div>
            </div>

            {/* 对比模式提示：移动端和桌面端统一样式 */}
            {showCompareMode && (
              <div className="w-full md:w-full">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                  <div className="bg-blue-500 p-1.5 rounded-lg text-white mt-0.5 shrink-0">
                    <AppstoreOutlined style={{ fontSize: 16 }} />
                  </div>
                  <div className="flex-1 text-xs leading-relaxed text-blue-800">
                    <p className="font-semibold mb-1 text-blue-900">
                      {t('compare.compare_mode_tip_title')}
                    </p>
                    {t('compare.compare_mode_tip_content', { count: 5 }).split('5').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className="font-bold text-blue-600">5</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 表格 */}
          {!mounted || isLoading ? (
            <Card
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 10px 10px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e8e8e8',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Spin size="large" />
            </Card>
          ) : (
            <ProTable<Model>
              actionRef={actionRef}
              columns={columns}
              dataSource={filteredModels}
              rowKey="id"
              search={false}
              loading={isLoading}
                scroll={{ x: 'max-content' }}
              options={{
                reload: isMobile ? false : () => fetchModels(currentMonth),
                density: !isMobile,
                fullScreen: !isMobile,
                setting: !isMobile,
              }}
              onChange={handleTableChange}
              headerTitle={
                <RankingTableToolbar
                  months={months}
                  currentMonth={currentMonth}
                  latestMonth={latestMonth}
                  isLatestMonthCurrent={isLatestMonthCurrent}
                  t={t}
                  showCompareMode={showCompareMode}
                  selectedModelsCount={selectedModels.size}
                  onMonthChange={handleMonthChange}
                  onFormulaClick={showFormulaModal}
                  onContributeClick={showSubmissionGuide}
                  onToggleCompareMode={toggleCompareMode}
                  onReload={() => fetchModels(currentMonth)}
                  onStartCompare={handleCompare}
                />
              }
              pagination={false}
              rowClassName={(record: Model, idx) => {
                const rank = idx + 1;
                const isSelected = showCompareMode && selectedModels.has(record.id);

                // 排名行：前三名加粗
                const rankRowClass =
                  rank === 1 || rank === 2 || rank === 3 ? 'font-bold' : '';

                // 对比模式：过渡 + hover 浅蓝背景
                const compareModeClass = showCompareMode
                  ? 'transition-colors duration-200 hover:!bg-[#f0f9ff]'
                  : '';

                // 选中行：左侧 4px 蓝条 + 浅蓝背景，td 透明以显示行背景
                const selectedRowClass = isSelected
                  ? '!bg-[linear-gradient(to_right,#1890ff_0_4px,#e6f7ff_4px_100%)] hover:!bg-[linear-gradient(to_right,#1890ff_0_4px,#d4edff_4px_100%)] [&_td]:!bg-transparent'
                  : '';

                return cn('hover:cursor-pointer', rankRowClass, compareModeClass, selectedRowClass);
              }}
              tableStyle={{
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 10px 10px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e8e8e8',
              }}
              cardProps={{
                bodyStyle: { padding: 0 },
              }}
              onRow={(record) => {
                return {
                  onClick: (event) => {
                    const target = event.target as HTMLElement;

                    // 在多选模式下，让整行点击切换选择状态
                    if (showCompareMode) {
                      // 如果点击的是复选框本身，让其正常工作，不重复处理
                      if (
                        target.closest("input[type='checkbox']") ||
                        target.closest('.ant-checkbox')
                      ) {
                        return;
                      }
                      // 整行点击时切换选择状态
                      const isCurrentlySelected = selectedModels.has(record.id);
                      handleModelSelect(record.id, !isCurrentlySelected);
                      return;
                    }

                    // 如果点击的是按钮、链接或复选框相关元素，不跳转
                    if (
                      target.closest('button') ||
                      target.closest('a') ||
                      target.closest("input[type='checkbox']") ||
                      target.closest('.ant-checkbox')
                    ) {
                      return;
                    }

                    NProgress.start();
                    router.push(`/models/${record.id}/${currentMonth}`);
                  },
                  style: showCompareMode
                    ? {
                      cursor: 'pointer',
                      userSelect: 'none',
                    }
                    : undefined,
                };
              }}
            />
          )}
        </Card>

        <SubmissionGuideModal
          visible={isSubmissionGuideVisible}
          onClose={handleSubmissionGuideCancel}
        />

        <FormulaRuleModal
          visible={isFormulaModalVisible}
          onClose={handleFormulaModalCancel}
        />
      </div>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const dataDir = path.join(process.cwd(), 'public', 'data', 'eval_reports');
  const filenames = fs.readdirSync(dataDir);

  const months = filenames
    .filter((name) => name.startsWith('models-') && name.endsWith('.json'))
    .map((name) => name.replace('models-', '').replace('.json', ''));

  const paths = months.map((month) => ({
    params: { month },
  }));

  return {
    paths,
    fallback: false, // 如果访问的月份不存在，则返回404
  };
};

export const getStaticProps: GetStaticProps<RankingPageProps> = async (
  context
) => {
  const dataDir = path.join(process.cwd(), 'public', 'data', 'eval_reports');
  const filenames = fs.readdirSync(dataDir);

  const months = filenames
    .filter((name) => name.startsWith('models-') && name.endsWith('.json'))
    .map((name) => name.replace('models-', '').replace('.json', ''))
    .sort((a, b) => b.localeCompare(a));

  const logosDir = path.join(process.cwd(), 'public', 'logos');
  const logoFiles = fs.readdirSync(logosDir);
  const logoInfo: Record<string, string> = {};

  logoFiles.forEach((file) => {
    const name = path.parse(file).name;
    const ext = path.parse(file).ext.substring(1);
    if (!logoInfo[name] || ext === 'svg') {
      logoInfo[name] = ext;
    }
  });

  // 读取 modelLogo 文件夹中的图标（优先使用）
  const modelLogoDir = path.join(process.cwd(), 'public', 'modelLogo');
  const modelLogoInfo: Record<string, { ext: string; originalName: string }> =
    {};

  if (fs.existsSync(modelLogoDir)) {
    const modelLogoFiles = fs.readdirSync(modelLogoDir);
    modelLogoFiles.forEach((file) => {
      const name = path.parse(file).name;
      const nameLower = name.toLowerCase().replace(/\s/g, '-');
      const ext = path.parse(file).ext.substring(1);
      // 使用小写作为键，存储扩展名和原始文件名
      if (!modelLogoInfo[nameLower] || ext === 'svg') {
        modelLogoInfo[nameLower] = { ext, originalName: name };
      }
    });
  }

  // 读取当月的博客文章（中文和英文版本），当月没有则回退到最新文章
  const month = context.params?.month as string;
  let zhNewsPost = null;
  let enNewsPost = null;

  if (month) {
    const newsSlug = `scale-${month.replace('-', '')}`;

    // 使用 getNewsPost 获取文章，它已经处理了新的目录结构和 index.md
    const zhPost = getNewsPost(newsSlug, 'zh') ?? getLatestNewsPost('zh');
    if (zhPost) {
      zhNewsPost = {
        slug: zhPost.slug,
        title: zhPost.title,
        date: zhPost.date,
        author: zhPost.author,
        excerpt: zhPost.excerpt,
        language: 'zh' as const,
      };
    }

    const enPost = getNewsPost(newsSlug, 'en') ?? getLatestNewsPost('en');
    if (enPost) {
      enNewsPost = {
        slug: enPost.slug,
        title: enPost.title,
        date: enPost.date,
        author: enPost.author,
        excerpt: enPost.excerpt,
        language: 'en' as const,
      };
    }
  }

  return {
    props: {
      months,
      logoInfo,
      modelLogoInfo,
      zhNewsPost,
      enNewsPost,
    },
  };
};

export default RankingPage;
