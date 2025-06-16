import React, { useState, useEffect, useMemo } from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import fs from "fs";
import path from "path";
import Head from "next/head";
import NProgress from "nprogress"; // 导入 NProgress
import {
  Descriptions,
  Row,
  Col,
  Spin,
  Button,
  Card,
  Typography,
  Tabs,
  Modal,
  Select,
  Tooltip, // 新增导入 Tooltip
} from "antd";
import { ProColumns, ProTable } from "@ant-design/pro-table";
import { useTranslation } from "react-i18next";
import { RadarChart } from "../../../components/RadarChart";
import { BarChart } from "../../../components/BarChart";
import styles from "../../../styles/Container.module.css";
import Link from "next/link";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  ExportOutlined, // 新增导入 ExportOutlined
} from "@ant-design/icons";
// import LanguageSelector from "../../../components/LanguageSelector";
import { INDICATOR_KEYS } from "../../../components/constants";

const { Title, Paragraph, Link: AntLink } = Typography; // 导入 Ant Design 的 Link 组件

interface Answer {
  case_evaluation_count: number;
  model_answer: string;
}

interface CaseData {
  case_id: string;
  case_description: string;
  expected_output: string;
  actual_output: string;
  evaluation_result: string;
  score: number;
  reason: string;
  rule_id?: string;
  case_content: string;
  mode_question: string;
  model_answers: Answer[];
}

interface EvaluationCaseReport {
  indicator_name: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate: number;
  average_score: number;
  case_datas: CaseData[];
  indicator_weight?: number;
  evaluation_type?: string;
  case_pass_count?: number;
  case_wrong_count?: number;
  correct_rate?: number;
}

interface Model {
  id: string;
  real_model_namne: string;
  name: string;
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
}

interface LogFile {
  originalFilename: string;
  i18nKey: string;
}

interface DetailProps {
  model: Model | null;
  evaluationDimensions: string[];
  initialEvaluationCaseReports: EvaluationCaseReport[] | null;
  initialLogFiles: Record<string, LogFile[]>;
  initialLogContent: string;
  initialSelectedLogFile: string | undefined;
  date: string;
  id: string;
}

const Detail: React.FC<DetailProps> = ({
  model,
  evaluationDimensions,
  initialEvaluationCaseReports,
  initialLogFiles,
  initialLogContent,
  initialSelectedLogFile,
  date,
  id,
}) => {
  const { t, i18n } = useTranslation("common");

  const handleLanguageChange = () => {
    const newLang = i18n.language === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
  };
  const [logFiles, setLogFiles] =
    useState<Record<string, LogFile[]>>(initialLogFiles);
  const [selectedLogContent, setSelectedLogContent] =
    useState<string>(initialLogContent);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [activeTabKey, setActiveTabKey] = useState<string>("sql_optimization");
  const [selectedDimension, setSelectedDimension] =
    useState<string>("sql_optimization");
  const [selectedLogFile, setSelectedLogFile] = useState<string | undefined>(
    initialSelectedLogFile
  );
  const [logLoading, setLogLoading] = useState(false);

  const [evaluationCaseReports, setEvaluationCaseReports] = useState<
    EvaluationCaseReport[] | null
  >(initialEvaluationCaseReports);
  const [selectedEvaluationDimension, setSelectedEvaluationDimension] =
    useState<string | undefined>("sql_optimization");
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [isCaseModalVisible, setIsCaseModalVisible] = useState<boolean>(false);
  const [currentCaseDatas, setCurrentCaseDatas] = useState<CaseData[]>([]);
  const [currentCaseIndicatorName, setCurrentCaseIndicatorName] =
    useState<string>(""); // 新增状态用于存储当前案例的 indicator_name
  const [casePagination, setCasePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 在模型数据加载后设置默认维度和激活tab
  useEffect(() => {
    // 确保 INDICATOR_KEYS 包含 'sql_optimization'
    if (model && INDICATOR_KEYS.includes("sql_optimization")) {
      setActiveTabKey("sql_optimization");
      setSelectedDimension("sql_optimization");
      setSelectedEvaluationDimension("sql_optimization");
    } else if (model && INDICATOR_KEYS.length > 0) {
      // 如果没有 sql_optimization，则默认选中第一个
      setActiveTabKey(INDICATOR_KEYS[0]);
      setSelectedDimension(INDICATOR_KEYS[0]);
      setSelectedEvaluationDimension(INDICATOR_KEYS[0]);
    }
  }, [model]); // 移除 activeTabKey 依赖，避免循环

  // 获取日志文件列表
  useEffect(() => {
    if (!date || !id || !activeTabKey) return;

    const fetchLogFiles = async () => {
      try {
        const res = await fetch(
          `/data/evaluation_process_detail_logs/eval_run_logs_${date}/${id}/${activeTabKey}`
        );
        if (!res.ok) {
          console.error(
            `Failed to fetch log files for ${activeTabKey} (status: ${res.status})`
          );
          setLogFiles((prev) => ({ ...prev, [activeTabKey]: [] })); // 设置为空数组，表示无数据
          setSelectedLogFile(undefined); // 清空选中
          setSelectedLogContent(""); // 清空内容
          return;
        }
        const data = await res.json();
        setLogFiles((prev) => ({ ...prev, [activeTabKey]: data.files }));
        // 如果有文件，默认选中第一个并加载内容
        if (data.files && data.files.length > 0) {
          setSelectedLogFile(data.files[0].originalFilename);
          handleLogFileClick(data.files[0].originalFilename);
        } else {
          setSelectedLogFile(undefined);
          setSelectedLogContent("");
        }
      } catch (error) {
        console.error(`Error fetching log files for ${activeTabKey}:`, error);
        setLogFiles((prev) => ({ ...prev, [activeTabKey]: [] })); // 设置为空数组
        setSelectedLogFile(undefined); // 清空选中
        setSelectedLogContent(""); // 清空内容
      }
    };

    // 检查 logFiles 状态中是否已包含当前 activeTabKey 的数据
    // 如果已经存在数据（包括空数组），则不再次请求
    if (Object.prototype.hasOwnProperty.call(logFiles, activeTabKey)) {
      // 如果已存在数据，则直接选中第一个文件并加载内容 (如果存在文件)
      if (logFiles[activeTabKey] && logFiles[activeTabKey].length > 0) {
        const firstFile = logFiles[activeTabKey][0];
        setSelectedLogFile(firstFile.originalFilename);
        handleLogFileClick(firstFile.originalFilename);
      } else {
        // 如果是空数组，表示该维度下没有日志文件，清空选中和内容
        setSelectedLogFile(undefined);
        setSelectedLogContent("");
      }
      return; // 已经处理过，不再请求
    }

    fetchLogFiles(); // 每次 activeTabKey 变化时都尝试获取
  }, [date, id, activeTabKey, logFiles]); // 依赖 logFiles 状态以便在数据加载后触发选中逻辑

  // 根据选中的能力维度获取评估案例报告内容 (客户端动态加载)
  useEffect(() => {
    if (!date || !id || !selectedEvaluationDimension) {
      setEvaluationCaseReports(null); // 如果没有必要的参数，清空数据
      return;
    }

    // 检查当前 evaluationCaseReports 状态是否已经包含了当前维度的数据
    // 如果已经有数据，则不重复请求
    if (
      evaluationCaseReports &&
      evaluationCaseReports.length > 0 &&
      evaluationCaseReports.find(
        (report) => report.indicator_name === selectedEvaluationDimension
      )
    ) {
      return;
    }

    const fetchEvaluationCaseReport = async () => {
      setEvaluationLoading(true); // 开始加载
      try {
        const res = await fetch(
          `/data/evaluation_case_reports/eval_run_case_${date}/${selectedEvaluationDimension}/${id}.json`
        );
        if (!res.ok) {
          console.error(
            `Failed to fetch evaluation case report for ${selectedEvaluationDimension} (status: ${res.status})`
          );
          setEvaluationCaseReports([]); // 设置为空数组，表示无数据
          return;
        }
        const data: EvaluationCaseReport[] = await res.json();
        setEvaluationCaseReports(data);
      } catch (error) {
        console.error(
          `Error fetching evaluation case report for ${selectedEvaluationDimension}:`,
          error
        );
        setEvaluationCaseReports([]); // 设置为空数组
      } finally {
        setEvaluationLoading(false); // 结束加载
      }
    };

    fetchEvaluationCaseReport(); // 每次 selectedEvaluationDimension 变化时都尝试获取
  }, [date, id, selectedEvaluationDimension]); // 移除 evaluationCaseReports 依赖，避免循环

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const handleEvaluationTabChange = (key: string) => {
    setSelectedEvaluationDimension(key);
  };

  const handleLogFileClick = async (filename: string) => {
    if (!date || !activeTabKey || !filename) return;
    setLogLoading(true); // 开始加载日志内容
    try {
      const res = await fetch(
        `/data/evaluation_process_detail_logs/eval_run_logs_${date}/${id}/${activeTabKey}/${filename}`
      );
      if (!res.ok) throw new Error("Failed to fetch log content");
      const content = await res.text();
      setSelectedLogContent(content);
    } catch (error) {
      console.error(`Error fetching log content for ${filename}:`, error);
      setSelectedLogContent("Failed to load log content.");
    } finally {
      setLogLoading(false); // 结束加载日志内容
    }
  };

  const handleLogFileSelect = (value: string) => {
    setSelectedLogFile(value);
    handleLogFileClick(value); // 选中后立即加载内容
  };

  const showCaseModal = (
    caseDatas: CaseData[],
    currentIndicatorName: string
  ) => {
    setCurrentCaseDatas(caseDatas);
    setCurrentCaseIndicatorName(currentIndicatorName); // 设置当前案例的 indicator_name
    setIsCaseModalVisible(true);
    setCasePagination((prev) => ({
      ...prev,
      current: 1,
      pageSize: 10,
      total: caseDatas.length,
    }));
  };

  const handleCaseModalCancel = () => {
    setIsCaseModalVisible(false);
    setCurrentCaseDatas([]);
    setCurrentCaseIndicatorName(""); // 清空
  };

  const handleCasePageChange = (page: number, pageSize?: number) => {
    setCasePagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  };

  const getCaseColumns = (
    currentDimension: string | undefined,
    currentIndicatorName: string
  ): ProColumns<CaseData>[] => {
    const baseColumns: ProColumns<CaseData>[] = [
      // 使用 const 确保每次调用都是新的数组
      {
        title: t("evaluation_cases.case_id"),
        dataIndex: "case_id",
        key: "case_id",
        width: 100,
      },
      {
        title: t("evaluation_cases.case_weight"),
        dataIndex: "case_weight",
        key: "case_weight",
        width: 100,
      },
      {
        title: t("evaluation_cases.evaluation_result"),
        dataIndex: "case_eval_result",
        key: "case_eval_result",
        width: 120,
        render: (text) => (
          <span style={{ color: text === "Pass" ? "green" : "red" }}>
            {text}
          </span>
        ),
      },
      {
        title: t("evaluation_cases.mode_question"),
        dataIndex: "mode_question",
        key: "mode_question",
        ellipsis: true,
      },
      {
        title: t("evaluation_cases.model_answers"),
        dataIndex: "model_answers",
        key: "model_answers",
        ellipsis: true,
        renderText: (value: Answer[]) => JSON.stringify(value, null, 2),
      },
    ];

    if (
      currentDimension === "sql_optimization" &&
      currentIndicatorName === "optimization_depth.jsonl"
    ) {
      // 动态添加规则ID列
      return [
        ...baseColumns.slice(0, 1), // 插入到 case_id 后面
        {
          title: t("evaluation_cases.rule_id"),
          dataIndex: "rule_id",
          key: "rule_id",
          width: 100,
        },
        ...baseColumns.slice(1), // 复制 case_id 之后
      ];
    }
    return baseColumns;
  };

  const evaluationCaseColumns: ProColumns<EvaluationCaseReport>[] = [
    {
      title: t("evaluation_cases.indicator_name"),
      dataIndex: "indicator_name",
      key: "indicator_name",
      width: 150,
      render: (text: any) => t(`indicator.${text}`), // 假设 indicator_name 对应 i18n key
    },
    {
      title: t("evaluation_cases.indicator_weight"),
      dataIndex: "indicator_weight",
      key: "indicator_weight",
      width: 100,
    },
    {
      title: t("evaluation_cases.evaluation_type"),
      dataIndex: "evaluation_type",
      key: "evaluation_type",
      width: 100,
    },
    {
      title: t("evaluation_cases.passed_cases"),
      dataIndex: "case_pass_count",
      key: "case_pass_count",
      width: 100,
    },
    {
      title: t("evaluation_cases.failed_cases"),
      dataIndex: "case_wrong_count",
      key: "case_wrong_count",
      width: 100,
    },
    {
      title: t("evaluation_cases.pass_rate"),
      dataIndex: "correct_rate",
      key: "correct_rate",
      width: 100,
      render: (text: any) => {
        const rate = typeof text === "number" ? text : 0;
        return `${Math.round(rate * 100)}%`;
      },
    },
    {
      title: t("evaluation_cases.details"),
      key: "details",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          size="small"
          onClick={() =>
            showCaseModal(record.case_datas || [], record.indicator_name)
          }
        >
          {t("evaluation_cases.view_cases")}
        </Button>
      ),
    },
  ];

  if (!model) {
    return (
      <div
        className={styles.container}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <p>{t("model_not_found")}</p>
      </div>
    );
  }

  const paginatedCaseDatas = currentCaseDatas.slice(
    (casePagination.current - 1) * casePagination.pageSize,
    casePagination.current * casePagination.pageSize
  );

  const pageTitle = t("seo.model_detail_page.title", {
    modelName: model.real_model_namne,
  });
  const pageDescription = t("seo.model_detail_page.description", {
    modelName: model.real_model_namne,
  });
  const pageKeywords = t("seo.model_detail_page.keywords", {
    modelName: model.real_model_namne,
  });
  const canonicalUrl = `http://sql-llm-leaderboard.com/models/${date}/${id}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={pageKeywords} />
        <link rel="canonical" href={canonicalUrl} />

        {/* hreflang tags for internationalization */}
        {/* hreflang tags are not applicable for client-side language switching without URL changes */}

        {/* Open Graph / Facebook */}
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />

        {/* Twitter */}
        <meta property="twitter:url" content={canonicalUrl} />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={pageDescription} />
      </Head>
      <div className={styles.container} style={{ padding: "24px" }}>
        {/* 顶部导航栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            justifyContent: "space-between",
          }}
        >
          <Link href={`/ranking/${date}`} onClick={() => NProgress.start()}>
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              size="large"
              shape="round"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {t("actions.back")}
            </Button>
          </Link>
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
        </div>

        {/* 模型详情卡片 */}
        <Card
          bordered={false}
          style={{
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
            marginBottom: "32px",
            background: "linear-gradient(135deg, #f6f8fa 0%, #e9eef4 100%)",
            overflow: "hidden",
          }}
        >
          <Title
            level={2}
            style={{
              marginTop: 0,
              marginBottom: "16px",
              fontSize: "32px",
              fontWeight: 800,
              color: "#2c3e50",
              padding: "24px 24px 0", // 增加内边距
            }}
          >
            {model.real_model_namne}
          </Title>
          <Paragraph
            style={{
              fontSize: "18px",
              color: "#555",
              marginBottom: "24px",
              padding: "0 24px", // 增加内边距
            }}
          >
            {model.description}
          </Paragraph>

          <Descriptions
            bordered
            column={{ xs: 1, sm: 2 }}
            labelStyle={{
              fontWeight: "bold",
              paddingLeft: "24px",
            }} // 增加内边距
            contentStyle={{
              color: "#333",
              paddingRight: "24px",
            }} // 增加内边距
          >
            <Descriptions.Item label={t("table.type")}>
              {model.type}
            </Descriptions.Item>
            <Descriptions.Item label={t("table.organization")}>
              {model.organization}
            </Descriptions.Item>
            <Descriptions.Item label={t("table.releaseDate")}>
              {model.releaseDate}
            </Descriptions.Item>
            <Descriptions.Item label={t("table.website")}>
              <AntLink
                href={model.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {model.website} <ExportOutlined />
              </AntLink>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 能力评分图表部分 */}
        <Card
          bordered={false}
          style={{
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
            marginBottom: "32px",
            background: "linear-gradient(135deg, #f6f8fa 0%, #e9eef4 100%)",
            overflow: "hidden",
          }}
        >
          <Title
            level={3}
            style={{
              marginTop: 0,
              marginBottom: "24px",
              fontSize: "28px",
              fontWeight: 700,
              color: "#2c3e50",
              padding: "24px 24px 0", // 增加内边距
            }}
          >
            {t("detail.abilityScores")}
          </Title>

          <Row gutter={[24, 24]} style={{ padding: "0 24px 24px" }}>
            {" "}
            {/* 增加内边距 */}
            <Col xs={24} md={12}>
              <Card
                bordered={false}
                className="chart-card"
                style={{
                  height: "100%",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <RadarChart scores={model.scores} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                bordered={false}
                className="chart-card"
                style={{
                  height: "100%",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  {INDICATOR_KEYS.map((key) => (
                    <Button
                      key={key}
                      onClick={() => setSelectedDimension(key)}
                      type={selectedDimension === key ? "primary" : "default"}
                      style={{ marginRight: "8px", marginBottom: "8px" }}
                    >
                      {t(`table.${key}`)}
                    </Button>
                  ))}
                </div>
                {model && model.scores[selectedDimension] && (
                  <BarChart
                    data={model.scores[selectedDimension].indicator_score}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 评估案例报告模块 */}
        {model && (
          <Card
            bordered={false}
            style={{
              marginTop: "32px", // 增加顶部间距
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
              background: "linear-gradient(135deg, #f6f8fa 0%, #e9eef4 100%)",
              overflow: "hidden",
            }}
          >
            <Title
              level={3}
              style={{
                marginTop: 0,
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                fontSize: "28px",
                fontWeight: 700,
                color: "#2c3e50",
                padding: "24px 24px 0", // 增加内边距
              }}
            >
              {t("evaluation_cases.title")}
            </Title>
            <Tabs
              activeKey={selectedEvaluationDimension}
              onChange={handleEvaluationTabChange}
              style={{ padding: "0 24px 24px" }} // 增加内边距
            >
              {evaluationDimensions.map((dim) => (
                <Tabs.TabPane tab={t(`table.${dim}`)} key={dim}>
                  {evaluationLoading ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "200px",
                      }}
                    >
                      <Spin size="large" />
                    </div>
                  ) : evaluationCaseReports &&
                    evaluationCaseReports.length > 0 ? (
                    <ProTable<EvaluationCaseReport>
                      columns={evaluationCaseColumns}
                      dataSource={evaluationCaseReports} // 直接使用数组
                      rowKey="indicator_name"
                      search={false}
                      options={false}
                      pagination={false} // 指标列表不需要分页
                      tableStyle={{
                        borderRadius: 8,
                        overflow: "hidden",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      }}
                      cardProps={{ bodyStyle: { padding: 0 } }} // 移除ProTable内部Card的padding
                    />
                  ) : (
                    <Paragraph>{t("evaluation_cases.no_data_found")}</Paragraph>
                  )}
                </Tabs.TabPane>
              ))}
            </Tabs>
          </Card>
        )}

        {/* 日志信息模块 */}
        {model && (
          <Card
            bordered={false}
            style={{
              marginTop: "32px", // 增加顶部间距
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
              background: "linear-gradient(135deg, #f6f8fa 0%, #e9eef4 100%)",
              overflow: "hidden",
            }}
          >
            <Title
              level={3}
              style={{
                marginTop: 0,
                marginBottom: "24px",
                fontSize: "28px",
                fontWeight: 700,
                color: "#2c3e50",
                padding: "24px 24px 0", // 增加内边距
              }}
            >
              {t("log_info.title")}
            </Title>
            <Tabs
              activeKey={activeTabKey}
              onChange={handleTabChange}
              style={{ padding: "0 24px 24px" }} // 增加内边距
            >
              {INDICATOR_KEYS.map((key) => (
                <Tabs.TabPane tab={t(`table.${key}`)} key={key}>
                  {logLoading ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "800px",
                      }}
                    >
                      <Spin size="large" />
                    </div>
                  ) : logFiles[key] && logFiles[key].length > 0 ? (
                    <>
                      <div style={{ marginBottom: "16px" }}>
                        <Select
                          value={selectedLogFile}
                          onChange={handleLogFileSelect}
                          style={{ width: "100%" }}
                          placeholder={t("log_info.select_file")}
                        >
                          {logFiles[key]?.map((file) => (
                            <Select.Option
                              key={file.originalFilename}
                              value={file.originalFilename}
                            >
                              {t(`log_file.${file.i18nKey}`)}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                      {selectedLogFile ? (
                        <div
                          style={{ position: "relative", minHeight: "800px" }}
                        >
                          <pre
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              backgroundColor: "#1e1e1e",
                              color: "#d4d4d4",
                              padding: "16px",
                              borderRadius: "4px",
                              maxHeight: "800px",
                              overflowY: "auto",
                              fontFamily:
                                "Consolas, Monaco, 'Andale Mono', monospace",
                              fontSize: "14px",
                              lineHeight: "1.5",
                              tabSize: 2,
                              position: "relative",
                              margin: 0,
                            }}
                          >
                            {selectedLogContent.split("\n").map((line, i) => {
                              let lineColor = "#d4d4d4";
                              if (line.includes("Final Result: False")) {
                                lineColor = "#f48771";
                              } else if (
                                line.includes("--- Capability:") ||
                                line.includes("warning")
                              ) {
                                lineColor = "#ffcc66";
                              } else if (line.includes("Final Result: True")) {
                                lineColor = "#9cdcfe";
                              } else if (
                                line.includes(
                                  "SQL Capability Evaluation Process Report"
                                )
                              ) {
                                lineColor = "#b5cea8";
                              }

                              return (
                                <div key={i} style={{ display: "flex" }}>
                                  <span
                                    style={{
                                      color: "#858585",
                                      marginRight: "16px",
                                      userSelect: "none",
                                      width: "40px",
                                      textAlign: "right",
                                      display: "inline-block",
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span style={{ color: lineColor, flex: 1 }}>
                                    {line}
                                  </span>
                                </div>
                              );
                            })}
                          </pre>
                        </div>
                      ) : (
                        <Paragraph>{t("log_info.no_logs_found")}</Paragraph>
                      )}
                    </>
                  ) : (
                    <Paragraph>{t("log_info.no_logs_for_dimension")}</Paragraph>
                  )}
                </Tabs.TabPane>
              ))}
            </Tabs>
          </Card>
        )}

        {/* Case Data Modal */}
        <Modal
          title={t("evaluation_cases.case_details")}
          open={isCaseModalVisible}
          onCancel={handleCaseModalCancel}
          footer={null}
          width="80%"
          style={{ top: 20 }}
        >
          <ProTable<CaseData>
            columns={getCaseColumns(
              selectedEvaluationDimension,
              currentCaseIndicatorName
            )}
            dataSource={paginatedCaseDatas}
            search={false}
            options={false}
            pagination={{
              ...casePagination,
              onChange: handleCasePageChange,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            scroll={{ y: 400 }}
            tableStyle={{
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
            cardProps={{ bodyStyle: { padding: 0 } }} // 移除ProTable内部Card的padding
          />
        </Modal>
      </div>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const dataDir = path.join(process.cwd(), "public", "data", "eval_reports");
  const filenames = fs.readdirSync(dataDir);

  const dates = filenames
    .filter((name) => name.startsWith("models-") && name.endsWith(".json"))
    .map((name) => name.replace("models-", "").replace(".json", ""));

  let paths: { params: { date: string; id: string } }[] = [];

  for (const date of dates) {
    const modelsFilePath = path.join(dataDir, `models-${date}.json`);
    const modelsFileContent = fs.readFileSync(modelsFilePath, "utf-8");
    const { models } = JSON.parse(modelsFileContent);

    for (const model of models) {
      paths.push({ params: { date, id: model.id } });
    }
  }

  return {
    paths,
    fallback: false, // 如果访问的路径不存在，则返回404
  };
};

export const getStaticProps: GetStaticProps<DetailProps> = async (context) => {
  const { date, id } = context.params as { date: string; id: string };

  let model: Model | null = null;
  let evaluationDimensions: string[] = [];
  let initialEvaluationCaseReports: EvaluationCaseReport[] | null = null;
  let initialLogFiles: Record<string, LogFile[]> = {};
  let initialLogContent: string = "";
  let initialSelectedLogFile: string | undefined = undefined;

  try {
    // Fetch model data
    const modelsFilePath = path.join(
      process.cwd(),
      "public",
      "data",
      "eval_reports",
      `models-${date}.json`
    );
    const modelsFileContent = fs.readFileSync(modelsFilePath, "utf-8");
    const { models } = JSON.parse(modelsFileContent);
    model = models.find((m: Model) => m.id === id) || null;

    if (model) {
      // Fetch evaluation dimensions
      const evaluationCaseDir = path.join(
        process.cwd(),
        "public",
        "data",
        "evaluation_case_reports",
        `eval_run_case_${date}`
      );
      const dimensions = fs
        .readdirSync(evaluationCaseDir)
        .filter((name) =>
          fs.statSync(path.join(evaluationCaseDir, name)).isDirectory()
        );
      evaluationDimensions = dimensions.sort((a: string, b: string) => {
        if (a === "sql_optimization") return -1;
        if (b === "sql_optimization") return 1;
        return 0;
      });

      // Fetch initial evaluation case reports for the default dimension
      if (evaluationDimensions.length > 0) {
        const defaultDimension = evaluationDimensions.includes(
          "sql_optimization"
        )
          ? "sql_optimization"
          : evaluationDimensions[0];
        const defaultEvaluationCaseReportPath = path.join(
          evaluationCaseDir,
          defaultDimension,
          `${id}.json`
        );
        if (fs.existsSync(defaultEvaluationCaseReportPath)) {
          const reportContent = fs.readFileSync(
            defaultEvaluationCaseReportPath,
            "utf-8"
          );
          initialEvaluationCaseReports = JSON.parse(reportContent);
        }
      }

      // Fetch initial log files and content for the default dimension
      const logDir = path.join(
        process.cwd(),
        "public",
        "data",
        "evaluation_process_detail_logs",
        `eval_run_logs_${date}`,
        id
      );

      const logDimensions = fs
        .readdirSync(logDir)
        .filter((name) => fs.statSync(path.join(logDir, name)).isDirectory());
      for (const dim of logDimensions) {
        const dimLogPath = path.join(logDir, dim);
        const files = fs
          .readdirSync(dimLogPath)
          .filter((name) => name.endsWith(".log"))
          .map((name) => ({
            originalFilename: name,
            i18nKey: `${dim}.${name.replace(".log", "")}`,
          }));
        initialLogFiles[dim] = files;
      }

      // Set initial selected log file and content for the default active tab
      const defaultLogTabKey = INDICATOR_KEYS.includes("sql_optimization")
        ? "sql_optimization"
        : INDICATOR_KEYS[0];

      if (
        initialLogFiles[defaultLogTabKey] &&
        initialLogFiles[defaultLogTabKey].length > 0
      ) {
        initialSelectedLogFile =
          initialLogFiles[defaultLogTabKey][0].originalFilename;
        const logFilePath = path.join(
          logDir,
          defaultLogTabKey,
          initialSelectedLogFile
        );
        if (fs.existsSync(logFilePath)) {
          initialLogContent = fs.readFileSync(logFilePath, "utf-8");
        }
      }
    }
  } catch (error) {
    console.error("Error in getStaticProps for detail page:", error);
    // If there's an error, return notFound to show 404 page
    return {
      notFound: true,
    };
  }

  return {
    props: {
      model,
      evaluationDimensions,
      initialEvaluationCaseReports,
      initialLogFiles,
      initialLogContent,
      initialSelectedLogFile,
      date,
      id,
    },
  };
};

export default Detail;
