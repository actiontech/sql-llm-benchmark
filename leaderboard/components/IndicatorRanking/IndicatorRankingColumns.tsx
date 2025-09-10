import React from "react";
import { ProColumns } from "@ant-design/pro-table";
import { Button, Tooltip, Space } from "antd";
import { TrophyFilled, EyeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Link from "next/link";

import { IndicatorModel } from "../../types/ranking";
import { LogoImage } from "../LogoImage";
import { StyledProgressBar } from "../StyledProgressBar";
import { getModelTypeConfig } from "../../utils/modelTypeUtils";

interface IndicatorRankingColumnsProps {
    dimension: string;
    indicator: string;
    currentMonth: string;
    logoInfo: Record<string, string>;
    t: (key: string) => string;
}

export const createIndicatorRankingColumns = ({
    dimension,
    indicator,
    currentMonth,
    logoInfo,
    t,
}: IndicatorRankingColumnsProps): ProColumns<IndicatorModel>[] => {
    return [
        {
            title: t("table.rank"),
            dataIndex: "rank",
            key: "rank",
            width: 100,
            align: "center",
            render: (_, record: IndicatorModel) => {
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
            render: (_, record: IndicatorModel) => (
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
            align: "center",
            render: (_, record: IndicatorModel) => {
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
            align: "center",
        },
        {
            title: t("table.dimension"),
            dataIndex: "dimension",
            key: "dimension",
            width: 120,
            align: "center",
            render: () => t(`table.${dimension}`),
        },
        {
            title: t("table.indicator"),
            dataIndex: "indicator",
            key: "indicator",
            width: 150,
            align: "center",
            render: () => t(`indicator.${indicator}`),
        },
        {
            title: t("table.score"),
            dataIndex: "score",
            key: "score",
            width: 120,
            align: "center",
            sorter: (a: IndicatorModel, b: IndicatorModel) => b.score - a.score,
            render: (_, record: IndicatorModel, index) => {
                const delay = (index || 0) * 100; // 每行延迟100ms
                return <StyledProgressBar score={record.score} isHighestScore={false} delay={delay} />;
            },
        },
        {
            title: t("table.details"),
            key: "details",
            width: 100,
            align: "center",
            render: (_, record: IndicatorModel) => (
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
    ];
};
