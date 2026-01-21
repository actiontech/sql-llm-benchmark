import React, { useRef, useState, useMemo, useEffect } from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import fs from "fs";
import path from "path";
import Head from "next/head";
import { useRouter } from "next/router";
import NProgress from 'nprogress'; // 导入 NProgress
import {
  Button,
  Select,
  Card,
  Typography,
  Space,
  Tooltip,
  Input,
  Modal,
  Checkbox,
  Badge,
} from 'antd';

import { useTranslation } from 'react-i18next';
import styles from '../../styles/Container.module.css';
import Link from 'next/link';
import { ActionType, ProTable } from '@ant-design/pro-table';
import {
  UpOutlined,
  DownOutlined,
  GithubOutlined, // 导入 Github 图标
  RightOutlined,
  FormOutlined, // 导入 FormOutlined 图标
  SwapOutlined,
  CloseOutlined,
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
import { addRankingToModels } from '../../utils/rankingUtils';

const { Search } = Input;
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

  // 客户端数据获取函数
  const fetchModels = async (month: string) => {
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
      NProgress.done();
    }
  };

  // 在组件挂载和 currentMonth 变化时加载数据
  useEffect(() => {
    if (currentMonth) {
      fetchModels(currentMonth);
    }
  }, [currentMonth]);

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
      <div className={styles.container}>
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
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              padding: '40px 60px',
              position: 'relative',
              overflow: 'hidden',
              gap: '60px',
            }}
          >
            {/* 背景光效 */}
            <div className={styles.heroGlow1}></div>
            <div className={styles.heroGlow2}></div>

            {/* 左侧栏: 包含标题、简述和领奖台 */}
            <div
              style={{
                flex: 1.5,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 2,
              }}
            >
              <div style={{ textAlign: 'left', marginBottom: '40px' }}>
                <Title
                  level={1}
                  className={styles.scaleTitle}
                  style={{
                    margin: 0,
                    fontSize: '230px',
                    fontWeight: 900,
                    color: '#2c3e50',
                    letterSpacing: '-2px',
                    lineHeight: 1,
                    textShadow: '4px 4px 8px rgba(0, 0, 0, 0.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('ranking.title')}
                </Title>
                <Title
                  level={2}
                  style={{
                    margin: '10px 0 24px 0',
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

                {/* Scale博客入口 - 已注释 */}
                {/* <div style={{ marginTop: "24px", marginBottom: "15px", width: "fit-content" }}>
                  <Link
                    href="https://opensource.actionsky.com/category/%e5%bc%80%e6%ba%90%e4%ba%a7%e5%93%81/scale/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        padding: "20px 32px",
                        borderRadius: "12px",
                        boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.3)";
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-50%",
                          right: "-10%",
                          width: "200px",
                          height: "200px",
                          background: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "50%",
                          pointerEvents: "none",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <FormOutlined
                            style={{
                              fontSize: "28px",
                              color: "#ffffff",
                            }}
                          />
                          <div>
                            <div
                              style={{
                                color: "#ffffff",
                                fontSize: "20px",
                                fontWeight: "700",
                                lineHeight: "1.3",
                                marginBottom: "4px",
                              }}
                            >
                              {t("blog.viewBlog")}
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "14px",
                                fontWeight: "400",
                              }}
                            >
                              {t("blog.description")}
                            </div>
                          </div>
                        </div>
                        <RightOutlined
                          style={{
                            fontSize: "20px",
                            color: "#ffffff",
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                </div> */}
              </div>

              {/* 领奖台模块 */}
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

            {/* 右侧栏: 详细描述 */}
            <div
              style={{
                flex: 1,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <div className={styles.descriptionWrapper}>
                <div
                  ref={descriptionRef}
                  className={`${styles.descriptionContent} ${isDescriptionExpanded ? styles.expanded : ''}`}
                  style={{
                    maxHeight: isDescriptionExpanded
                      ? `${descriptionRef.current?.scrollHeight || 'none'}px`
                      : '120px',
                    position: 'relative',
                  }}
                >
                  <Paragraph
                    style={{
                      fontSize: '16px',
                      color: '#34495e',
                      lineHeight: '1.7',
                      margin: 0,
                    }}
                    className={styles.descriptionText}
                  >
                    {t('ranking.full_description')}
                  </Paragraph>
                  {!isDescriptionExpanded && (
                    <div className={styles.descriptionMask} />
                  )}
                </div>
                {descriptionRef.current &&
                  descriptionRef.current.scrollHeight > 120 &&
                  isDescriptionExpanded && (
                    <div style={{ textAlign: 'center' }}>
                      <Button
                        type="link"
                        shape="round"
                        icon={<UpOutlined className={styles.expandIcon} />}
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
                        icon={<DownOutlined className={styles.expandIcon} />}
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

              {/* 当月测评文章卡片 */}
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
                        height: '180px',
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
                          color: '#4A3728',
                          zIndex: 1,
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

          {/* 搜索框 - 表格上方 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: 24,
              padding: '0 24px',
            }}
          >
            <Search
              key="search"
              placeholder={t('search model name')}
              allowClear
              onSearch={(val) => {
                setSearchText(val);
                actionRef.current?.reload();
              }}
              style={{ width: 300 }}
            />
          </div>

          {/* 对比模式提示 */}
          {showCompareMode && (
            <Card
              style={{
                marginBottom: '16px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #91caff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1890ff',
                  fontSize: '14px',
                }}
              >
                <SwapOutlined
                  style={{ marginRight: '8px', fontSize: '16px' }}
                />
                <span>{t('compare.compare_mode_tip')}</span>
              </div>
            </Card>
          )}

          {/* 表格 */}
          <ProTable<Model>
            actionRef={actionRef}
            columns={columns}
            dataSource={filteredModels}
            rowKey="id"
            search={false}
            options={{
              reload: () => fetchModels(currentMonth), // 调用客户端数据获取函数
              density: true,
              fullScreen: true,
              setting: true,
            }}
            onChange={handleTableChange}
            headerTitle={
              <Space size="middle">
                {/* 日期选择器 */}
                <Select
                  value={currentMonth}
                  onChange={handleMonthChange}
                  style={{ width: 180 }}
                  size="middle"
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

                {/* 榜单规则按钮 */}
                <Button icon={<FormOutlined />} onClick={showFormulaModal}>
                  {t('evaluation_cases.formula_button')}
                </Button>

                {/* 贡献测评集按钮 */}
                <Button icon={<GithubOutlined />} onClick={showSubmissionGuide}>
                  {t('nav.contribute_evaluation')}
                </Button>

                {/* 分隔线 */}
                <div
                  style={{
                    width: 1,
                    height: 24,
                    background: '#d9d9d9',
                    margin: '0 8px',
                  }}
                />

                {/* 模型对比按钮 */}
                <Button
                  key="compare-toggle"
                  type={showCompareMode ? 'default' : 'primary'}
                  onClick={toggleCompareMode}
                  icon={showCompareMode ? <CloseOutlined /> : <SwapOutlined />}
                  style={{
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {showCompareMode
                    ? t('compare.exit_compare_mode')
                    : t('compare.toggle_compare_mode')}
                </Button>
                {showCompareMode && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#f0f9ff',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid #91caff',
                      }}
                    >
                      <Badge
                        count={selectedModels.size}
                        showZero
                        style={{ backgroundColor: '#1890ff' }}
                      />
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '14px',
                          color: '#1890ff',
                          fontWeight: 'bold',
                        }}
                      >
                        {t('compare.selected_models_count', {
                          count: selectedModels.size,
                        })}
                      </span>
                    </div>
                    {selectedModels.size >= 2 && (
                      <Button
                        key="start-compare"
                        type="primary"
                        onClick={handleCompare}
                        style={{
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          padding: '4px 12px',
                        }}
                      >
                        {t('compare.start_compare', {
                          count: selectedModels.size,
                        })}
                      </Button>
                    )}
                  </>
                )}
              </Space>
            }
            pagination={false}
            rowClassName={(record: Model, idx) => {
              const rank = idx + 1;
              const classes = [];

              // 基础排名样式
              if (rank === 1) classes.push(styles.rank1Row);
              else if (rank === 2) classes.push(styles.rank2Row);
              else if (rank === 3) classes.push(styles.rank3Row);
              else
                classes.push(
                  idx % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven
                );

              // 在多选模式下添加额外样式
              if (showCompareMode) {
                classes.push(styles.compareMode);
                const isSelected = selectedModels.has(record.id);
                if (isSelected) {
                  classes.push(styles.selectedRow);
                }
              }

              return classes.filter(Boolean).join(' ');
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
