import React, { useState, useEffect, useMemo } from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import fs from "fs";
import path from "path";
import Head from "next/head";
import { useRouter } from "next/router";
import NProgress from "nprogress";
import {
    Button,
    Card,
    Typography,
    Space,
    Select,
    Tag,
    Tooltip,
    Row,
    Col,
    Divider,
    Spin,
    App,
} from "antd";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
    ArrowLeftOutlined,
    BarChartOutlined,
    RadarChartOutlined,
    HeatMapOutlined,
    CloseOutlined,
} from "@ant-design/icons";
import styles from "../../styles/Container.module.css";
import cardStyles from "../../styles/Card.module.css";
import { ComparisonData, ChartType } from "../../types/comparison";
import { getModelsComparisonData, generateChartConfig, getModelColorPalette } from "../../utils/comparisonData";
import { ComparisonRadar } from "../../components/ModelCompare/ComparisonRadar";
import { ComparisonBar } from "../../components/ModelCompare/ComparisonBar";
import { ComparisonHeatmap } from "../../components/ModelCompare/ComparisonHeatmap";
import { ComparisonTable } from "../../components/ModelCompare/ComparisonTable";
import { LogoImage } from "../../components/LogoImage";

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface ComparePageProps {
    months: string[];
    logoInfo: Record<string, string>;
}

const ComparePage: React.FC<ComparePageProps> = ({ months, logoInfo }) => {
    const { t, i18n } = useTranslation("common");
    const { message } = App.useApp();
    const router = useRouter();
    const { month: currentMonthParam, models: modelsParam } = router.query;

    const currentMonth = Array.isArray(currentMonthParam) ? currentMonthParam[0] : currentMonthParam || months[0];
    const modelIds = useMemo(() => {
        if (!modelsParam) return [];
        const idsString = Array.isArray(modelsParam) ? modelsParam[0] : modelsParam;
        return idsString.split(',').filter(Boolean);
    }, [modelsParam]);

    const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState<ChartType>('radar');
    const [selectedCapability, setSelectedCapability] = useState<string>('all');

    // 获取对比数据
    useEffect(() => {
        if (modelIds.length >= 2 && currentMonth) {
            NProgress.start();
            setLoading(true);
            getModelsComparisonData(modelIds, currentMonth)
                .then(data => {
                    setComparisonData(data);
                })
                .catch(error => {
                    console.error('获取对比数据失败:', error);
                })
                .finally(() => {
                    setLoading(false);
                    NProgress.done();
                });
        }
    }, [modelIds, currentMonth]);

    const chartConfig = useMemo(() => {
        if (!comparisonData) return null;
        return generateChartConfig(comparisonData);
    }, [comparisonData]);



    const colorPalette = useMemo(() => getModelColorPalette(), []);

    const checkModelsAvailability = async (modelIds: string[], month: string) => {
        try {
            const response = await fetch(`/data/eval_reports/models-${month}.json`);
            if (!response.ok) {
                throw new Error('Failed to fetch models data');
            }
            const data = await response.json();
            const availableModels = data.models || [];
            const availableModelIds = availableModels.map((model: any) => model.id);

            const existingModels = modelIds.filter(id => availableModelIds.includes(id));
            const missingModels = modelIds.filter(id => !availableModelIds.includes(id));

            return { existingModels, missingModels, availableModels };
        } catch (error) {
            console.error('Error checking models availability:', error);
            return { existingModels: [], missingModels: modelIds, availableModels: [] };
        }
    };

    const handleMonthChange = async (newMonth: string) => {
        console.log('Switching to month:', newMonth, 'with models:', modelIds);
        NProgress.start();

        try {
            const { existingModels, missingModels } = await checkModelsAvailability(modelIds, newMonth);
            console.log('Available models:', existingModels, 'Missing models:', missingModels);

            if (existingModels.length < 2) {
                // 如果可用模型少于2个，跳转到排行榜并给出提示
                const warningMsg = missingModels.length === modelIds.length
                    ? t("compare.all_models_unavailable", { month: newMonth })
                    : t("compare.insufficient_models_available", { month: newMonth, available: existingModels.length });
                console.log('Warning message:', warningMsg);
                message.warning({
                    content: warningMsg,
                    duration: 4, // 显示4秒
                });
                router.push(`/ranking/${newMonth}`);
            } else if (missingModels.length > 0) {
                // 有部分模型不可用，给出提示并继续对比可用模型
                const infoMsg = t("compare.some_models_unavailable", {
                    count: missingModels.length,
                    month: newMonth,
                    available: existingModels.length
                });
                console.log('Info message:', infoMsg);
                message.info({
                    content: infoMsg,
                    duration: 3, // 显示3秒
                });
                const modelsString = existingModels.join(',');
                router.push(`/compare/${newMonth}?models=${modelsString}`);
            } else {
                // 所有模型都可用，正常切换
                console.log('All models available, normal switch');
                const modelsString = modelIds.join(',');
                router.push(`/compare/${newMonth}?models=${modelsString}`);
            }
        } catch (error) {
            console.error('Error switching month:', error);
            message.error({
                content: t("compare.month_switch_error"),
                duration: 3,
            });
        } finally {
            NProgress.done();
        }
    };

    const handleRemoveModel = (modelId: string) => {
        const newModelIds = modelIds.filter(id => id !== modelId);
        if (newModelIds.length < 2) {
            router.push(`/ranking/${currentMonth}`);
            return;
        }
        const modelsString = newModelIds.join(',');
        router.push(`/compare/${currentMonth}?models=${modelsString}`);
    };

    const handleLanguageChange = () => {
        const newLang = i18n.language === "en" ? "zh" : "en";
        i18n.changeLanguage(newLang);
    };

    if (!modelIds.length || modelIds.length < 2) {
        return (
            <div className={`${styles.container} ${cardStyles.pageContainer}`}>
                <Card
                    bordered={false}
                    className={`${cardStyles.standardCard} ${cardStyles.errorCenter}`}
                >
                    <Title level={3}>{t("compare.minimum_models_required")}</Title>
                    <Link href={`/ranking/${currentMonth}`}>
                        <Button
                            type="default"
                            icon={<ArrowLeftOutlined />}
                            size="large"
                            shape="round"
                            style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 auto" }}
                        >
                            {t("compare.back_to_ranking")}
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    const pageTitle = `模型对比 - ${currentMonth}`;
    const pageDescription = `对比 ${modelIds.length} 个大语言模型在 SQL 能力上的表现差异`;

    return (
        <>
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
            </Head>
            <div className={`${styles.container} ${cardStyles.pageContainer}`}>
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
                            {t("compare.back_to_ranking")}
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
                        <Space>

                            <Tooltip title={t("compare.switch_language")}>
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
                        </Space>
                    </div>
                </div>

                {/* 页面标题 */}
                <Card
                    bordered={false}
                    className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottom}`}
                >
                    <Title level={2} className={cardStyles.cardTitle}>
                        {t("compare.analysis_title")}
                    </Title>

                    {/* 已选模型显示区 */}
                    <Divider />
                    <Space wrap size="middle">
                        <span style={{ fontWeight: 'bold', color: '#666' }}>{t("compare.compare_models_label")}</span>
                        {comparisonData?.models.map((model, index) => (
                            <Tag
                                key={model.id}
                                color={colorPalette[index]}
                                closable
                                onClose={() => handleRemoveModel(model.id)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <LogoImage
                                    organization={model.organization}
                                    logoInfo={logoInfo}
                                    width={20}
                                    height={20}
                                />
                                {model.real_model_namne}
                            </Tag>
                        ))}
                    </Space>
                </Card>

                {loading ? (
                    <Card
                        bordered={false}
                        className={`${cardStyles.standardCard} ${cardStyles.loadingCenter}`}
                    >
                        <Spin size="large" />
                        <p style={{ marginTop: '20px' }}>{t("compare.loading_data")}</p>
                    </Card>
                ) : (
                    <>
                        {/* 图表控制区 */}
                        <Card
                            bordered={false}
                            className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottom}`}
                        >
                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Space>
                                        <Button
                                            type={chartType === 'radar' ? 'primary' : 'default'}
                                            icon={<RadarChartOutlined />}
                                            onClick={() => setChartType('radar')}
                                        >
                                            {t("compare.chart_types.radar")}
                                        </Button>
                                        <Button
                                            type={chartType === 'bar' ? 'primary' : 'default'}
                                            icon={<BarChartOutlined />}
                                            onClick={() => setChartType('bar')}
                                        >
                                            {t("compare.chart_types.bar")}
                                        </Button>
                                        <Button
                                            type={chartType === 'heatmap' ? 'primary' : 'default'}
                                            icon={<HeatMapOutlined />}
                                            onClick={() => setChartType('heatmap')}
                                        >
                                            {t("compare.chart_types.heatmap")}
                                        </Button>
                                    </Space>
                                </Col>
                                <Col>
                                    <Space size={16}>
                                        <Select
                                            value={selectedCapability}
                                            onChange={setSelectedCapability}
                                            style={{ width: 200 }}
                                        >
                                            <Option value="all">{t("compare.capability_filter.all")}</Option>
                                            <Option value="sql_optimization">{t("compare.capability_filter.sql_optimization")}</Option>
                                            <Option value="dialect_conversion">{t("compare.capability_filter.dialect_conversion")}</Option>
                                            <Option value="sql_understanding">{t("compare.capability_filter.sql_understanding")}</Option>
                                        </Select>
                                        <Select value={currentMonth} onChange={handleMonthChange} style={{ width: 150 }}>
                                            {months.map((m) => (
                                                <Option key={m} value={m}>
                                                    {m}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Space>
                                </Col>
                            </Row>
                        </Card>


                        {/* 图表展示区 */}
                        <Row gutter={[24, 24]}>
                            <Col span={24}>
                                <Card
                                    bordered={false}
                                    title={t("compare.chart_titles.capability_comparison")}
                                    className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottom}`}
                                >
                                    {chartType === 'radar' && chartConfig && (
                                        <ComparisonRadar
                                            data={chartConfig.radarData}
                                            models={comparisonData?.models || []}
                                            colorPalette={colorPalette}
                                            title={t("compare.chart_titles.model_capability_radar")}
                                            t={t}
                                        />
                                    )}
                                    {chartType === 'bar' && chartConfig && (
                                        <ComparisonBar
                                            data={chartConfig.barData}
                                            models={comparisonData?.models || []}
                                            colorPalette={colorPalette}
                                            selectedCapability={selectedCapability}
                                            getTitle={(capability) =>
                                                capability === 'all'
                                                    ? t("compare.chart_titles.indicator_comparison")
                                                    : `${t(`compare.capability_filter.${capability === 'SQL优化' ? 'sql_optimization' : capability === '方言转换' ? 'dialect_conversion' : 'sql_understanding'}`)}${t("compare.chart_titles.indicator_comparison").replace('各指标能力', '指标')}`
                                            }
                                            t={t}
                                        />
                                    )}
                                    {chartType === 'heatmap' && chartConfig && (
                                        <ComparisonHeatmap
                                            data={chartConfig.heatmapData}
                                            selectedCapability={selectedCapability}
                                            getTitle={(capability) =>
                                                capability === 'all'
                                                    ? t("compare.chart_titles.model_indicator_heatmap")
                                                    : `${t(`compare.capability_filter.${capability === 'SQL优化' ? 'sql_optimization' : capability === '方言转换' ? 'dialect_conversion' : 'sql_understanding'}`)}热力图`
                                            }
                                            t={t}
                                        />
                                    )}
                                </Card>
                            </Col>
                        </Row>

                        {/* 详细数据表格 */}
                        <Card
                            bordered={false}
                            title={t("compare.chart_titles.detailed_comparison")}
                            className={`${cardStyles.standardCard} ${cardStyles.cardMarginTop}`}
                        >
                            {comparisonData && (
                                <ComparisonTable
                                    models={comparisonData.models}
                                    colorPalette={colorPalette}
                                    logoInfo={logoInfo}
                                    t={t}
                                />
                            )}
                        </Card>
                    </>
                )}
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
        fallback: false,
    };
};

export const getStaticProps: GetStaticProps<ComparePageProps> = async () => {
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

export default ComparePage; 