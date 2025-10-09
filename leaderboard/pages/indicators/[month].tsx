import React, { useState, useEffect, useMemo, useRef } from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import fs from "fs";
import path from "path";
import Head from "next/head";
import { useRouter } from "next/router";
import NProgress from "nprogress";
import {
    Spin,
    Button,
    Tooltip,
} from "antd";
import { useTranslation } from "react-i18next";
import { ActionType } from "@ant-design/pro-table";
import { ArrowLeftOutlined } from "@ant-design/icons";

import styles from "../../styles/Container.module.css";
import cardStyles from "../../styles/Card.module.css";
import { Model, IndicatorRankingPageProps } from "../../types/ranking";
import { IndicatorFilter } from "../../components/IndicatorRanking/IndicatorFilter";
import { IndicatorRankingTable } from "../../components/IndicatorRanking/IndicatorRankingTable";
import { generateIndicatorRanking, filterIndicatorRanking } from "../../utils/indicatorRanking";
import Link from "next/link";

const IndicatorRankingPage: React.FC<IndicatorRankingPageProps> = ({
    months,
    logoInfo
}) => {
    const { t, i18n } = useTranslation("common");
    const router = useRouter();
    const { month: currentMonthParam, dimension, indicator, modelId } = router.query;
    const currentMonth = Array.isArray(currentMonthParam)
        ? currentMonthParam[0]
        : currentMonthParam || months[0];

    const actionRef = useRef<ActionType | undefined>(undefined);
    const [models, setModels] = useState<Model[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const [selectedDimension, setSelectedDimension] = useState<string>(
        Array.isArray(dimension) ? dimension[0] : dimension || "sql_optimization"
    );
    const [selectedIndicator, setSelectedIndicator] = useState<string>(
        Array.isArray(indicator) ? indicator[0] : indicator || ""
    );
    const [loading, setLoading] = useState<boolean>(false);

    // 处理语言切换
    const handleLanguageChange = () => {
        const newLang = i18n.language === "en" ? "zh" : "en";
        i18n.changeLanguage(newLang);
    };

    // 处理返回按钮
    // 客户端数据获取函数
    const fetchModels = async (month: string) => {
        NProgress.start();
        setLoading(true);
        try {
            const res = await fetch(`/data/eval_reports/models-${month}.json`);
            if (!res.ok) {
                throw new Error(`Failed to fetch models for month: ${month}`);
            }
            const jsonData = await res.json();
            setModels(jsonData.models || []);
        } catch (error) {
            console.error("Error fetching models:", error);
            setModels([]);
        } finally {
            setLoading(false);
            NProgress.done();
        }
    };

    // 生成指标排名数据
    const indicatorRankingData = useMemo(() => {
        if (!models.length || !selectedIndicator) return [];
        return generateIndicatorRanking(models, selectedDimension, selectedIndicator, logoInfo);
    }, [models, selectedDimension, selectedIndicator, logoInfo]);

    // 在组件挂载和 currentMonth 变化时加载数据
    useEffect(() => {
        if (currentMonth) {
            fetchModels(currentMonth);
        }
    }, [currentMonth]);

    // 当指标列表变化时，自动选择第一个指标
    useEffect(() => {
        if (models.length > 0 && !selectedIndicator) {
            const firstModel = models.find(model =>
                model.scores?.[selectedDimension]?.indicator_score
            );
            if (firstModel?.scores?.[selectedDimension]?.indicator_score?.length) {
                setSelectedIndicator(firstModel.scores[selectedDimension].indicator_score[0].indicator_name);
            }
        }
    }, [models, selectedDimension, selectedIndicator]);

    // 处理维度变化
    const handleDimensionChange = (dimension: string) => {
        setSelectedDimension(dimension);
        setSelectedIndicator(""); // 重置指标选择
    };

    // 处理指标变化
    const handleIndicatorChange = (indicator: string) => {
        setSelectedIndicator(indicator);
    };

    // 处理月份变化
    const handleMonthChange = (month: string) => {
        router.push(`/indicators/${month}`);
    };

    // 处理重置
    const handleReset = () => {
        setSelectedDimension("sql_optimization");
        setSelectedIndicator("");
        setSearchText("");
    };

    // 过滤数据
    const filteredData = useMemo(() => {
        return filterIndicatorRanking(indicatorRankingData, searchText);
    }, [indicatorRankingData, searchText]);

    return (
        <div className={`${styles.container} ${cardStyles.pageContainer}`}>
            <Head>
                <title>{t("indicator_ranking.title")} - {currentMonth}</title>
                <meta name="description" content={t("indicator_ranking.title")} />
            </Head>

            {/* 顶部导航栏 */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "24px",
                    justifyContent: "space-between",
                }}
            >
                <Link href={`/ranking/${currentMonth}`} onClick={() => NProgress.start()}>
                    <Button
                        type="default"
                        icon={<ArrowLeftOutlined />}
                        size="large"
                        shape="round"
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                        {t("common.back_to_ranking")}
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

            {/* 页面标题 */}
            <div className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottom}`}>
                <h1 className={cardStyles.cardTitle}>
                    {t("indicator_ranking.title")}
                </h1>
            </div>

            {/* 筛选器区域 */}
            <IndicatorFilter
                models={models}
                selectedDimension={selectedDimension}
                selectedIndicator={selectedIndicator}
                selectedMonth={currentMonth}
                months={months}
                searchText={searchText}
                onDimensionChange={handleDimensionChange}
                onIndicatorChange={handleIndicatorChange}
                onMonthChange={handleMonthChange}
                onSearchChange={setSearchText}
                onReset={handleReset}
            />

            {/* 指标排名表格 */}
            <Spin spinning={loading}>
                <IndicatorRankingTable
                    data={filteredData}
                    dimension={selectedDimension}
                    indicator={selectedIndicator}
                    currentMonth={currentMonth}
                    logoInfo={logoInfo}
                    loading={loading}
                    highlightModelId={Array.isArray(modelId) ? modelId[0] : modelId}
                />
            </Spin>
        </div>
    );
};

export const getStaticProps: GetStaticProps<IndicatorRankingPageProps> = async () => {
    const dataDir = path.join(process.cwd(), "public", "data", "eval_reports");
    const files = fs.readdirSync(dataDir);
    const months = files
        .filter(file => file.startsWith("models-") && file.endsWith(".json"))
        .map(file => file.replace("models-", "").replace(".json", ""))
        .sort()
        .reverse();

    // 读取logo信息
    const logoInfoPath = path.join(process.cwd(), "public", "logos", "logoInfo.json");
    let logoInfo = {};
    if (fs.existsSync(logoInfoPath)) {
        logoInfo = JSON.parse(fs.readFileSync(logoInfoPath, "utf-8"));
    }

    return {
        props: {
            months,
            logoInfo,
        },
    };
};

export const getStaticPaths: GetStaticPaths = async () => {
    const dataDir = path.join(process.cwd(), "public", "data", "eval_reports");
    const files = fs.readdirSync(dataDir);
    const months = files
        .filter(file => file.startsWith("models-") && file.endsWith(".json"))
        .map(file => file.replace("models-", "").replace(".json", ""));

    const paths = months.map(month => ({
        params: { month },
    }));

    return {
        paths,
        fallback: false,
    };
};

export default IndicatorRankingPage;
