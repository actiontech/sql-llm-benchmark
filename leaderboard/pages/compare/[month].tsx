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
    BarChartOutlined,
    RadarChartOutlined,
    HeatMapOutlined,
    CloseOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import styles from "../../styles/Container.module.css";
import cardStyles from "../../styles/Card.module.css";
import { ComparisonData, ChartType } from "../../types/comparison";
import { getModelsComparisonData, generateChartConfig, getModelColorPalette } from "../../utils/comparisonData";
import { ComparisonRadar } from "../../components/ModelCompare/ComparisonRadar";
import { ComparisonBar } from "../../components/ModelCompare/ComparisonBar";
import { ComparisonHeatmap } from "../../components/ModelCompare/ComparisonHeatmap";
import { ComparisonTable } from "../../components/ModelCompare/ComparisonTable";

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
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [selectedCapability, setSelectedCapability] = useState<string>('all');
    const [availableModels, setAvailableModels] = useState<any[]>([]);

    // 获取当前月份的所有可用模型
    useEffect(() => {
        const fetchAvailableModels = async () => {
            try {
                const response = await fetch(`/data/eval_reports/models-${currentMonth}.json`);
                if (response.ok) {
                    const data = await response.json();
                    setAvailableModels(data.models || []);
                }
            } catch (error) {
                console.error('获取可用模型列表失败:', error);
            }
        };

        if (currentMonth) {
            fetchAvailableModels();
        }
    }, [currentMonth]);

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

    const handleAddModel = (modelId: string) => {
        if (modelIds.includes(modelId)) return; // 避免重复添加
        if (modelIds.length >= 5) {
            message.warning(t("compare.max_models_reached"));
            return;
        }

        const newModelIds = [...modelIds, modelId];
        const modelsString = newModelIds.join(',');
        router.push(`/compare/${currentMonth}?models=${modelsString}`);
    };

    // 计算可添加的模型列表（排除已选择的模型）
    const addableModels = useMemo(() => {
        return availableModels.filter(model => !modelIds.includes(model.id));
    }, [availableModels, modelIds]);

    if (!modelIds.length || modelIds.length < 2) {
        return (
            <div className={`${styles.container} ${cardStyles.pageContainer}`}>
                <Card
                    bordered={false}
                    className={`${cardStyles.standardCard} ${cardStyles.errorCenter}`}
                >
                    <Title level={3}>{t("compare.minimum_models_required")}</Title>
                </Card>
            </div>
        );
    }

    const pageTitle = t("seo.compare_page.title", { month: currentMonth });
    const pageDescription = t("seo.compare_page.description", { count: modelIds.length });

    return (
        <>
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
            </Head>
            <div className={`${styles.container} ${cardStyles.pageContainer}`}>

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
                    <Row justify="space-between" align="middle" wrap>
                        <Col>
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
                                        }}
                                    >
                                        {model.real_model_namne}
                                    </Tag>
                                ))}
                                {/* 添加模型选择器 */}
                                {addableModels.length > 0 && modelIds.length < 5 && (
                                    <Select
                                        placeholder={
                                            <Space size={4}>
                                                <PlusOutlined style={{ fontSize: '12px' }} />
                                                <span>{t("compare.add_model")}</span>
                                            </Space>
                                        }
                                        style={{ minWidth: 120 }}
                                        size="small"
                                        onChange={handleAddModel}
                                        value={undefined}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                                        }
                                    >
                                        {addableModels.map((model) => (
                                            <Option key={model.id} value={model.id}>
                                                {model.real_model_namne}
                                            </Option>
                                        ))}
                                    </Select>
                                )}
                            </Space>
                        </Col>
                        <Col>
                            <Space size="middle">
                                <span style={{ fontWeight: 'bold', color: '#666' }}></span>
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
                        {/* 雷达图模块 - 单独展示 */}
                        <Card
                            bordered={false}
                            title={t("compare.chart_titles.model_capability_radar")}
                            className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottom}`}
                        >
                            {chartConfig && (
                                <ComparisonRadar
                                    data={chartConfig.radarData}
                                    models={comparisonData?.models || []}
                                    colorPalette={colorPalette}
                                    title={t("compare.chart_titles.model_capability_radar")}
                                    t={t}
                                />
                            )}
                        </Card>

                        {/* 可切换图表模块 */}
                        <Card
                            bordered={false}
                            className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottom}`}
                        >
                            {/* 图表控制区 */}
                            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                                <Col>
                                    <Space>
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
                                </Col>
                            </Row>

                            {/* 图表展示区 */}
                            <div style={{ marginBottom: 32 }}>
                                {chartType === 'bar' && chartConfig && (
                                    <ComparisonBar
                                        data={chartConfig.barData}
                                        models={comparisonData?.models || []}
                                        colorPalette={colorPalette}
                                        selectedCapability={selectedCapability}
                                        getTitle={(capability) =>
                                            capability === 'all'
                                                ? t("compare.chart_titles.indicator_comparison")
                                                : `${t(`table.${capability}`)}${t("compare.indicator_comparison_suffix")}`
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
                                                : `${t(`table.${capability}`)}${t("compare.chart_titles.heatmap_suffix")}`
                                        }
                                        t={t}
                                    />
                                )}
                            </div>

                            {/* 详细数据表格 */}
                            <div>
                                <Title level={4} style={{ marginBottom: 16 }}>
                                    {t("compare.chart_titles.detailed_comparison")}
                                </Title>
                                {comparisonData && (
                                    <ComparisonTable
                                        models={comparisonData.models}
                                        colorPalette={colorPalette}
                                        logoInfo={logoInfo}
                                        t={t}
                                    />
                                )}
                            </div>
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