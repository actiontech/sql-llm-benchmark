import React, { useMemo } from "react";
import { ProTable } from "@ant-design/pro-table";
import { Button, Tooltip, Space, Card, Typography } from "antd";
import { ActionType } from "@ant-design/pro-table";
import { EyeOutlined, DownloadOutlined, TrophyFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Link from "next/link";

import { IndicatorModel } from "../../types/ranking";
import { LogoImage } from "../LogoImage";
import { StyledProgressBar } from "../StyledProgressBar";
import { getModelTypeConfig } from "../../utils/modelTypeUtils";
import { exportIndicatorRankingToCSV } from "../../utils/indicatorRanking";
import cardStyles from "../../styles/Card.module.css";

const { Title } = Typography;

interface IndicatorRankingTableProps {
    data: IndicatorModel[];
    dimension: string;
    indicator: string;
    currentMonth: string;
    logoInfo: Record<string, string>;
    loading?: boolean;
    onExport?: () => void;
    highlightModelId?: string;
}

export const IndicatorRankingTable: React.FC<IndicatorRankingTableProps> = ({
    data,
    dimension,
    indicator,
    currentMonth,
    logoInfo,
    loading = false,
    onExport,
    highlightModelId,
}) => {
    const { t } = useTranslation("common");

    // 表格列配置
    const columns = useMemo(() => [
        {
            title: t("table.rank"),
            dataIndex: "rank",
            key: "rank",
            width: 100,
            align: "center" as const,
            render: (_: any, record: IndicatorModel) => {
                const rank = record.rank;
                let icon = null;
                let color = "";
                if (rank === 1) {
                    icon = <TrophyFilled style={{ fontSize: "24px", color: "#FFD700" }} />;
                    color = "#FFD700";
                } else if (rank === 2) {
                    icon = <TrophyFilled style={{ fontSize: "20px", color: "#C0C0C0" }} />;
                    color = "#C0C0C0";
                } else if (rank === 3) {
                    icon = <TrophyFilled style={{ fontSize: "16px", color: "#CD7F32" }} />;
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
        },
        {
            title: t("table.model"),
            dataIndex: "modelName",
            key: "modelName",
            width: 200,
            render: (_: any, record: IndicatorModel) => (
                <Space>
                    <LogoImage
                        organization={record.organization}
                        logoInfo={logoInfo}
                        width={32}
                        height={32}
                        style={{ marginBottom: 0 }}
                    />
                    <span>{record.modelName}</span>
                </Space>
            ),
        },
        {
            title: t("table.type"),
            dataIndex: "modelType",
            key: "modelType",
            width: 120,
            align: "center" as const,
            render: (_: any, record: IndicatorModel) => {
                const typeConfig = getModelTypeConfig(record.modelType, t);
                return (
                    <span
                        style={{
                            backgroundColor: typeConfig.backgroundColor || "",
                            color: typeConfig.textColor || "#333",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontWeight: "bold",
                            display: "inline-block",
                            minWidth: "60px",
                            textAlign: "center",
                        }}
                    >
                        {typeConfig.text}
                    </span>
                );
            },
        },
        {
            title: t("table.organization"),
            dataIndex: "organization",
            key: "organization",
            width: 150,
            align: "center" as const,
        },
        {
            title: t("table.model_score"),
            dataIndex: "score",
            key: "score",
            width: 120,
            align: "center" as const,
            sorter: (a: IndicatorModel, b: IndicatorModel) => b.score - a.score,
            render: (_: any, record: IndicatorModel) => (
                <StyledProgressBar score={record.score} isHighestScore={false} />
            ),
        },
        {
            title: t("table.details"),
            key: "details",
            width: 100,
            align: "center" as const,
            render: (_: any, record: IndicatorModel) => (
                <Link
                    scroll={true}
                    href={`/models/${record.modelId}/${currentMonth}`}
                >
                    <Tooltip title={t("table.view_details")}>
                        <Button
                            type="link"
                            icon={<EyeOutlined />}
                            size="small"
                        />
                    </Tooltip>
                </Link>
            ),
        },
    ], [t, logoInfo, dimension, indicator, currentMonth]);

    // 导出CSV功能
    const handleExport = () => {
        const csvContent = exportIndicatorRankingToCSV(data, dimension, indicator, t);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${t(`table.${dimension}`)}_${t(`indicator.${indicator}`)}_${currentMonth}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (onExport) {
            onExport();
        }
    };

    return (
        <Card className={cardStyles.standardCard}>
            {/* 表格标题和操作 */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
            }}>
                <Title level={3} style={{ margin: 0 }}>
                    {t("indicator_ranking.table_title")}
                </Title>
                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleExport}
                    disabled={!data.length}
                >
                    {t("indicator_ranking.export_csv")}
                </Button>
            </div>

            {/* 排名表格 */}
            <ProTable<IndicatorModel>
                columns={columns}
                dataSource={data}
                rowKey="modelId"
                search={false}
                pagination={false}
                scroll={{ x: 1000 }}
                size="small"
                loading={loading}
                options={{
                    reload: false,
                    density: false,
                    fullScreen: false,
                    setting: false,
                }}
                rowClassName={(record) =>
                    highlightModelId && record.modelId === highlightModelId
                        ? 'highlighted-row'
                        : ''
                }
            />
        </Card>
    );
};
