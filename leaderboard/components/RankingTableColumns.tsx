import React from "react";
import { Space, Button, Tooltip, Tag } from "antd";
import Link from "next/link";
import { ProColumns } from "@ant-design/pro-table";
import {
    TrophyFilled,
    EyeOutlined,
    PushpinFilled,
} from "@ant-design/icons";
import { LogoImage } from "./LogoImage";
import { StyledProgressBar } from "./StyledProgressBar";
import { Model } from "../types/ranking";
import { getModelTypeConfig } from "../utils/modelTypeUtils";

interface ColumnProps {
    logoInfo: Record<string, string>;
    sortedInfo: any;
    maxScoresByCategory: Record<string, number>;
    currentMonth: string;
    t: (key: string) => string; // 添加翻译函数参数
}

export const createRankingTableColumns = ({
    logoInfo,
    sortedInfo,
    maxScoresByCategory,
    currentMonth,
    t,
}: ColumnProps): ProColumns<Model>[] => {

    return [
        {
            title: t("table.rank"),
            dataIndex: "rank",
            key: "rank",
            render: (_, record: Model, idx) => {
                // 使用record中的rank字段，如果没有则使用索引+1
                const rank = (record as any).rank || (idx + 1);
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
            width: 150,
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
            render: (text, record) => (
                <Space>
                    <span>{text}</span>
                    {record.new_model && (
                        <Tag
                            color="#ff4d4f"
                            style={{
                                fontSize: '9px',
                                fontWeight: 'bold',
                                lineHeight: '14px',
                                padding: '2px 7px',
                                margin: '0 0 0 4px',
                                borderRadius: '10px',
                                border: '1px solid #ff1f1f',
                                background: 'linear-gradient(145deg, #ff6b6b 0%, #ff4d4f 50%, #e63946 100%)',
                                color: '#fff',
                                boxShadow: `
                                    0 2px 8px rgba(255, 77, 79, 0.2),
                                    0 1px 3px rgba(0, 0, 0, 0.2),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                                    inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                                `,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                textShadow: '0 1px 1px rgba(0, 0, 0, 0.1)',
                                position: 'relative',
                                transform: 'translateY(-0.5px)'
                            }}
                        >
                            {t("table.new_model_tag")}
                        </Tag>
                    )}
                </Space>
            ),
            sorter: true,
            sortOrder:
                sortedInfo.columnKey === "real_model_namne" ? sortedInfo.order : false,
            showSorterTooltip: false,
            width: 200,
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
            sortDirections: ['descend', 'ascend'],
            sortOrder:
                sortedInfo.columnKey === "releaseDate" ? sortedInfo.order : false,
            showSorterTooltip: false,
            width: 200,
        },
        {
            title: t("table.type"),
            dataIndex: "type",
            key: "type",
            filters: true,
            onFilter: true,
            align: "center",
            render: (text: any) => {
                const typeConfig = getModelTypeConfig(text, t);
                const translatedText = typeConfig.text;
                const backgroundColor = typeConfig.backgroundColor || "";
                const textColor = typeConfig.textColor || "#333";

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
            width: 200,
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
            sortDirections: ['descend', 'ascend'],
            showSorterTooltip: false,
            align: "center",
            sortOrder:
                sortedInfo.columnKey === "sql_optimization" ? sortedInfo.order : false,
            render: (text, record, index) => {
                const score = typeof text === "number" ? text : undefined;
                if (score === undefined) return "--";
                const isHighest =
                    score === maxScoresByCategory.sql_optimization && score !== 0;
                const delay = (index || 0) * 100; // 每行延迟100ms
                return <StyledProgressBar score={score} isHighestScore={isHighest} delay={delay} />;
            },
            width: 300,
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
            sortDirections: ['descend', 'ascend'],
            showSorterTooltip: false,
            align: "center",
            sortOrder:
                sortedInfo.columnKey === "dialect_conversion"
                    ? sortedInfo.order
                    : false,
            render: (text, record, index) => {
                const score = typeof text === "number" ? text : undefined;
                if (score === undefined) return "--";
                const isHighest =
                    score === maxScoresByCategory.dialect_conversion && score !== 0;
                const delay = (index || 0) * 100; // 每行延迟100ms
                return <StyledProgressBar score={score} isHighestScore={isHighest} delay={delay} />;
            },
            width: 300,
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
            sortDirections: ['descend', 'ascend'],
            showSorterTooltip: false,
            align: "center",
            sortOrder:
                sortedInfo.columnKey === "sql_understanding"
                    ? sortedInfo.order
                    : false,
            render: (text, record, index) => {
                const score = typeof text === "number" ? text : undefined;
                if (score === undefined) return "--";
                const isHighest =
                    score === maxScoresByCategory.sql_understanding && score !== 0;
                const delay = (index || 0) * 100; // 每行延迟100ms
                return <StyledProgressBar score={score} isHighestScore={isHighest} delay={delay} />;
            },
            width: 300,
        },
        {
            title: t("table.details"),
            key: "details",
            render: (_, record) => (
                <Link
                    scroll={true}
                    href={`/models/${record.id}/${currentMonth}`}
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
            width: 100,
            align: "center",
        },
    ];
}; 