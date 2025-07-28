import React, { useRef, useState, useMemo, useEffect } from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import fs from "fs";
import path from "path";
import Head from "next/head";
import { useRouter } from "next/router";
import NProgress from "nprogress"; // 导入 NProgress
import {
  Button,
  Select,
  Card,
  Typography,
  Space,
  Tooltip,
  Input,
  Modal,
  List, // 导入 List 组件
} from "antd";

import { useTranslation } from "react-i18next";
import styles from "../../styles/Container.module.css";
import Link from "next/link";
import { ActionType, ProColumns, ProTable } from "@ant-design/pro-table";
import {
  TrophyFilled,
  EyeOutlined,
  UpOutlined,
  DownOutlined,
  PushpinFilled,
  GithubOutlined, // 导入 Github 图标
  RightOutlined,
  FormOutlined, // 导入 FormOutlined 图标
} from "@ant-design/icons";

const { Search } = Input;
const { Title, Paragraph, Text } = Typography;

interface Model {
  id: string;
  name: string;
  real_model_namne: string;
  description: string;
  releaseDate: string;
  type: string;
  parameters: string;
  organization: string;
  website: string;
  scores: Record<
    string,
    {
      ability_score: number;
      indicator_score: {
        indicator_actual_score: number;
        indicator_name: string;
      }[];
    }
  >;
  total_score?: number;
}

/**
 * @description 新版样式进度条
 * @param score 分数 (0-100)
 */
const StyledProgressBar: React.FC<{
  score: number;
  isHighestScore?: boolean;
}> = ({ score = 0, isHighestScore = false }) => {
  // 根据分数选择颜色，越高分颜色越深
  const getColor = (s: number): string => {
    if (s >= 85) return "#1D4F91"; // 深蓝色
    if (s >= 65) return "#4F88D1"; // 中等蓝色
    return "#A3C2F2"; // 明亮浅蓝
  };
  const barColor = getColor(score);

  // Main container must be relative for absolute children
  return (
    <div
      style={{
        width: "100%", // 占据整个列宽
        display: "flex", // 使用 flexbox 布局
        alignItems: "center", // 垂直居中对齐
        height: "24px", // 为组件设置标准高度以保证对齐
        position: "relative", // 确保内部元素可以相对定位
      }}
    >
      {/* 进度条部分 */}
      <div
        style={{
          width: `${score}%`,
          height: "12px",
          backgroundColor: barColor,
          borderRadius: "6px",
          transition: "width 0.4s ease",
          flexShrink: 0, // 防止进度条缩小
          maxWidth: `calc(100% - 45px)`, // 确保进度条不会占据所有空间，为分数气泡留出空间 (假设气泡宽度约40px + 5px间距)
        }}
      />

      {/* 分数气泡，通过 flexbox 布局紧跟在进度条末尾 */}
      <div
        style={{
          marginLeft: "5px", // 与进度条的固定间隙
          height: 22,
          padding: "0 8px", // 调整 padding 减少宽度
          backgroundColor: isHighestScore ? "#FFD700" : "white", // 亮金色
          border: `1px solid #e0e0e0`,
          borderRadius: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          whiteSpace: "nowrap", // 防止分数换行
          minWidth: "35px", // 确保气泡有最小宽度
          flexShrink: 0, // 防止气泡缩小
        }}
      >
        <span
          style={{
            color: isHighestScore ? "#8B572A" : "#1D4F91",
            fontWeight: "bold",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
const LogoImage: React.FC<{
  organization: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
  logoInfo: Record<string, string>;
}> = ({ organization, width, height, style, logoInfo }) => {
  const orgKey = organization.toLowerCase().replace(/\s/g, "-");
  const ext = logoInfo[orgKey];
  const src = ext ? `/logos/${orgKey}.${ext}` : "";

  if (!src) {
    return (
      <span style={{ ...style, width, height }}>
        {organization}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={organization}
      style={{ width, height, objectFit: "contain", ...style }}
    />
  );
};

interface RankingPageProps {
  months: string[];
  logoInfo: Record<string, string>;
}

const getTopModelsByCategory = (models: Model[]) => {
  const categories = [
    "sql_optimization",
    "dialect_conversion",
    "sql_understanding",
  ];
  const topModels: Record<string, Model | null> = {};

  categories.forEach((category) => {
    const modelsWithScores = models.filter(
      (m) => m.scores?.[category]?.ability_score != null
    );
    if (modelsWithScores.length === 0) {
      topModels[category] = null;
      return;
    }

    const sortedModels = [...modelsWithScores].sort((a, b) => {
      const scoreA = a.scores?.[category]?.ability_score ?? 0;
      const scoreB = b.scores?.[category]?.ability_score ?? 0;
      return scoreB - scoreA;
    });
    topModels[category] = sortedModels[0];
  });
  return topModels;
};

const SubmissionGuideModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { t } = useTranslation("common");
  const GITHUB_URL = "https://github.com/actiontech/sql-llm-benchmark";

  const requirements = [
    t("submission_guide.req1"),
    t("submission_guide.req2"),
    t("submission_guide.req3"),
    t("submission_guide.req4"),
    t("submission_guide.req5"),
    t("submission_guide.req6"),
  ];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t("actions.close")}
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<GithubOutlined />}
          href={GITHUB_URL}
          target="_blank"
        >
          {t("submission_guide.cta_button")}
        </Button>,
      ]}
      width="50%"
      style={{ top: 50, maxWidth: "800px" }}
      title={
        <Space>
          <GithubOutlined />
          <Text strong>{t("submission_guide.title")}</Text>
        </Space>
      }
    >
      <Paragraph>{t("submission_guide.intro")}</Paragraph>
      <Title level={5} style={{ marginTop: "24px" }}>
        {t("submission_guide.req_title")}
      </Title>
      <List
        bordered
        dataSource={requirements}
        renderItem={(item, index) => (
          <List.Item>
            <Text>
              <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                {index + 1}.
              </span>
              {item}
            </Text>
          </List.Item>
        )}
        style={{ background: "#f9f9f9", borderRadius: "8px" }}
      />
    </Modal>
  );
};

const RankingPage: React.FC<RankingPageProps> = ({ months, logoInfo }) => {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { month: currentMonthParam } = router.query;
  const currentMonth = Array.isArray(currentMonthParam)
    ? currentMonthParam[0]
    : currentMonthParam || months[0]; // 确保 currentMonth 有值

  const actionRef = useRef<ActionType | undefined>(undefined);
  const [models, setModels] = useState<Model[]>([]); // 客户端状态管理 models
  const [searchText, setSearchText] = useState<string>("");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isFormulaModalVisible, setIsFormulaModalVisible] =
    useState<boolean>(false); // 控制计算公式弹窗
  const [isSubmissionGuideVisible, setIsSubmissionGuideVisible] =
    useState<boolean>(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [sortedInfo, setSortedInfo] = useState<any>({});

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
      console.error("Error fetching models:", error);
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

  const maxScoresByCategory = useMemo(() => {
    const categories = [
      "sql_optimization",
      "dialect_conversion",
      "sql_understanding",
    ];
    const maxScores: Record<string, number> = {};

    categories.forEach((category) => {
      const scores = models
        .map((m) => m.scores?.[category]?.ability_score ?? 0)
        .filter((score) => score !== 0); // 过滤掉0分，因为0分可能表示无数据

      if (scores.length > 0) {
        maxScores[category] = Math.max(...scores);
      } else {
        maxScores[category] = 0; // 如果没有有效分数，设置为0
      }
    });
    return maxScores;
  }, [models]);

  const filteredModels = useMemo(() => {
    let data = [...models];

    if (sortedInfo.columnKey && sortedInfo.order) {
      data.sort((a, b) => {
        const { columnKey, order } = sortedInfo;

        if (columnKey === "real_model_namne") {
          const valA = a.real_model_namne;
          const valB = b.real_model_namne;
          const compare = valA.localeCompare(valB);
          return order === "ascend" ? compare : -compare;
        }

        if (columnKey === "releaseDate") {
          const valA = new Date(a.releaseDate).getTime();
          const valB = new Date(b.releaseDate).getTime();
          return order === "ascend" ? valA - valB : valB - valA;
        }

        const scoreA = a.scores?.[columnKey]?.ability_score ?? -1;
        const scoreB = b.scores?.[columnKey]?.ability_score ?? -1;

        return order === "ascend" ? scoreA - scoreB : scoreB - scoreA;
      });
    }

    const filteredData = data.filter((m: Model) =>
      m.real_model_namne.toLowerCase().includes(searchText.toLowerCase())
    );

    return filteredData;
  }, [models, searchText, sortedInfo]);

  const handleMonthChange = (newMonth: string) => {
    router.push(`/ranking/${newMonth}`);
  };

  const handleLanguageChange = () => {
    const newLang = i18n.language === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
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

  useEffect(() => {
    if (isDescriptionExpanded && descriptionRef.current) {
      descriptionRef.current.style.maxHeight = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [i18n.language, isDescriptionExpanded]);

  const columns: ProColumns<Model>[] = [
    {
      title: t("table.rank"),
      dataIndex: "rank",
      key: "rank",
      render: (_, record: Model, idx) => {
        const rank = idx + 1;
        let icon = null;
        let color = "";
        if (rank === 1) {
          icon = (
            <TrophyFilled style={{ fontSize: "24px", color: "#FFD700" }} />
          );
          color = "#FFD700";
        } else if (rank === 2) {
          icon = (
            <TrophyFilled style={{ fontSize: "20px", color: "#C0C0C0" }} />
          );
          color = "#C0C0C0";
        } else if (rank === 3) {
          icon = (
            <TrophyFilled style={{ fontSize: "16px", color: "#CD7F32" }} />
          );
          color = "#CD7F32";
        }
        return (
          <Space>
            {icon}
            <span
              style={{
                color: color,
                fontWeight: rank <= 3 ? "bold" : "normal",
              }}
            >
              {rank}
            </span>
          </Space>
        );
      },
      width: 100,
      align: "center",
    },
    {
      title: t("table.creator"),
      dataIndex: "organization",
      key: "organization",
      align: "center",
      render: (text, record) =>
        record.organization ? (
          <LogoImage
            organization={record.organization}
            logoInfo={logoInfo}
            width={60}
            height={60}
            style={{ verticalAlign: "middle" }}
          />
        ) : (
          <span>N/A</span>
        ),
      width: 120,
    },
    {
      title: (
        <span>
          {t("table.model")}
          {sortedInfo.columnKey === "real_model_namne" && (
            <PushpinFilled
              style={{ marginLeft: 4, fontSize: "16px", color: "#1890ff" }}
            />
          )}
        </span>
      ),
      dataIndex: "real_model_namne",
      key: "real_model_namne",
      align: "center",
      render: (text) => text,
      sorter: true,
      sortOrder:
        sortedInfo.columnKey === "real_model_namne" ? sortedInfo.order : false,
      showSorterTooltip: false,
    },
    {
      title: (
        <span>
          {t("table.releaseDate")}
          {sortedInfo.columnKey === "releaseDate" && (
            <PushpinFilled
              style={{ marginLeft: 4, fontSize: "16px", color: "#1890ff" }}
            />
          )}
        </span>
      ),
      dataIndex: "releaseDate",
      key: "releaseDate",
      align: "center",
      sorter: true,
      sortOrder:
        sortedInfo.columnKey === "releaseDate" ? sortedInfo.order : false,
      showSorterTooltip: false,
    },
    {
      title: t("table.type"),
      dataIndex: "type",
      key: "type",
      filters: true,
      onFilter: true,
      align: "center",
      render: (text: any) => {
        let translatedText = text;
        let backgroundColor = "";
        let textColor = "#333";

        if (text === "Chat") {
          translatedText = t("table.type_chat");
          backgroundColor = "#e6f7ff"; // 浅蓝色
          textColor = "#1890ff"; // 蓝色文字
        } else if (text === "Application") {
          translatedText = t("table.type_application");
          backgroundColor = "#f6ffed"; // 浅绿色
          textColor = "#52c41a"; // 绿色文字
        } else if (text === "Chat(Thinking)") {
          translatedText = t("table.type_chat_thinking");
          backgroundColor = "#f9f0ff"; // Light purple
          textColor = "#722ed1"; // Purple text
        }

        return (
          <span
            style={{
              backgroundColor: backgroundColor,
              color: textColor,
              padding: "4px 8px",
              borderRadius: "4px",
              fontWeight: "bold",
              display: "inline-block",
              minWidth: "60px",
              textAlign: "center",
            }}
          >
            {translatedText}
          </span>
        );
      },
    },
    {
      title: (
        <span>
          {t("table.sql_optimization")}
          {(Object.keys(sortedInfo).length === 0 ||
            sortedInfo.columnKey === "sql_optimization") && (
              <Tooltip
                title={
                  Object.keys(sortedInfo).length === 0
                    ? t("table.default_sort_tooltip")
                    : ""
                }
              >
                <PushpinFilled
                  style={{ marginLeft: 4, fontSize: "16px", color: "#1890ff" }}
                />
              </Tooltip>
            )}
        </span>
      ),
      dataIndex: ["scores", "sql_optimization", "ability_score"],
      key: "sql_optimization",
      sorter: true,
      showSorterTooltip: false,
      align: "center",
      sortOrder:
        sortedInfo.columnKey === "sql_optimization" ? sortedInfo.order : false,
      render: (text, record) => {
        const score = typeof text === "number" ? text : undefined;
        if (score === undefined) return "--";
        const isHighest =
          score === maxScoresByCategory.sql_optimization && score !== 0;
        return <StyledProgressBar score={score} isHighestScore={isHighest} />;
      },
    },
    {
      title: (
        <span>
          {t("table.dialect_conversion")}
          {sortedInfo.columnKey === "dialect_conversion" && (
            <PushpinFilled
              style={{ marginLeft: 4, fontSize: "16px", color: "#1890ff" }}
            />
          )}
        </span>
      ),
      dataIndex: ["scores", "dialect_conversion", "ability_score"],
      key: "dialect_conversion",
      sorter: true,
      showSorterTooltip: false,
      align: "center",
      sortOrder:
        sortedInfo.columnKey === "dialect_conversion"
          ? sortedInfo.order
          : false,
      render: (text, record) => {
        const score = typeof text === "number" ? text : undefined;
        if (score === undefined) return "--";
        const isHighest =
          score === maxScoresByCategory.dialect_conversion && score !== 0;
        return <StyledProgressBar score={score} isHighestScore={isHighest} />;
      },
    },
    {
      title: (
        <span>
          {t("table.sql_understanding")}
          {sortedInfo.columnKey === "sql_understanding" && (
            <PushpinFilled
              style={{ marginLeft: 4, fontSize: "16px", color: "#1890ff" }}
            />
          )}
        </span>
      ),
      dataIndex: ["scores", "sql_understanding", "ability_score"],
      key: "sql_understanding",
      sorter: true,
      showSorterTooltip: false,
      align: "center",
      sortOrder:
        sortedInfo.columnKey === "sql_understanding"
          ? sortedInfo.order
          : false,
      render: (text, record) => {
        const score = typeof text === "number" ? text : undefined;
        if (score === undefined) return "--";
        const isHighest =
          score === maxScoresByCategory.sql_understanding && score !== 0;
        return <StyledProgressBar score={score} isHighestScore={isHighest} />;
      },
    },
    {
      title: t("table.details"),
      key: "details",
      render: (_, record) => (
        <Link
          scroll={true}
          href={`/models/${record.id}/${currentMonth}`}
          onClick={() => NProgress.start()}
        >
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            title={t("table.view_details")}
          >
            {t("table.view_details")}
          </Button>
        </Link>
      ),
      width: 80,
      align: "center",
    },
  ];

  const pageTitle = t("seo.ranking_page.title", { month: currentMonth });
  const pageDescription = t("seo.ranking_page.description", {
    month: currentMonth,
  });
  const pageKeywords = t("seo.ranking_page.keywords", { month: currentMonth });
  const canonicalUrl = `http://sql-llm-leaderboard.com/ranking/${currentMonth}`;

  const renderFormulaContent = () => (
    <div>
      <Typography.Title level={4} style={{ marginBottom: "8px" }}>
        {t("evaluation_cases.formula_tip.title")}
      </Typography.Title>
      <ol style={{ paddingLeft: "20px", margin: 0 }}>
        <li>
          <Typography.Text strong>
            {t("evaluation_cases.formula_tip.basic_elements.title")}:
          </Typography.Text>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li>{t("evaluation_cases.formula_tip.basic_elements.item1")}</li>
            <li>{t("evaluation_cases.formula_tip.basic_elements.item2")}</li>
            <li>{t("evaluation_cases.formula_tip.basic_elements.item3")}</li>
          </ul>
        </li>
        <li>
          <Typography.Text strong>
            {t("evaluation_cases.formula_tip.weight_settings.title")}:
          </Typography.Text>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li>{t("evaluation_cases.formula_tip.weight_settings.item1")}</li>
            <li>{t("evaluation_cases.formula_tip.weight_settings.item2")}</li>
          </ul>
        </li>
        <li>
          <Typography.Text strong>
            {t("evaluation_cases.formula_tip.scoring_steps.title")}:
          </Typography.Text>
          <ol type="a" style={{ paddingLeft: "20px", margin: 0 }}>
            <li>{t("evaluation_cases.formula_tip.scoring_steps.item1")}</li>
            <li>{t("evaluation_cases.formula_tip.scoring_steps.item2")}</li>
            <li>{t("evaluation_cases.formula_tip.scoring_steps.item3")}</li>
            <li>{t("evaluation_cases.formula_tip.scoring_steps.item4")}</li>
            <li>{t("evaluation_cases.formula_tip.scoring_steps.item5")}</li>
          </ol>
        </li>
        <li>
          <Typography.Text strong>
            {t("evaluation_cases.formula_tip.special_cases.title")}:
          </Typography.Text>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li>{t("evaluation_cases.formula_tip.special_cases.item1")}</li>
            <li>{t("evaluation_cases.formula_tip.special_cases.item2")}</li>
          </ul>
        </li>
        <li>
          <Typography.Text strong>
            {t("evaluation_cases.formula_tip.example.title")}:
          </Typography.Text>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li>{t("evaluation_cases.formula_tip.example.item1")}</li>
            <li>{t("evaluation_cases.formula_tip.example.item2")}</li>
            <li>{t("evaluation_cases.formula_tip.example.item3")}</li>
            <li>{t("evaluation_cases.formula_tip.example.item4")}</li>
            <li>{t("evaluation_cases.formula_tip.example.item5")}</li>
          </ul>
        </li>
      </ol>
    </div>
  );

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
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
            marginBottom: "32px",
            background: "linear-gradient(135deg, #f6f8fa 0%, #e9eef4 100%)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              padding: "60px",
              position: "relative",
              overflow: "hidden",
              gap: "60px",
            }}
          >
            {/* 背景光效 */}
            <div className={styles.heroGlow1}></div>
            <div className={styles.heroGlow2}></div>
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "30px",
                zIndex: 3,
              }}
            >
              <Tooltip title={t("actions.toggle_language")}>
                <Button
                  type="text"
                  onClick={handleLanguageChange}
                  style={{
                    width: "40px",
                    height: "40px",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: "transparent",
                  }}
                >
                  <img
                    src="/icons/language-switch.svg"
                    alt="Language Switch"
                    style={{ width: "24px", height: "24px" }}
                  />
                </Button>
              </Tooltip>
            </div>

            {/* 左侧栏: 包含标题、简述和领奖台 */}
            <div
              style={{
                flex: 1.5,
                display: "flex",
                flexDirection: "column",
                zIndex: 2,
              }}
            >
              <div style={{ textAlign: "left", marginBottom: "40px" }}>
                <Title
                  level={1}
                  style={{
                    margin: 0,
                    fontSize: "230px",
                    fontWeight: 900,
                    color: "#2c3e50",
                    letterSpacing: "-2px",
                    lineHeight: 1,
                    textShadow: "4px 4px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {t("ranking.title")}
                </Title>
                <Title
                  level={2}
                  style={{
                    margin: "10px 0 24px 0",
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#34495e",
                    textAlign: "left",
                    lineHeight: "1.3",
                  }}
                >
                  <span>
                    <span style={{ color: "#1890ff", fontWeight: 800 }}>S</span>QL{" "}
                    <span style={{ color: "#1890ff", fontWeight: 800 }}>Ca</span>pability{" "}
                    <span style={{ color: "#1890ff", fontWeight: 800 }}>Le</span>aderboard for{" "}
                    LLMs
                  </span>
                </Title>
                <Paragraph
                  style={{
                    fontSize: "18px",
                    color: "#555",
                    lineHeight: "1.7",
                  }}
                >
                  {t("ranking.description_part1")}{" "}
                  <Link
                    href="https://github.com/actiontech/sql-llm-benchmark"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#1890ff",
                      fontSize: "25px",
                      fontWeight: "bold",
                    }}
                  >
                    GitHub
                  </Link>
                  {t("ranking.description_part2")}{" "}
                  <Button
                    type="link"
                    onClick={showSubmissionGuide}
                    style={{
                      padding: 0,
                      fontSize: "18px",
                      height: "auto",
                      lineHeight: "inherit",
                      color: "#1890ff",
                      fontWeight: "bold",
                      verticalAlign: "baseline",
                    }}
                  >
                    {t("ranking.description_part3_trigger")}
                  </Button>
                  .
                </Paragraph>
              </div>

              {/* 领奖台模块 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "center",
                  gap: "20px",
                  width: "100%",
                  marginTop: "auto",
                }}
              >
                {[
                  "sql_optimization",
                  "dialect_conversion",
                  "sql_understanding",
                ].map((category) => {
                  const model = topModelsByCategory[category];

                  return (
                    <div
                      key={category}
                      style={{
                        width: "30%",
                        minWidth: 220,
                        height: 350,
                        transition: "transform 0.3s ease",
                        cursor: "pointer",
                        filter:
                          "drop-shadow(0 12px 16px rgba(255, 215, 0, 0.4))", // 适配不规则图形的阴影
                      }}
                      onClick={() => {
                        if (model) {
                          setSortedInfo({
                            columnKey: category,
                            order: "descend",
                          });
                        }
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "translateY(-10px)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "translateY(0)")
                      }
                    >
                      <Card
                        variant="borderless"
                        style={{
                          width: "100%",
                          height: "100%",
                          textAlign: "center",
                          background: "rgba(255, 255, 255, 0.7)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          padding: "24px 16px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          // 核心：使用clip-path定义徽章形状
                          clipPath:
                            "polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%)",
                        }}
                        styles={{
                          body: {
                            padding: 0,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            width: "100%",
                          },
                        }}
                      >
                        <Space align="center" style={{ marginBottom: "12px" }}>
                          <Title
                            level={3}
                            style={{
                              margin: 0,
                              color: "#333",
                              fontSize: "18px",
                            }}
                          >
                            {t(`table.${category}`)}
                          </Title>
                          <TrophyFilled
                            style={{ color: "#FFD700", fontSize: "32px" }}
                          />
                        </Space>
                        {model ? (
                          <Space
                            direction="vertical"
                            size="large"
                            style={{
                              width: "100%",
                              flexGrow: 1,
                              justifyContent: "center",
                            }}
                          >
                            {model.organization && (
                              <LogoImage
                                organization={model.organization}
                                logoInfo={logoInfo}
                                width={90}
                                height={90}
                                style={{
                                  borderRadius: "50%",
                                  border: "4px solid #FFD700",
                                  padding: "4px",
                                  background: "white",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                }}
                              />
                            )}
                            <Title
                              level={4}
                              style={{ margin: 0, color: "#222" }}
                            >
                              {model.real_model_namne}
                            </Title>
                            <Paragraph
                              strong
                              style={{
                                fontSize: "32px",
                                color: "#1890ff",
                                fontWeight: "bold",
                                margin: 0,
                              }}
                            >
                              {model.scores?.[category]?.ability_score?.toFixed(
                                2
                              ) ?? "N/A"}
                            </Paragraph>
                          </Space>
                        ) : (
                          <Paragraph style={{ color: "#666" }}>
                            {t("table.no_data")}
                          </Paragraph>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧栏: 详细描述 */}
            <div
              style={{
                flex: 1,
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <div className={styles.descriptionWrapper}>
                <div
                  ref={descriptionRef}
                  className={`${styles.descriptionContent} ${isDescriptionExpanded ? styles.expanded : ""}`}
                  style={{
                    maxHeight: isDescriptionExpanded
                      ? `${descriptionRef.current?.scrollHeight || 'none'}px`
                      : "120px",
                    position: 'relative'
                  }}
                >
                  <Paragraph
                    style={{
                      fontSize: "16px",
                      color: "#34495e",
                      lineHeight: "1.7",
                      margin: 0,
                    }}
                    className={styles.descriptionText}
                  >
                    {t("ranking.full_description")}
                  </Paragraph>
                  {!isDescriptionExpanded && (
                    <div className={styles.descriptionMask} />
                  )}
                </div>
                {descriptionRef.current && descriptionRef.current.scrollHeight > 120 && isDescriptionExpanded && (
                  <div style={{ textAlign: "center" }}>
                    <Button
                      type="link"
                      shape="round"
                      icon={<UpOutlined className={styles.expandIcon} />}
                      onClick={() => setIsDescriptionExpanded(false)}
                      style={{
                        marginTop: "15px",
                        background: "rgba(24,114,255, 0.1)",
                        color: "#1890ff",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {t("actions.collapse")}
                    </Button>
                  </div>
                )}
                {descriptionRef.current && descriptionRef.current.scrollHeight > 120 && !isDescriptionExpanded && (
                  <div style={{ textAlign: "center" }}>
                    <Button
                      type="link"
                      shape="round"
                      icon={<DownOutlined className={styles.expandIcon} />}
                      onClick={() => setIsDescriptionExpanded(true)}
                      style={{
                        marginTop: "15px",
                        background: "rgba(24,114,255, 0.1)",
                        color: "#1890ff",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {t("actions.expand")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 表格控件 */}
          <Space
            style={{
              marginBottom: 24,
              justifyContent: "flex-end",
              width: "100%",
              padding: "0 24px",
            }}
          >
            <Select
              key="month"
              value={currentMonth}
              onChange={handleMonthChange}
              style={{ width: 150 }}
            >
              {months.map((m) => (
                <Select.Option key={m} value={m}>
                  {m}
                </Select.Option>
              ))}
            </Select>
            <Search
              key="search"
              placeholder={t("search model name")}
              allowClear
              onSearch={(val) => {
                setSearchText(val);
                actionRef.current?.reload();
              }}
              style={{ width: 300 }}
            />
          </Space>

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
              <Space>
                <Button
                  key="formula-button"
                  type="primary"
                  ghost
                  onClick={showFormulaModal}
                  icon={<FormOutlined />}
                  style={{
                    fontWeight: "bold",
                    borderRadius: "4px",
                    padding: "4px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {t("evaluation_cases.formula_button")}
                  <RightOutlined style={{ fontSize: "12px" }} />
                </Button>
                <Button
                  key="submit-guide-button"
                  type="primary"
                  ghost
                  icon={<GithubOutlined />}
                  onClick={showSubmissionGuide}
                  style={{
                    fontWeight: "bold",
                    borderRadius: "4px",
                    padding: "4px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {t("actions.submit_report")}
                  <RightOutlined style={{ fontSize: "12px" }} />
                </Button>
              </Space>
            }
            pagination={false}
            scroll={{ y: "auto" }}
            rowClassName={(record: Model, idx) => {
              const rank = idx + 1;
              if (rank === 1) return styles.rank1Row;
              if (rank === 2) return styles.rank2Row;
              if (rank === 3) return styles.rank3Row;
              return idx % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven;
            }}
            tableStyle={{
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 10px 10px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e8e8e8",
            }}
            cardProps={{
              bodyStyle: { padding: 0 },
            }}
            onRow={(record) => {
              return {
                onClick: (event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest("button") || target.closest("a")) {
                    return;
                  }
                  NProgress.start();
                  router.push(`/models/${record.id}/${currentMonth}`);
                },
              };
            }}
          />
        </Card>

        {/* 公式解释模块 */}
        <Modal
          open={isFormulaModalVisible}
          onCancel={handleFormulaModalCancel}
          footer={[
            <Button key="close" onClick={handleFormulaModalCancel}>
              {t("actions.close")}
            </Button>,
          ]}
          width="30%"
          style={{ top: 50 }}
        >
          {renderFormulaContent()}
        </Modal>

        <SubmissionGuideModal
          visible={isSubmissionGuideVisible}
          onClose={handleSubmissionGuideCancel}
        />
      </div>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const dataDir = path.join(process.cwd(), "public", "data", "eval_reports");
  const filenames = fs.readdirSync(dataDir);

  const months = filenames
    .filter((name) => name.startsWith("models-") && name.endsWith(".json"))
    .map((name) => name.replace("models-", "").replace(".json", ""));

  const paths = months.map((month) => ({
    params: { month },
  }));

  return {
    paths,
    fallback: false, // 如果访问的月份不存在，则返回404
  };
};

export const getStaticProps: GetStaticProps<RankingPageProps> = async () => {
  const dataDir = path.join(process.cwd(), "public", "data", "eval_reports");
  const filenames = fs.readdirSync(dataDir);

  const months = filenames
    .filter((name) => name.startsWith("models-") && name.endsWith(".json"))
    .map((name) => name.replace("models-", "").replace(".json", ""))
    .sort((a, b) => b.localeCompare(a));

  const logosDir = path.join(process.cwd(), "public", "logos");
  const logoFiles = fs.readdirSync(logosDir);
  const logoInfo: Record<string, string> = {};

  logoFiles.forEach((file) => {
    const name = path.parse(file).name;
    const ext = path.parse(file).ext.substring(1);
    if (!logoInfo[name] || ext === "svg") {
      logoInfo[name] = ext;
    }
  });

  return {
    props: {
      months,
      logoInfo,
    },
  };
};

export default RankingPage;
